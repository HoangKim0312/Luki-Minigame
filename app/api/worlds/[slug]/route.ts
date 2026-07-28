import { worlds, collectibles, challenges } from "@/lib/archive-data";
import { jsonError } from "@/lib/api-utils";
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const world = worlds.find((item) => item.slug === slug);
  if (!world) return jsonError("Archive World không tồn tại.", 404, "WORLD_NOT_FOUND");
  return Response.json({ world, collectibles: collectibles.filter((item) => item.worldId === world.id), challenges: challenges.filter((item) => item.worldId === world.id).map((challenge) => ({ id: challenge.id, mode: challenge.mode, label: challenge.label, prompt: challenge.prompt, options: challenge.options, hintsAvailable: challenge.hints.length })) });
}
