import { connection } from "next/server";
import { requireOrg } from "@/lib/auth/org";

export const instant = false;

export default async function OrgHome({ params }: { params: Promise<{ org: string }> }) {
  await connection();
  const { org: slug } = await params;
  const { org } = await requireOrg(slug);
  return <h1 className="text-2xl font-semibold">Bem-vinda, {org.name}</h1>;
}