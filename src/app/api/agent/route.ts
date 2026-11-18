import { ZodError } from "zod";
import { NotFoundError, parseAgentInput, runAgent } from "@/lib/agent";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  try {
    return Response.json(await runAgent(parseAgentInput(body)), { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      const i = err.issues[0];
      const path = i.path.join(".");
      return Response.json({ error: path ? `${path}: ${i.message}` : i.message }, { status: 400 });
    }
    if (err instanceof NotFoundError) return Response.json({ error: err.message }, { status: 404 });
    console.error("[api/agent]", err);
    return Response.json({ error: "Agent pipeline failed" }, { status: 500 });
  }
}
