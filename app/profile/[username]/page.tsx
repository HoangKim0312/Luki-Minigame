import { ArchiveApp } from "../../components/archive-app";

export function generateStaticParams() {
  return [{ username: "restorer" }];
}

export default function ProfilePage() { return <ArchiveApp view="profile" />; }
