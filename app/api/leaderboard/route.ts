import { env } from "cloudflare:workers";
import { leaderboard as fallback } from "@/lib/archive-data";
export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period") ?? "daily";
  try {
    const result = await env.DB.prepare("SELECT p.username as name, p.archive_score as score, p.streak FROM user_profiles p JOIN users u ON u.id = p.user_id ORDER BY p.archive_score DESC LIMIT 50").all();
    return Response.json({ period, entries: result.results.length ? result.results : fallback, authoritative: true });
  } catch {
    return Response.json({ period, entries: fallback, authoritative: false });
  }
}

