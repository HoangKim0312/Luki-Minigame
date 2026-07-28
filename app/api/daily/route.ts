import { challenges } from "@/lib/archive-data";
export async function GET() {
  const date = new Date().toISOString().slice(0, 10);
  return Response.json({ id: `daily-${date}`, date, timezone: "UTC", rewardClaimed: false, challenges: challenges.slice(0, 5).map((challenge) => ({ id: challenge.id, mode: challenge.mode, label: challenge.label, worldId: challenge.worldId, prompt: challenge.prompt, hintsAvailable: challenge.hints.length, options: challenge.options, media: challenge.media ? { type: challenge.media.type, duration: challenge.media.duration, visualMode: challenge.media.visualMode } : null })) });
}
