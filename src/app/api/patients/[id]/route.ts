import { getPatient } from "@/lib/patients";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const patient = await getPatient(id);
  return patient ? Response.json(patient) : Response.json({ error: "Patient not found" }, { status: 404 });
}
