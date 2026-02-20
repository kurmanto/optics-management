import { describe, it, expect, beforeEach, vi } from "vitest";

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
}

// For accessing top-level prisma properties like $queryRawUnsafe
async function getPrismaFlat() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as Record<string, ReturnType<typeof vi.fn>>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: "cmp-1",
  name: "Test Campaign",
  type: "ONE_TIME_BLAST", // stopOnConversion=false → checkConversions returns early
  status: "ACTIVE",
  segmentConfig: null,
  recipients: [] as unknown[],
  totalSent: 0,
  totalDelivered: 0,
  ...overrides,
});

const makeRecipient = (overrides: Record<string, unknown> = {}) => ({
  id: "rec-1",
  customerId: "c1",
  campaignId: "cmp-1",
  currentStep: 0,
  status: "ACTIVE",
  // 2 days ago — passes delayDays: 0 check for ONE_TIME_BLAST step 0
  enrolledAt: new Date(Date.now() - 86400000 * 2),
  lastMessageAt: null,
  completedAt: null,
  customer: {
    id: "c1",
    phone: "4165551234",
    email: "test@example.com",
    marketingOptOut: false,
    smsOptIn: true,
    emailOptIn: true,
  },
  ...overrides,
});

const makeCustomer = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  firstName: "Alice",
  lastName: "Smith",
  phone: "4165551234",
  email: "test@example.com",
  orders: [],
  prescriptions: [],
  insurancePolicies: [],
  exams: [],
  referralsGiven: [],
  ...overrides,
});

/**
 * Setup the minimum mocks for a clean processCampaign run.
 * ONE_TIME_BLAST (stopOnConversion=false) only needs 2x findUniqueOrThrow
 * and 1x campaignRecipient.findMany for the main processing loop.
 */
async function setupBaseMocks(
  prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>,
  options: {
    campaign?: ReturnType<typeof makeCampaign>;
    campaignForConversions?: ReturnType<typeof makeCampaign>;
    activeRecipients?: ReturnType<typeof makeRecipient>[];
  } = {}
) {
  const campaign = options.campaign ?? makeCampaign();
  const campaignForConversions = options.campaignForConversions ?? campaign;
  const activeRecipients = options.activeRecipients ?? [];

  // processCampaign: initial load (with recipients)
  prisma.campaign.findUniqueOrThrow
    .mockResolvedValueOnce({ ...campaign })
    .mockResolvedValueOnce({ ...campaignForConversions }); // checkConversions load

  prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });

  // Active recipients for processing loop
  prisma.campaignRecipient.findMany.mockResolvedValueOnce(activeRecipients);

  // Resolve template variables (resolveVariables → customer.findUnique)
  prisma.customer.findUnique.mockResolvedValue(makeCustomer());

  // Dispatch: create + update message
  prisma.message.create.mockResolvedValue({ id: "msg-1" });
  prisma.message.update.mockResolvedValue({ id: "msg-1", status: "SENT" });

  // Advance drip step
  prisma.campaignRecipient.update.mockResolvedValue({ id: "rec-1" });

  // End-of-run stats
  prisma.campaignRecipient.count.mockResolvedValue(activeRecipients.length);
  prisma.campaignRun.update.mockResolvedValue({});
  prisma.campaign.update.mockResolvedValue({});
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe("processCampaign", () => {
  it("1. happy path: segment finds customers, enrolls, sends step 0", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign({
      segmentConfig: { logic: "AND", conditions: [], excludeMarketingOptOut: true },
    });

    await setupBaseMocks(prisma, {
      campaign,
      activeRecipients: [makeRecipient()],
    });

    // Segment returns 1 customer
    const prismaFlat = await getPrismaFlat();
    prismaFlat.$queryRawUnsafe.mockResolvedValue([{ id: "c1" }]);
    prisma.campaignRecipient.createMany.mockResolvedValue({ count: 1 });

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(prisma.campaignRecipient.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ customerId: "c1", status: "ACTIVE" }),
        ]),
      })
    );
    expect(result.recipientsEnrolled).toBe(1);
    expect(result.messagesSent).toBe(1);
    expect(result.messagesFailed).toBe(0);
  });

  it("2. no segment config: skips enrollment, processes pre-enrolled recipients", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign({ segmentConfig: null });
    await setupBaseMocks(prisma, { campaign, activeRecipients: [makeRecipient()] });

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(prisma.campaignRecipient.createMany).not.toHaveBeenCalled();
    expect(result.recipientsEnrolled).toBe(0);
    expect(result.messagesSent).toBe(1);
  });

  it("3. already-enrolled recipients are not re-enrolled", async () => {
    const prisma = await getPrisma();

    // Campaign already has c1 enrolled
    const campaign = makeCampaign({
      segmentConfig: { logic: "AND", conditions: [], excludeMarketingOptOut: true },
      recipients: [{ customerId: "c1" }],
    });

    await setupBaseMocks(prisma, { campaign, activeRecipients: [] });

    // Segment returns c1 — already enrolled
    const prismaFlat = await getPrismaFlat();
    prismaFlat.$queryRawUnsafe.mockResolvedValue([{ id: "c1" }]);

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(prisma.campaignRecipient.createMany).not.toHaveBeenCalled();
    expect(result.recipientsEnrolled).toBe(0);
  });

  it("4. delay not elapsed → no message sent", async () => {
    const prisma = await getPrisma();

    // Use EXAM_REMINDER step 1 which has delayDays: 14
    // Recipient at step 1, only enrolled 1 day ago
    const campaign = makeCampaign({ type: "EXAM_REMINDER" });
    const recipient = makeRecipient({
      currentStep: 1,
      enrolledAt: new Date(Date.now() - 86400000 * 1), // 1 day ago
    });

    // EXAM_REMINDER stopOnConversion=true → checkConversions needs one more findMany
    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce({ ...campaign })
      .mockResolvedValueOnce({ ...campaign });
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    prisma.campaignRecipient.findMany
      .mockResolvedValueOnce([recipient]) // processing loop
      .mockResolvedValueOnce([]); // checkConversions
    prisma.campaignRecipient.count.mockResolvedValue(1);
    prisma.campaignRun.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(result.messagesQueued).toBe(0);
    expect(result.messagesSent).toBe(0);
  });

  it("5. opted-out customer is skipped", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign();
    const recipient = makeRecipient({
      customer: {
        id: "c1",
        phone: "4165551234",
        email: "test@example.com",
        marketingOptOut: true, // opted out
        smsOptIn: true,
        emailOptIn: true,
      },
    });

    await setupBaseMocks(prisma, { campaign, activeRecipients: [recipient] });

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(result.messagesQueued).toBe(0);
  });

  it("6. missing phone for SMS step → skipped", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign(); // ONE_TIME_BLAST step 0 = SMS
    const recipient = makeRecipient({
      customer: {
        id: "c1",
        phone: null, // no phone
        email: "test@example.com",
        marketingOptOut: false,
        smsOptIn: true,
        emailOptIn: true,
      },
    });

    await setupBaseMocks(prisma, { campaign, activeRecipients: [recipient] });
    prisma.customer.findUnique.mockResolvedValue(makeCustomer({ phone: null }));

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(result.messagesQueued).toBe(0);
  });

  it("7. multi-step drip: recipient advances from step 0 to step 1", async () => {
    const prisma = await getPrisma();

    // EXAM_REMINDER: 2 steps (0=SMS, 1=EMAIL), stopOnConversion=true
    const campaign = makeCampaign({ type: "EXAM_REMINDER" });
    const recipient = makeRecipient({ currentStep: 0 });

    prisma.campaign.findUniqueOrThrow
      .mockResolvedValueOnce({ ...campaign })
      .mockResolvedValueOnce({ ...campaign });
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });
    prisma.campaignRecipient.findMany
      .mockResolvedValueOnce([recipient]) // processing
      .mockResolvedValueOnce([]); // checkConversions
    prisma.customer.findUnique.mockResolvedValue(makeCustomer());
    prisma.message.create.mockResolvedValue({ id: "msg-1" });
    prisma.message.update.mockResolvedValue({ id: "msg-1", status: "SENT" });
    prisma.campaignRecipient.update.mockResolvedValue({ id: "rec-1", currentStep: 1 });
    prisma.campaignRecipient.count.mockResolvedValue(1);
    prisma.campaignRun.update.mockResolvedValue({});
    prisma.campaign.update.mockResolvedValue({});

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    // Should advance to step 1, status stays ACTIVE
    expect(prisma.campaignRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentStep: 1, status: "ACTIVE" }),
      })
    );
  });

  it("8. drip completion: last step → recipient marked COMPLETED", async () => {
    const prisma = await getPrisma();

    // ONE_TIME_BLAST has only 1 step (index 0). Recipient at step 0 → after send, step 1 >= 1 → COMPLETED
    const campaign = makeCampaign({ type: "ONE_TIME_BLAST" });
    const recipient = makeRecipient({ currentStep: 0 });

    await setupBaseMocks(prisma, { campaign, activeRecipients: [recipient] });

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    expect(prisma.campaignRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          completedAt: expect.any(Date),
        }),
      })
    );
  });

  it("9. dispatch failure → messagesFailed incremented, recipient not advanced", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign();
    const recipient = makeRecipient();
    await setupBaseMocks(prisma, { campaign, activeRecipients: [recipient] });

    // Dispatch fails
    prisma.message.create.mockRejectedValue(new Error("send failed"));

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    const result = await processCampaign("cmp-1");

    expect(result.messagesFailed).toBe(1);
    expect(result.messagesSent).toBe(0);
    // Recipient update for step advance should NOT have been called
    expect(prisma.campaignRecipient.update).not.toHaveBeenCalled();
  });

  it("10. run record updated with correct stats", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign();
    const recipients = [makeRecipient({ id: "rec-1" }), makeRecipient({ id: "rec-2", customerId: "c2" })];
    await setupBaseMocks(prisma, { campaign, activeRecipients: recipients });
    prisma.campaignRecipient.count.mockResolvedValue(2);

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    expect(prisma.campaignRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({
          recipientsFound: 2,
          messagesQueued: 2,
          messagesSent: 2,
          messagesFailed: 0,
          durationMs: expect.any(Number),
        }),
      })
    );
  });

  it("11. campaign aggregate stats incremented on success", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign();
    await setupBaseMocks(prisma, { campaign, activeRecipients: [makeRecipient()] });

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await processCampaign("cmp-1");

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cmp-1" },
        data: expect.objectContaining({
          totalSent: { increment: 1 },
          totalDelivered: { increment: 1 },
          lastRunAt: expect.any(Date),
        }),
      })
    );
  });

  it("12. unexpected error → run record gets error field and re-throws", async () => {
    const prisma = await getPrisma();

    const campaign = makeCampaign();
    prisma.campaign.findUniqueOrThrow.mockResolvedValueOnce({ ...campaign });
    prisma.campaignRun.create.mockResolvedValue({ id: "run-1" });

    // campaignRecipient.findMany throws unexpectedly
    prisma.campaignRecipient.findMany.mockRejectedValue(new Error("DB down"));
    prisma.campaignRun.update.mockResolvedValue({});

    const { processCampaign } = await import("@/lib/campaigns/campaign-engine");
    await expect(processCampaign("cmp-1")).rejects.toThrow("DB down");

    expect(prisma.campaignRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: "DB down" }),
      })
    );
  });
});
