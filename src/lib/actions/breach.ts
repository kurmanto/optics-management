"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifyRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { BreachReportStatus } from "@prisma/client";
import { z } from "zod";

const BreachReportSchema = z.object({
  discoveredAt: z.string().min(1, "Discovery date is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  affectedCount: z.coerce.number().int().min(1, "Affected count must be at least 1"),
  dataTypes: z.array(z.string()).min(1, "At least one data type must be selected"),
  containmentActions: z.string().min(10, "Containment actions must be at least 10 characters"),
});

export type BreachReportState = {
  error?: string;
  id?: string;
};

export async function createBreachReport(
  prevState: BreachReportState,
  formData: FormData
): Promise<BreachReportState> {
  const session = await verifyRole("ADMIN");

  const raw = {
    discoveredAt: formData.get("discoveredAt") as string,
    description: formData.get("description") as string,
    affectedCount: formData.get("affectedCount") as string,
    dataTypes: formData.getAll("dataTypes") as string[],
    containmentActions: formData.get("containmentActions") as string,
  };

  const parsed = BreachReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const data = parsed.data;

  try {
    const report = await prisma.breachReport.create({
      data: {
        id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        discoveredAt: new Date(data.discoveredAt),
        reportedBy: session.id,
        description: data.description,
        affectedCount: data.affectedCount,
        dataTypes: data.dataTypes,
        containmentActions: data.containmentActions,
        status: BreachReportStatus.OPEN,
        updatedAt: new Date(),
      },
    });

    void logAudit({ userId: session.id, action: "CREATE", model: "BreachReport", recordId: report.id });
    revalidatePath("/admin/breach");
    return { id: report.id };
  } catch (e) {
    console.error(e);
    return { error: "Failed to create breach report" };
  }
}

export async function updateBreachStatus(
  id: string,
  status: BreachReportStatus,
  notifiedAt?: Date
): Promise<{ success: true } | { error: string }> {
  const session = await verifyRole("ADMIN");

  try {
    await prisma.breachReport.update({
      where: { id },
      data: {
        status,
        ...(status === "IPC_NOTIFIED" && notifiedAt ? { ipcNotifiedAt: notifiedAt } : {}),
        ...(status === "INDIVIDUALS_NOTIFIED" && notifiedAt ? { individualsNotifiedAt: notifiedAt } : {}),
        updatedAt: new Date(),
      },
    });

    void logAudit({ userId: session.id, action: "STATUS_CHANGE", model: "BreachReport", recordId: id, changes: { after: { status } } });
    revalidatePath("/admin/breach");
    revalidatePath(`/admin/breach/${id}`);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to update breach status" };
  }
}

export async function generateIPCNotificationText(id: string): Promise<string> {
  await verifyRole("ADMIN");

  const report = await prisma.breachReport.findUnique({ where: { id } });
  if (!report) return "Report not found.";

  const discoveredDate = report.discoveredAt.toLocaleDateString("en-CA");
  const reportedDate = report.createdAt.toLocaleDateString("en-CA");

  return `
PRIVACY BREACH NOTIFICATION
To: Information and Privacy Commissioner of Ontario (IPC)
Date: ${reportedDate}

ORGANIZATION INFORMATION
Name: Mint Vision Optique
Address: [Store Address]
Contact: [Privacy Officer Name, Title]
Email: [Contact Email]
Phone: [Contact Phone]

BREACH DESCRIPTION
Date Breach Discovered: ${discoveredDate}
Nature of Breach: ${report.description}

AFFECTED INDIVIDUALS
Estimated Number Affected: ${report.affectedCount}
Type of Personal Health Information Involved: ${report.dataTypes.join(", ")}

CONTAINMENT AND REMEDIATION ACTIONS
${report.containmentActions}

STATUS: ${report.status}
${report.ipcNotifiedAt ? `IPC Notified: ${report.ipcNotifiedAt.toLocaleDateString("en-CA")}` : ""}
${report.individualsNotifiedAt ? `Individuals Notified: ${report.individualsNotifiedAt.toLocaleDateString("en-CA")}` : ""}

This notification is submitted pursuant to Section 12 of the Personal Health Information Protection Act (PHIPA).

Signature: ______________________
Date: ______________________
`.trim();
}
