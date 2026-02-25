export type IntakeFormState = {
  // Section 1: Check-In
  visitType: "" | "COMPLETE_EYE_EXAM" | "EYEWEAR_ONLY";
  newOrReturning: "" | "NEW" | "RETURNING";
  whoIsThisFor: string[];
  patientCount: number;
  visionInsurance: string;
  insuranceProviderName: string;
  insurancePolicyNumber: string;
  insuranceMemberId: string;
  hearAboutUs: string;
  // Section 2: Contact
  contactFullName: string;
  contactTelephone: string;
  contactAddress: string;
  contactCity: string;
  contactEmail: string;
  // Section 3: Patients
  patients: PatientBlockData[];
};

export type PatientBlockData = {
  fullName: string;
  gender: string;
  sameContactAsPrimary: boolean;
  telephone: string;
  address: string;
  dateOfBirth: string;
  medications: string;
  allergies: string;
  healthConditions: string[];
  familyEyeConditions: string[];
  screenHoursPerDay: string;
  currentlyWearGlasses: string[];
  dilationPreference: string;
  mainReasonForExam: string;
  biggestVisionAnnoyance: string;
  examConcerns: string;
};

export function createEmptyPatient(): PatientBlockData {
  return {
    fullName: "",
    gender: "",
    sameContactAsPrimary: false,
    telephone: "",
    address: "",
    dateOfBirth: "",
    medications: "",
    allergies: "",
    healthConditions: [],
    familyEyeConditions: [],
    screenHoursPerDay: "",
    currentlyWearGlasses: [],
    dilationPreference: "",
    mainReasonForExam: "",
    biggestVisionAnnoyance: "",
    examConcerns: "",
  };
}

export function createInitialFormState(): IntakeFormState {
  return {
    visitType: "",
    newOrReturning: "",
    whoIsThisFor: [],
    patientCount: 1,
    visionInsurance: "",
    insuranceProviderName: "",
    insurancePolicyNumber: "",
    insuranceMemberId: "",
    hearAboutUs: "",
    contactFullName: "",
    contactTelephone: "",
    contactAddress: "",
    contactCity: "",
    contactEmail: "",
    patients: [createEmptyPatient()],
  };
}

// Reducer actions
export type IntakeFormAction =
  | { type: "SET_FIELD"; field: keyof IntakeFormState; value: string | string[] | number }
  | { type: "SET_PATIENT_COUNT"; count: number }
  | { type: "UPDATE_PATIENT"; index: number; data: Partial<PatientBlockData> }
  | { type: "PREFILL"; data: Partial<IntakeFormState> };

export function intakeFormReducer(state: IntakeFormState, action: IntakeFormAction): IntakeFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };

    case "SET_PATIENT_COUNT": {
      const count = Math.max(1, Math.min(5, action.count));
      const patients = [...state.patients];
      while (patients.length < count) patients.push(createEmptyPatient());
      while (patients.length > count) patients.pop();
      return { ...state, patientCount: count, patients };
    }

    case "UPDATE_PATIENT": {
      const patients = state.patients.map((p, i) =>
        i === action.index ? { ...p, ...action.data } : p
      );
      return { ...state, patients };
    }

    case "PREFILL":
      return { ...state, ...action.data };

    default:
      return state;
  }
}
