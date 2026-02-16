import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { FormsHub } from "@/components/forms/FormsHub";

export const metadata = { title: "Forms" };

export default async function FormsPage() {
  await verifySession();

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const [
    templates,
    recentSubmissions,
    completedSubmissions,
    outstandingSubmissions,
    customers,
    intakePackages,
  ] = await Promise.all([
    prisma.formTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.formSubmission.findMany({
      where: { packageId: null, status: { not: "COMPLETED" } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { template: true },
    }),
    prisma.formSubmission.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 100,
      include: { template: true, customer: { select: { id: true } } },
    }),
    prisma.formSubmission.findMany({
      where: { status: "PENDING", packageId: null },
      orderBy: { createdAt: "asc" },
      include: { template: true },
    }),
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      orderBy: { lastName: "asc" },
      take: 500,
    }),
    prisma.formPackage.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        submissions: {
          include: { template: true },
          orderBy: { packageOrder: "asc" },
        },
      },
    }),
  ]);

  return (
    <div className="p-6 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Forms</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send digital forms to patients. Share a link — no app required.
        </p>
      </div>

      <FormsHub
        templates={templates}
        recentSubmissions={recentSubmissions}
        completedSubmissions={completedSubmissions}
        outstandingSubmissions={outstandingSubmissions}
        customers={customers}
        intakePackages={intakePackages}
        baseUrl={baseUrl}
      />
    </div>
  );
}
