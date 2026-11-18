import { ZodError } from "zod";
import { admitPatient, listPatients, parseAdmitInput } from "@/lib/patients";

export async function GET() {
  return Response.json(await listPatients());
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const input = parseAdmitInput(body);
    return Response.json(await admitPatient(input), { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) {
      const i = e.issues[0];
      return Response.json({ error: `${i.path.join(".") || "body"}: ${i.message}` }, { status: 400 });
    }
    console.error(e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
