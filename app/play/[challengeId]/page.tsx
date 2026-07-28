import { ArchiveApp } from "../../components/archive-app";
export default async function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  return <ArchiveApp view="challenge" challengeId={challengeId} />;
}
