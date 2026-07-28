import { ArchiveApp } from "../../components/archive-app";
import { challenges } from "../../../lib/archive-data";

export function generateStaticParams() {
  return challenges.map((challenge) => ({ challengeId: challenge.id }));
}

export default async function ChallengePage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  return <ArchiveApp view="challenge" challengeId={challengeId} />;
}
