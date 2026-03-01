import { prisma } from "@/lib/tom/db";

export type AuditInput = {
  userId?: string;
  actionType: string;
  toolsCalled: string[];
  recordsAccessed?: string[];
  outcome?: string;
  correlationId?: string;
};

export const logAudit = async (input: AuditInput) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        actionType: input.actionType,
        toolsCalled: input.toolsCalled,
        recordsAccessed: input.recordsAccessed ?? [],
        outcome: input.outcome ?? "ok",
        correlationId: input.correlationId ?? null,
      },
    });
  } catch {
    // ignore in demo
  }
};
