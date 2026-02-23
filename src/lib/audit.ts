import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGE"
  | "ACCOUNT_LOCKED"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "FORM_SUBMITTED"
  | "INTAKE_APPLIED"
  | "PO_RECEIVED"
  | "PO_CANCELLED";

export async function logAudit(params: {
  userId?: string;
  action: AuditAction;
  model: string;
  recordId: string;
  changes?: Record<string, unknown>;
}): Promise<void> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : undefined;

    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        model: params.model,
        recordId: params.recordId,
        changes: params.changes as Prisma.InputJsonValue | undefined,
        ipAddress: ipAddress ?? null,
      },
    });
  } catch {
    // Audit failures must never break the main operation
  }
}
