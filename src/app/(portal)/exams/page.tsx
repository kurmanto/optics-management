import { verifySession } from "@/lib/dal";
import { ExamsClient } from "./ExamsClient";

export default async function ExamsPage() {
  await verifySession();

  // Get the current Monday (start of week)
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return <ExamsClient initialWeekStart={monday.toISOString().split("T")[0]} />;
}
