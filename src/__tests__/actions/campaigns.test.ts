import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockSession, mockAdminSession } from "../mocks/session";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

async function mockSessionAs(role: "STAFF" | "ADMIN") {
  const { verifySession } = await import("@/lib/dal");
  vi.mocked(verifySession).mockResolvedValue(
    (role === "ADMIN" ? mockAdminSession : mockSession) as any
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await mockSessionAs("STAFF");
});

// ── createCampaign ────────────────────────────────────────────────────────────

describe("createCampaign", () => {
  it("returns error when name is missing", async () => {
    const { createCampaign } = await import("@/lib/actions/campaigns");
    const result = await createCampaign({ type: "EXAM_REMINDER" });
    expect(result).toHaveProperty("error");
  });

  it("returns error when type is missing", async () => {
    const { createCampaign } = await import("@/lib/actions/campaigns");
    const result = await createCampaign({ name: "Test Campaign" });
    expect(result).toHaveProperty("error");
  });

  it("calls prisma.campaign.create with correct data", async () => {
    const prisma = await getPrisma();
    prisma.campaign.create.mockResolvedValue({ id: "campaign-1" });

    const { createCampaign } = await import("@/lib/actions/campaigns");
    const result = await createCampaign({
      name: "Exam Reminder 2026",
      type: "EXAM_REMINDER",
      description: "Annual recall",
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Exam Reminder 2026",
          type: "EXAM_REMINDER",
          description: "Annual recall",
          status: "DRAFT",
        }),
      })
    );
    expect(result).toHaveProperty("id", "campaign-1");
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.campaign.create.mockRejectedValue(new Error("DB error"));

    const { createCampaign } = await import("@/lib/actions/campaigns");
    const result = await createCampaign({ name: "Test", type: "EXAM_REMINDER" });
    expect(result).toHaveProperty("error");
  });
});

// ── updateCampaign ────────────────────────────────────────────────────────────

describe("updateCampaign", () => {
  it("calls prisma.campaign.update with correct id", async () => {
    const prisma = await getPrisma();
    prisma.campaign.update.mockResolvedValue({ id: "campaign-1" });

    const { updateCampaign } = await import("@/lib/actions/campaigns");
    const result = await updateCampaign("campaign-1", { name: "Updated Name" });

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "campaign-1" } })
    );
    expect(result).toHaveProperty("success", true);
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.campaign.update.mockRejectedValue(new Error("DB error"));

    const { updateCampaign } = await import("@/lib/actions/campaigns");
    const result = await updateCampaign("campaign-1", { name: "Updated" });
    expect(result).toHaveProperty("error");
  });
});

// ── deleteCampaign ────────────────────────────────────────────────────────────

describe("deleteCampaign", () => {
  it("calls prisma.campaign.delete", async () => {
    const prisma = await getPrisma();
    prisma.campaign.delete.mockResolvedValue({ id: "campaign-1" });

    const { deleteCampaign } = await import("@/lib/actions/campaigns");
    const result = await deleteCampaign("campaign-1");

    expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: "campaign-1" } });
    expect(result).toHaveProperty("success", true);
  });

  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.campaign.delete.mockRejectedValue(new Error("DB error"));

    const { deleteCampaign } = await import("@/lib/actions/campaigns");
    const result = await deleteCampaign("campaign-1");
    expect(result).toHaveProperty("error");
  });
});

// ── status transitions ────────────────────────────────────────────────────────

describe("activateCampaign", () => {
  it("sets status to ACTIVE", async () => {
    const prisma = await getPrisma();
    prisma.campaign.update.mockResolvedValue({ id: "campaign-1" });

    const { activateCampaign } = await import("@/lib/actions/campaigns");
    const result = await activateCampaign("campaign-1");

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(result).toHaveProperty("success", true);
  });
});

describe("pauseCampaign", () => {
  it("sets status to PAUSED", async () => {
    const prisma = await getPrisma();
    prisma.campaign.update.mockResolvedValue({ id: "campaign-1" });

    const { pauseCampaign } = await import("@/lib/actions/campaigns");
    const result = await pauseCampaign("campaign-1");

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAUSED" }),
      })
    );
    expect(result).toHaveProperty("success", true);
  });
});

describe("archiveCampaign", () => {
  it("sets status to ARCHIVED", async () => {
    const prisma = await getPrisma();
    prisma.campaign.update.mockResolvedValue({ id: "campaign-1" });

    const { archiveCampaign } = await import("@/lib/actions/campaigns");
    const result = await archiveCampaign("campaign-1");

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ARCHIVED" }),
      })
    );
    expect(result).toHaveProperty("success", true);
  });
});

// ── enrollCustomer / removeRecipient ─────────────────────────────────────────

describe("enrollCustomer", () => {
  it("calls prisma.campaignRecipient.upsert", async () => {
    const prisma = await getPrisma();
    prisma.campaignRecipient.upsert.mockResolvedValue({ id: "rec-1" });

    const { enrollCustomer } = await import("@/lib/actions/campaigns");
    const result = await enrollCustomer("campaign-1", "customer-1");

    expect(prisma.campaignRecipient.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId_customerId: { campaignId: "campaign-1", customerId: "customer-1" } },
      })
    );
    expect(result).toHaveProperty("success", true);
  });
});

describe("removeRecipient", () => {
  it("deletes recipient and looks up campaign for revalidation", async () => {
    const prisma = await getPrisma();
    prisma.campaignRecipient.findUniqueOrThrow.mockResolvedValue({
      id: "rec-1",
      campaignId: "campaign-1",
    });
    prisma.campaignRecipient.delete.mockResolvedValue({ id: "rec-1" });

    const { removeRecipient } = await import("@/lib/actions/campaigns");
    const result = await removeRecipient("rec-1");

    expect(prisma.campaignRecipient.delete).toHaveBeenCalledWith({ where: { id: "rec-1" } });
    expect(result).toHaveProperty("success", true);
  });
});

// ── triggerCampaignRun (admin only) ──────────────────────────────────────────

describe("triggerCampaignRun", () => {
  it("returns error for non-admin", async () => {
    await mockSessionAs("STAFF");
    const { triggerCampaignRun } = await import("@/lib/actions/campaigns");
    const result = await triggerCampaignRun("campaign-1");
    expect(result).toHaveProperty("error", "Admin only");
  });
});

// ── createMessageTemplate ─────────────────────────────────────────────────────

describe("createMessageTemplate", () => {
  it("creates a template with valid data", async () => {
    const prisma = await getPrisma();
    prisma.messageTemplate.create.mockResolvedValue({ id: "tmpl-1" });

    const { createMessageTemplate } = await import("@/lib/actions/campaigns");
    const result = await createMessageTemplate({
      name: "Test Template",
      channel: "SMS",
      body: "Hi {{firstName}}!",
    });

    expect(prisma.messageTemplate.create).toHaveBeenCalled();
    expect(result).toHaveProperty("id", "tmpl-1");
  });

  it("returns error when body is empty", async () => {
    const { createMessageTemplate } = await import("@/lib/actions/campaigns");
    const result = await createMessageTemplate({
      name: "Test",
      channel: "SMS",
      body: "",
    });
    expect(result).toHaveProperty("error");
  });
});

// ── Additional tests (Phase 2d) ────────────────────────────────────────────────

describe("createCampaign with segmentConfig", () => {
  it("passes segmentConfig as JSON to prisma", async () => {
    const prisma = await getPrisma();
    prisma.campaign.create.mockResolvedValue({ id: "cmp-seg-1" });

    const { createCampaign } = await import("@/lib/actions/campaigns");
    const segmentConfig = {
      logic: "AND",
      conditions: [{ field: "age", operator: "gt", value: 40 }],
      excludeMarketingOptOut: true,
    };
    const result = await createCampaign({
      name: "Segment Campaign",
      type: "EXAM_REMINDER",
      segmentConfig,
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ segmentConfig }),
      })
    );
    expect(result).toHaveProperty("id");
  });

  it("passes config (drip steps) as JSON to prisma", async () => {
    const prisma = await getPrisma();
    prisma.campaign.create.mockResolvedValue({ id: "cmp-cfg-1" });

    const { createCampaign } = await import("@/lib/actions/campaigns");
    const config = {
      steps: [{ stepIndex: 0, delayDays: 0, channel: "SMS", templateBody: "Hi {{firstName}}!" }],
      stopOnConversion: false,
      cooldownDays: 30,
      enrollmentMode: "manual" as const,
    };
    const result = await createCampaign({
      name: "Config Campaign",
      type: "ONE_TIME_BLAST",
      config,
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ config }),
      })
    );
    expect(result).toHaveProperty("id");
  });
});

describe("getCampaignAnalytics", () => {
  it("calls findUniqueOrThrow and two groupBy queries", async () => {
    const prisma = await getPrisma();
    const campaign = { id: "cmp-1", name: "Test", _count: { recipients: 5, messages: 10 }, runs: [] };
    prisma.campaign.findUniqueOrThrow.mockResolvedValue(campaign);
    prisma.campaignRecipient.groupBy.mockResolvedValue([
      { status: "ACTIVE", _count: 3 },
      { status: "COMPLETED", _count: 2 },
    ]);
    prisma.message.groupBy.mockResolvedValue([
      { status: "SENT", _count: 8 },
      { status: "FAILED", _count: 2 },
    ]);

    const { getCampaignAnalytics } = await import("@/lib/actions/campaigns");
    const result = await getCampaignAnalytics("cmp-1");

    expect(prisma.campaign.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cmp-1" } })
    );
    expect(prisma.campaignRecipient.groupBy).toHaveBeenCalled();
    expect(prisma.message.groupBy).toHaveBeenCalled();
    expect(result).toHaveProperty("campaign");
    expect(result).toHaveProperty("recipientsByStatus");
    expect(result).toHaveProperty("messagesByStatus");
  });

  it("returns correct analytics structure", async () => {
    const prisma = await getPrisma();
    prisma.campaign.findUniqueOrThrow.mockResolvedValue({ id: "cmp-1", name: "X", _count: {}, runs: [] });
    prisma.campaignRecipient.groupBy.mockResolvedValue([{ status: "ACTIVE", _count: 1 }]);
    prisma.message.groupBy.mockResolvedValue([{ status: "SENT", _count: 5 }]);

    const { getCampaignAnalytics } = await import("@/lib/actions/campaigns");
    const result = await getCampaignAnalytics("cmp-1");

    expect(result.recipientsByStatus).toEqual([{ status: "ACTIVE", _count: 1 }]);
    expect(result.messagesByStatus).toEqual([{ status: "SENT", _count: 5 }]);
  });
});

describe("previewSegment", () => {
  it("calls both previewSegmentCount and previewSegmentSample and returns count+sample", async () => {
    // Use flat prisma type for top-level methods like $queryRawUnsafe
    const { prisma: prismaRaw } = await import("@/lib/prisma");
    const prismaFlat = prismaRaw as unknown as Record<string, ReturnType<typeof vi.fn>>;
    prismaFlat.$queryRawUnsafe.mockResolvedValue([{ count: 42 }]);

    const { previewSegment } = await import("@/lib/actions/campaigns");
    const segmentConfig = { logic: "AND" as const, conditions: [], excludeMarketingOptOut: true };
    const result = await previewSegment(segmentConfig);

    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("sample");
  });
});

describe("updateMessageTemplate", () => {
  it("partial update with body only", async () => {
    const prisma = await getPrisma();
    prisma.messageTemplate.update.mockResolvedValue({ id: "tmpl-1" });

    const { updateMessageTemplate } = await import("@/lib/actions/campaigns");
    const result = await updateMessageTemplate("tmpl-1", {
      body: "Updated body content here",
    });

    expect(prisma.messageTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tmpl-1" },
        data: expect.objectContaining({ body: "Updated body content here" }),
      })
    );
    expect(result).toHaveProperty("success", true);
  });
});

describe("deleteMessageTemplate", () => {
  it("returns error when prisma throws", async () => {
    const prisma = await getPrisma();
    prisma.messageTemplate.delete.mockRejectedValue(new Error("DB error"));

    const { deleteMessageTemplate } = await import("@/lib/actions/campaigns");
    const result = await deleteMessageTemplate("tmpl-99");
    expect(result).toHaveProperty("error");
  });
});

describe("activateCampaign sets nextRunAt", () => {
  it("includes nextRunAt in the update data", async () => {
    const prisma = await getPrisma();
    prisma.campaign.update.mockResolvedValue({ id: "cmp-1" });

    const { activateCampaign } = await import("@/lib/actions/campaigns");
    await activateCampaign("cmp-1");

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          nextRunAt: expect.any(Date),
        }),
      })
    );
  });
});

describe("triggerCampaignRun admin", () => {
  it("admin can trigger a campaign run successfully", async () => {
    await mockSessionAs("ADMIN");

    const prisma = await getPrisma();
    // processCampaign internals mocked
    const campaign = {
      id: "cmp-1",
      name: "Admin Campaign",
      type: "ONE_TIME_BLAST",
      status: "ACTIVE",
      segmentConfig: null,
      recipients: [],
    };
    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce(campaign) // processCampaign load
      .mockResolvedValueOnce(campaign); // checkConversions
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    prisma.campaignRecipient.findMany.mockResolvedValue([]);
    prisma.campaignRecipient.count.mockResolvedValue(0);
    prisma.campaignRun.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});

    const { triggerCampaignRun } = await import("@/lib/actions/campaigns");
    const result = await triggerCampaignRun("cmp-1");

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("result");
  });
});
