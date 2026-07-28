import { ArchiveApp } from "../../components/archive-app";
import { worlds } from "../../../lib/archive-data";

export async function generateStaticParams() {
  const backend = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (backend) {
    try {
      const response = await fetch(`${backend}/api/worlds`);
      if (response.ok) {
        const payload = await response.json() as { worlds?: Array<{ slug: string }> };
        if (payload.worlds?.length) return payload.worlds.map((world) => ({ slug: world.slug }));
      }
    } catch {
      // Static fallback keeps local development and temporary API outages buildable.
    }
  }
  return worlds.map((world) => ({ slug: world.slug }));
}

export default async function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArchiveApp view="world" slug={slug} />;
}
