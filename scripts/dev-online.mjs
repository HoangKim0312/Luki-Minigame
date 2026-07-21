import { spawn } from "node:child_process";

const backendUrl = "http://127.0.0.1:8787";
const siteUrl = "https://hoangkim0312.github.io/Luki-Minigame/";
const checkOnly = process.argv.includes("--check");
const children = new Set();
let stopping = false;

function start(command, args, options = {}) {
  const child = spawn(command, args, { cwd: process.cwd(), stdio: ["inherit", "pipe", "pipe"], ...options });
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  windowClear();
  process.exitCode = exitCode;
}

function windowClear() {
  if (process.platform !== "win32") return;
  // Direct child processes are used, so child.kill() is sufficient on Windows.
}

async function waitForHealth(timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${backendUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Backend did not become healthy in time.");
}

async function waitForTunnelHealth(tunnelUrl, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "unknown error";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${tunnelUrl}/health`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Tunnel health check failed: ${lastError}`);
}

async function startBackend() {
  try {
    const response = await fetch(`${backendUrl}/health`);
    if (response.ok) {
      console.log("✓ Backend is already running on port 8787.");
      return null;
    }
  } catch {}
  const backend = start(process.execPath, ["--env-file-if-exists=.env.local", "node_modules/tsx/dist/cli.mjs", "server/index.ts"]);
  backend.stdout.on("data", chunk => process.stdout.write(`[backend] ${chunk}`));
  backend.stderr.on("data", chunk => process.stderr.write(`[backend] ${chunk}`));
  await waitForHealth();
  console.log("✓ Backend is ready.");
  return backend;
}

function startTunnel() {
  return new Promise((resolve, reject) => {
    const tunnel = start(process.env.CLOUDFLARED_PATH || "cloudflared", ["tunnel", "--url", backendUrl, "--protocol", "http2", "--no-autoupdate"]);
    let combined = "";
    let tunnelUrl = "";
    let registered = false;
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) reject(new Error("Cloudflare did not register the tunnel in time."));
    }, 45_000);
    const inspect = chunk => {
      const text = chunk.toString();
      combined = `${combined}${text}`.slice(-20_000);
      const match = combined.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match) tunnelUrl = match[0];
      if (/Registered tunnel connection/i.test(combined)) registered = true;
      if (!settled && tunnelUrl && registered) {
        settled = true;
        clearTimeout(timeout);
        resolve({ tunnel, url: tunnelUrl });
      }
    };
    tunnel.stdout.on("data", inspect);
    tunnel.stderr.on("data", inspect);
    tunnel.once("error", error => { clearTimeout(timeout); reject(new Error(`Cannot start cloudflared: ${error.message}`)); });
    tunnel.once("exit", code => { clearTimeout(timeout); if (!settled) reject(new Error(`cloudflared exited before creating a tunnel (${code}).`)); });
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

try {
  await startBackend();
  console.log("… Creating a free HTTPS/WSS tunnel.");
  const { url: tunnelUrl } = await startTunnel();
  const shareUrl = `${siteUrl}?server=${encodeURIComponent(tunnelUrl)}`;
  try {
    await waitForTunnelHealth(tunnelUrl, 8_000);
  } catch (error) {
    console.warn(`! Tunnel is registered, but the public health check is still propagating (${error instanceof Error ? error.message : error}).`);
    console.warn("  The share link is valid; wait a few seconds and reload it if the first connection is slow.");
  }
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("LUKI IS ONLINE");
  console.log(`Backend: ${tunnelUrl}`);
  console.log(`Share this link: ${shareUrl}`);
  console.log("Keep this window open. Press Ctrl+C to stop Luki.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  if (checkOnly) stop(0);
  else await new Promise(() => {});
} catch (error) {
  console.error(`\nCould not start Luki online: ${error instanceof Error ? error.message : error}`);
  stop(1);
}
