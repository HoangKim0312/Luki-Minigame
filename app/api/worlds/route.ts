import { worlds } from "@/lib/archive-data";
export async function GET() { return Response.json({ worlds }); }

