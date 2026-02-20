/**
 * All template variable names supported in message bodies.
 * Use {{variableName}} syntax in templates.
 *
 * This file has NO server-side imports so it is safe to use in Client Components.
 */
export const TEMPLATE_VARIABLES = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "fullName", label: "Full Name" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "frameBrand", label: "Last Frame Brand" },
  { key: "frameModel", label: "Last Frame Model" },
  { key: "orderDate", label: "Last Order Date" },
  { key: "rxExpiryDate", label: "Prescription Expiry Date" },
  { key: "insuranceProvider", label: "Insurance Provider" },
  { key: "insuranceRenewalMonth", label: "Insurance Renewal Month" },
  { key: "examDate", label: "Last Exam Date" },
  { key: "referralCode", label: "Referral Code" },
  { key: "storeName", label: "Store Name" },
  { key: "storePhone", label: "Store Phone" },
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number]["key"];
