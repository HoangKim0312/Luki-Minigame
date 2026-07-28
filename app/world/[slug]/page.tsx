import { ArchiveApp } from "../../components/archive-app";
export default async function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArchiveApp view="world" slug={slug} />;
}
