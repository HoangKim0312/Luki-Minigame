import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryBasePath = "/Luki-Minigame";

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? repositoryBasePath : "",
  assetPrefix: isGitHubPages ? repositoryBasePath : "",
  trailingSlash: isGitHubPages,
  images: { unoptimized: isGitHubPages },
};

export default nextConfig;
