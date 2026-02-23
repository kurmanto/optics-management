/**
 * Limited prefill data returned for returning patients.
 * Intentionally excludes sensitive info (health card, medical history, prescriptions).
 */
export type ReturningPatientPrefill = {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  occupation: string | null;
  hearAboutUs: string | null;
  insurance: {
    providerName: string;
    policyNumber: string | null;
    groupNumber: string | null;
    memberId: string | null;
    coverageType: string;
  } | null;
};
