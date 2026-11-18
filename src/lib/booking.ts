// Pure auto-booking planner.
import type { AppointmentStatus, Department, UrgencyLevel } from "./types";

export const DOCTOR_ROSTER: Record<Department, string> = {
  "Critical Care": "Dr. Elena Vasquez",
  "Emergency Medicine": "Dr. Samuel Okafor",
  Cardiology: "Dr. Marcus Chen",
  Pulmonology: "Dr. Thomas Byrne",
  Neurology: "Dr. Priya Raman",
  "Infectious Disease": "Dr. Lucas Ferreira",
  Endocrinology: "Dr. Hannah Weiss",
  Ophthalmology: "Dr. Aisha Rahman",
  Gastroenterology: "Dr. Daniel Kwon",
  Orthopedics: "Dr. Sofia Marchetti",
  "Primary Care": "Dr. Grace Mensah",
};

const MIN = 60_000;
const OFFSETS: Record<UrgencyLevel, { ms: number; status: AppointmentStatus }> = {
  CRITICAL: { ms: 30 * MIN, status: "Confirmed" },
  HIGH: { ms: 120 * MIN, status: "Confirmed" },
  MODERATE: { ms: 1440 * MIN, status: "Scheduled" },
  LOW: { ms: 10080 * MIN, status: "Scheduled" },
};

// shortcut: no slot-capacity or clinician-calendar check; upgrade to a real scheduling system integration
export function planAppointment(level: UrgencyLevel, department: Department, now: Date = new Date()) {
  const { ms, status } = OFFSETS[level];
  const quarter = 15 * MIN;
  const scheduledAt = new Date(Math.ceil((now.getTime() + ms) / quarter) * quarter);
  return { doctorName: DOCTOR_ROSTER[department], department, scheduledAt, status, autoBooked: true as const };
}
