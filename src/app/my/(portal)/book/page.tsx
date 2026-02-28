import { verifyClientSession } from "@/lib/client-dal";
import { prisma } from "@/lib/prisma";
import { BookingWizard } from "@/components/client/booking/BookingWizard";
import { UpcomingAppointmentsList } from "@/components/client/booking/UpcomingAppointmentsList";

export default async function BookPage() {
  const session = await verifyClientSession();

  const members = await prisma.customer.findMany({
    where: { familyId: session.familyId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  const memberIds = members.map((m) => m.id);

  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      customerId: { in: memberIds },
      scheduledAt: { gte: new Date() },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
    },
    select: {
      id: true,
      type: true,
      scheduledAt: true,
      status: true,
      customer: { select: { firstName: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <UpcomingAppointmentsList appointments={upcomingAppointments} />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Book an Appointment</h2>
        <BookingWizard members={members} />
      </div>
    </div>
  );
}
