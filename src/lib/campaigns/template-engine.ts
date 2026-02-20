import { prisma } from "@/lib/prisma";
export { TEMPLATE_VARIABLES } from "./template-variables";
export type { TemplateVariable } from "./template-variables";

export interface ResolvedVariables {
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  frameBrand: string;
  frameModel: string;
  orderDate: string;
  rxExpiryDate: string;
  insuranceProvider: string;
  insuranceRenewalMonth: string;
  examDate: string;
  referralCode: string;
  storeName: string;
  storePhone: string;
  [key: string]: string;
}

const STORE_NAME = "Mint Vision Optique";
const STORE_PHONE = "(416) 555-0100";

export async function resolveVariables(customerId: string): Promise<ResolvedVariables> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        where: { status: "PICKED_UP" },
        orderBy: { pickedUpAt: "desc" },
        take: 1,
      },
      prescriptions: {
        where: { isActive: true },
        orderBy: { date: "desc" },
        take: 1,
      },
      insurancePolicies: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      exams: {
        orderBy: { examDate: "desc" },
        take: 1,
      },
      referralsGiven: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!customer) {
    return getDefaultVariables();
  }

  const lastOrder = customer.orders[0];
  const lastRx = customer.prescriptions[0];
  const lastInsurance = customer.insurancePolicies[0];
  const lastExam = customer.exams[0];
  const referral = customer.referralsGiven[0];

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    fullName: `${customer.firstName} ${customer.lastName}`,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    frameBrand: lastOrder?.frameBrand ?? "",
    frameModel: lastOrder?.frameModel ?? "",
    orderDate: lastOrder?.pickedUpAt
      ? new Date(lastOrder.pickedUpAt).toLocaleDateString("en-CA")
      : "",
    rxExpiryDate: lastRx?.expiryDate
      ? new Date(lastRx.expiryDate).toLocaleDateString("en-CA")
      : "",
    insuranceProvider: lastInsurance?.providerName ?? "",
    insuranceRenewalMonth: lastInsurance?.renewalMonth
      ? MONTH_NAMES[(lastInsurance.renewalMonth - 1) % 12]
      : "",
    examDate: lastExam?.examDate
      ? new Date(lastExam.examDate).toLocaleDateString("en-CA")
      : "",
    referralCode: referral?.code ?? "",
    storeName: STORE_NAME,
    storePhone: STORE_PHONE,
  };
}

function getDefaultVariables(): ResolvedVariables {
  return {
    firstName: "",
    lastName: "",
    fullName: "",
    phone: "",
    email: "",
    frameBrand: "",
    frameModel: "",
    orderDate: "",
    rxExpiryDate: "",
    insuranceProvider: "",
    insuranceRenewalMonth: "",
    examDate: "",
    referralCode: "",
    storeName: STORE_NAME,
    storePhone: STORE_PHONE,
  };
}

/**
 * Replace {{variable}} placeholders with resolved values.
 * Unknown variables are left as-is.
 */
export function interpolateTemplate(template: string, variables: ResolvedVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}
