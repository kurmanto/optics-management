import { describe, it, expect, beforeEach, vi } from "vitest";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>> & ReturnType<typeof vi.fn>>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processAllCampaigns", () => {
  it("returns empty array when no active campaigns", async () => {
    const prisma = await getPrisma();
    prisma.campaign.findMany.mockResolvedValue([]);

    const { processAllCampaigns } = await import("@/lib/campaigns/campaign-engine");
    const results = await processAllCampaigns();

    expect(results).toEqual([]);
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE" },
      })
    );
  });
});

describe("opt-out", () => {
  it("canContact returns false for opted-out customers", async () => {
    const { canContact } = await import("@/lib/campaigns/opt-out");
    const customer = {
      marketingOptOut: true,
      smsOptIn: true,
      emailOptIn: true,
      phone: "4165551234",
      email: "test@example.com",
    };
    expect(canContact(customer, "SMS")).toBe(false);
    expect(canContact(customer, "EMAIL")).toBe(false);
  });

  it("canContact returns false when SMS is opt-out", async () => {
    const { canContact } = await import("@/lib/campaigns/opt-out");
    const customer = {
      marketingOptOut: false,
      smsOptIn: false,
      emailOptIn: true,
      phone: "4165551234",
      email: "test@example.com",
    };
    expect(canContact(customer, "SMS")).toBe(false);
    expect(canContact(customer, "EMAIL")).toBe(true);
  });

  it("canContact returns false when phone is missing for SMS", async () => {
    const { canContact } = await import("@/lib/campaigns/opt-out");
    const customer = {
      marketingOptOut: false,
      smsOptIn: true,
      emailOptIn: true,
      phone: null,
      email: "test@example.com",
    };
    expect(canContact(customer, "SMS")).toBe(false);
  });

  it("canContact returns false when email is missing for EMAIL", async () => {
    const { canContact } = await import("@/lib/campaigns/opt-out");
    const customer = {
      marketingOptOut: false,
      smsOptIn: true,
      emailOptIn: true,
      phone: "4165551234",
      email: null,
    };
    expect(canContact(customer, "EMAIL")).toBe(false);
  });

  it("canContact returns true for SMS with opted-in customer with phone", async () => {
    const { canContact } = await import("@/lib/campaigns/opt-out");
    const customer = {
      marketingOptOut: false,
      smsOptIn: true,
      emailOptIn: false,
      phone: "4165551234",
      email: null,
    };
    expect(canContact(customer, "SMS")).toBe(true);
  });

  it("processOptOut sets marketingOptOut and opts out of campaigns", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "c1" });
    prisma.campaignRecipient.updateMany.mockResolvedValue({ count: 2 });

    const { processOptOut } = await import("@/lib/campaigns/opt-out");
    await processOptOut("c1", "STOP SMS", "Customer requested opt-out");

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "c1" },
        data: expect.objectContaining({ marketingOptOut: true }),
      })
    );
    expect(prisma.campaignRecipient.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: "c1", status: "ACTIVE" },
        data: expect.objectContaining({ status: "OPTED_OUT" }),
      })
    );
  });
});

describe("getDripConfig", () => {
  it("all 21 campaign types return a valid drip config", async () => {
    const { getDripConfig } = await import("@/lib/campaigns/drip-presets");

    const allTypes = [
      "WALKIN_FOLLOWUP", "EXAM_REMINDER", "INSURANCE_RENEWAL", "ONE_TIME_BLAST",
      "SECOND_PAIR", "PRESCRIPTION_EXPIRY", "ABANDONMENT_RECOVERY", "POST_PURCHASE_REFERRAL",
      "VIP_INSIDER", "BIRTHDAY_ANNIVERSARY", "DORMANT_REACTIVATION", "INSURANCE_MAXIMIZATION",
      "DAMAGE_REPLACEMENT", "COMPETITOR_SWITCHER", "NEW_ARRIVAL_VIP", "LIFESTYLE_MARKETING",
      "EDUCATIONAL_NURTURE", "LENS_EDUCATION", "AGING_INVENTORY", "STYLE_EVOLUTION",
      "FAMILY_ADDON",
    ];

    for (const type of allTypes) {
      const config = getDripConfig(type as never);
      expect(config).toHaveProperty("steps");
      expect(config.steps.length).toBeGreaterThan(0);
      expect(config).toHaveProperty("cooldownDays");
      expect(config).toHaveProperty("enrollmentMode");
    }
  });

  it("INSURANCE_RENEWAL has proper 2-step drip preset", async () => {
    const { getDripConfig } = await import("@/lib/campaigns/drip-presets");
    const config = getDripConfig("INSURANCE_RENEWAL");

    expect(config.steps).toHaveLength(2);
    expect(config.steps[0].channel).toBe("SMS");
    expect(config.steps[1].channel).toBe("EMAIL");
    expect(config.steps[1].templateSubject).toBeTruthy();
    expect(config.stopOnConversion).toBe(true);
  });
});

describe("checkConversions behavior (via processCampaign)", () => {
  it("converts recipient when order placed after enrollment", async () => {
    const prisma = await getPrisma();

    const campaign = {
      id: "cmp-1",
      name: "Test",
      type: "EXAM_REMINDER", // stopOnConversion=true
      status: "ACTIVE",
      segmentConfig: null,
      recipients: [],
    };

    const recipient = {
      id: "rec-1",
      customerId: "c1",
      campaignId: "cmp-1",
      currentStep: 0,
      status: "ACTIVE",
      enrolledAt: new Date("2026-01-01"),
    };

    const order = {
      id: "ord-1",
      customerId: "c1",
      totalReal: 450,
      createdAt: new Date("2026-01-15"),
      status: "CONFIRMED",
    };

    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce({ ...campaign, recipients: [] })
      .mockResolvedValueOnce(campaign); // checkConversions
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    prisma.campaignRecipient.findMany
      .mockResolvedValueOnce([]) // no active for processing
      .mockResolvedValueOnce([recipient]); // checkConversions active recipients
    prisma.order.findFirst.mockResolvedValue(order);
    prisma.campaignRecipient.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});
    prisma.campaignRecipient.count.mockResolvedValue(1);
    prisma.campaignRun.update.mockResolvedValue({});

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    expect(prisma.campaignRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CONVERTED", conversionValue: 450 }),
      })
    );
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalConverted: { increment: 1 }, totalRevenue: { increment: 450 } }),
      })
    );
  });

  it("does NOT convert recipient when only DRAFT/CANCELLED orders exist", async () => {
    const prisma = await getPrisma();

    const campaign = { id: "cmp-1", name: "Test", type: "EXAM_REMINDER", status: "ACTIVE", segmentConfig: null, recipients: [] };
    const recipient = { id: "rec-1", customerId: "c1", campaignId: "cmp-1", currentStep: 0, status: "ACTIVE", enrolledAt: new Date("2026-01-01") };

    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce({ ...campaign, recipients: [] })
      .mockResolvedValueOnce(campaign);
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    prisma.campaignRecipient.findMany
      .mockResolvedValueOnce([]) // processing
      .mockResolvedValueOnce([recipient]); // checkConversions
    prisma.order.findFirst.mockResolvedValue(null); // no qualifying order
    prisma.campaignRecipient.count.mockResolvedValue(1);
    prisma.campaignRun.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    // campaignRecipient.update should NOT be called (no conversion)
    expect(prisma.campaignRecipient.update).not.toHaveBeenCalled();
  });
});

describe("opt-out with optOutBy fix", () => {
  it("processOptOut sets optOutBy to the source string", async () => {
    const prisma = await getPrisma();
    prisma.customer.update.mockResolvedValue({ id: "c1" });
    prisma.campaignRecipient.updateMany.mockResolvedValue({ count: 0 });

    const { processOptOut } = await import("@/lib/campaigns/opt-out");
    await processOptOut("c1", "SMS_STOP_KEYWORD");

    expect(prisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ optOutBy: "SMS_STOP_KEYWORD" }),
      })
    );
  });
});

describe("notifications from processAllCampaigns", () => {
  it("fires CAMPAIGN_COMPLETED notification on success", async () => {
    const prisma = await getPrisma();
    const { createNotification } = await import("@/lib/notifications");

    const campaign = { id: "cmp-1", name: "Recall", type: "ONE_TIME_BLAST", status: "ACTIVE", segmentConfig: null, recipients: [] };

    prisma.campaign.findMany.mockResolvedValue([campaign]);
    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce({ ...campaign, recipients: [] })
      .mockResolvedValueOnce(campaign);
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    prisma.campaignRecipient.findMany.mockResolvedValue([]);
    prisma.campaignRecipient.count.mockResolvedValue(0);
    prisma.campaignRun.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});

    const { processAllCampaigns } = await import("@/lib/campaigns/campaign-engine");
    await processAllCampaigns();

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CAMPAIGN_COMPLETED",
        refId: "cmp-1",
      })
    );
  });

  it("fires CAMPAIGN_ERROR notification on campaign failure", async () => {
    const prisma = await getPrisma();
    const { createNotification } = await import("@/lib/notifications");

    const campaign = { id: "cmp-2", name: "Broken Campaign", type: "ONE_TIME_BLAST", status: "ACTIVE" };
    prisma.campaign.findMany.mockResolvedValue([campaign]);

    // processCampaign will throw because findUniqueOrThrow is not mocked to return
    prisma.campaign.findUniqueOrThrow.mockRejectedValue(new Error("DB unavailable"));

    const { processAllCampaigns } = await import("@/lib/campaigns/campaign-engine");
    await processAllCampaigns();

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CAMPAIGN_ERROR",
        refId: "cmp-2",
      })
    );
  });
});

describe("checkConversions uses fresh recipient list", () => {
  it("queries recipients fresh (not stale from campaign object)", async () => {
    const prisma = await getPrisma();

    const campaign = { id: "cmp-1", name: "Fresh Test", type: "EXAM_REMINDER", status: "ACTIVE", segmentConfig: null, recipients: [] };
    // Campaign loaded initially with empty recipients
    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce({ ...campaign })
      .mockResolvedValueOnce(campaign);
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    // Processing loop: 1 newly enrolled recipient
    prisma.campaignRecipient.findMany
      .mockResolvedValueOnce([]) // no active for message sending
      .mockResolvedValueOnce([]); // checkConversions fresh query (returns nothing for simplicity)
    prisma.campaignRecipient.count.mockResolvedValue(0);
    prisma.campaignRun.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    // checkConversions should have called findMany independently (2nd call)
    const findManyCalls = prisma.campaignRecipient.findMany.mock.calls;
    expect(findManyCalls.length).toBeGreaterThanOrEqual(2);
    // The second findMany call (checkConversions) should query by campaignId + ACTIVE
    expect(findManyCalls[1][0]).toMatchObject({
      where: { campaignId: "cmp-1", status: "ACTIVE" },
    });
  });
});

describe("dispatch", () => {
  it("creates a message record and marks as SENT on success", async () => {
    const prisma = await getPrisma();
    prisma.message.create.mockResolvedValue({ id: "msg-1" });
    prisma.message.update.mockResolvedValue({ id: "msg-1", status: "SENT" });

    const { dispatchMessage } = await import("@/lib/campaigns/dispatch");
    const msgId = await dispatchMessage({
      customerId: "c1",
      channel: "SMS",
      body: "Hello {{firstName}}!",
      to: "4165551234",
    });

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: "c1",
          channel: "SMS",
          body: "Hello {{firstName}}!",
          status: "PENDING",
        }),
      })
    );
    expect(prisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SENT" }),
      })
    );
    expect(msgId).toBe("msg-1");
  });
});
