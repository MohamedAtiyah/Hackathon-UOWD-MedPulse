import Link from "next/link";
import { Card } from "@/components/ui";

export default function PatientNotFound() {
  return (
    <Card title="Patient not found">
      <p className="text-sm text-zinc-600">No patient matches this ID.</p>
      <Link href="/" className="mt-3 inline-block text-sm font-medium text-teal-700 hover:underline">
        ← Back to Command Centre
      </Link>
    </Card>
  );
}
