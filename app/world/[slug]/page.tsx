import { ArchiveApp } from "../../components/archive-app";
import { worlds } from "../../../lib/archive-data";

export function generateStaticParams() {
  return worlds.map((world) => ({ slug: world.slug }));
}

export default async function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArchiveApp view="world" slug={slug} />;
}
