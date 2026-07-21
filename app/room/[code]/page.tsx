import { PartyApp } from "../../party-app";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PartyApp view="room" roomCode={code.toUpperCase()} />;
}
