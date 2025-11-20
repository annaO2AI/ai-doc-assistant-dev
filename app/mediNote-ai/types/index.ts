// Core API Response Types
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  details?: Record<string, any>
}

// Audio and Enrollment Types
export interface EnrollmentRequest {
  speaker_type: "doctor" | "patient"
  audio_file: File
}

export interface VoiceEnrollmentResponse {
  success: boolean
  speaker_id: string
  message?: string
  enrollment_id?: string
  audio_duration?: number
}

export interface EpicPractitioner {
  ok: boolean
  id: string
  resourceType: string
  display: string
  full_name: string
  name: {
    use: string
    text: string
    given: string[]
    family: string
    prefix: string[]
    suffix: string[]
  }
  gender: string
}

// WebSocket/Real-time Types
export interface TranscriptMessage {
  type:
    | "transcript_update"
    | "processing"
    | "keepalive"
    | "error"
    | "transcript"
    | "binary"
  speaker?: "doctor" | "patient"
  text?: string
  timestamp?: string
  session_id?: string
  error?: string
  is_final?: boolean
  confidence?: number
  data: string
  isFinal: boolean
}

export interface EpicPatient {
  ok: boolean
  id: string
  full_name: string
  given: string[]
  family: string
  mrn: string
  external_id: string
  mychart_username?: string
  mychart_password?: string
  source?: string
}

export interface EpicPatientsResponse {
  total: number
  items: EpicPatient[]
}

export interface ConversationEntry {
  id: string
  speaker: "doctor" | "patient"
  text: string
  timestamp: string
  isFromBackend: boolean
  confidence?: number
}

// Patient Management Types
// Patient Management Types
export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  date_of_birth: string
  medical_record_number: string
  created_at: string | Date
  updated_at: string | null
}

export type CreatePatientData = Omit<Patient, "id">
export type UpdatePatientData = Partial<CreatePatientData>

// Conversation Management Types
export type ConversationStatus = "active" | "archived" | "pending" | "processed"

export interface Conversation {
  id: string
  patient_id: string
  session_id: string
  title: string
  created_at: string
  updated_at?: string
  status: ConversationStatus
  duration?: number
  audio_file_url?: string
}

// Summary Types
export interface Summary {
  id: string
  conversation_id: string
  summary_type: "detailed" | "brief" | "soap"
  content: string
  generated_by: string
  created_at: string
  updated_at?: string
  model_version?: string
}

// Audio Processing Types
export interface AudioUploadResponse {
  success: boolean
  session_id: string
  message?: string
  transcript?: string
  audio_duration?: number
  word_count?: number
  processing_time?: number
}

// Error Types
export interface APIError {
  message: string
  status?: number
  code?: string
  details?: any
  timestamp?: string
  path?: string
}

// API Response Wrapper
export interface APIResponse<T> {
  data?: T
  error?: APIError
  meta?: {
    total?: number
    page?: number
    limit?: number
  }
}

export interface startConversation {
  conversation_id: string
  session_id: string
  patient: Patient
  message: string
}

export interface startConversationPayload {
  patient_id: string
  title: string
}

export interface PatientCreationTypes {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  ssn_last4?: string
  address?: string
}

export interface patient extends PatientCreationTypes {
  id: number
  voice_enrolled: number
}

export interface Session {
  session_id: number
  doctor_id: number
  patient_id: number
  started_at: string
  ended_at: string | null
  status: "active" | "ended"
}

export interface Summary {
  summary_id: string
  session_id: number
  title?: string
  content: string
  status: "queued" | "processing" | "complete" | "error"
  final_content?: string
  tags?: string[]
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface SummaryData {
  success: boolean
  session_id: number
  summary_id: number
  status: "draft" | "approved" | string // Add more known statuses if applicable
  title: string
  content: string
  created_at: string // ISO 8601 date string
  approved_at: string | null
  file_path: string | null
  summary: Summary
}

export interface TranscriptionSummary {
  message: string
  session_id: number
  summary_status: string
  summary_id: number
}

// Doctor related types
export interface doctor {
  full_name: string
  id: number
  first_name: string
  last_name: string
  email: string
  voice_enrolled: boolean
}

export interface DoctorCreationTypes {
  first_name: string
  last_name: string
  email: string
}

// API Response types
export interface CreateDoctorResponse {
  id: number
  message: string
  doctor: doctor
}

export interface SearchDoctorsResponse {
  results: doctor[]
}

export interface UpdateDoctorResponse {
  message: string
  doctor_id: number
}

export interface epicPatientResponse {
  id: string
  first_name: string
  last_name: string
  full_name: string
  mrn: string
  patientMId:string
}


export type DocumentReferenceType = {
  system: string
  code: string
  display: string
}

export type DocumentReference = {
  id: string | null
  status: string | null
  date: string | null
  title: string | null
  author: string[]
  encounters: string[]
  type: DocumentReferenceType[]
}

export type EpicDocumentReferenceResponse = {
  ok: boolean
  total: number
  items: DocumentReference[]
  epic_status: number
}

// types/medication.ts
export interface Medication {
  resourceType: string;
  id: string;
  identifier: Array<{
    use: string;
    system: string;
    value: string;
  }>;
  status: string;
  intent: string;
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  }>;
  medicationReference: {
    reference: string;
    display: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  encounter?: {
    reference: string;
    identifier: {
      use: string;
      system: string;
      value: string;
    };
    display: string;
  };
  authoredOn: string;
  requester: {
    reference: string;
    type: string;
    display: string;
  };
  recorder?: {
    reference: string;
    type: string;
    display: string;
  };
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  }>;
  courseOfTherapyType?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  dosageInstruction: Array<{
    text: string;
    patientInstruction?: string;
    timing?: {
      repeat?: {
        boundsPeriod?: {
          start: string;
        };
        count?: number;
        timeOfDay?: string[];
      };
      code?: {
        text: string;
      };
    };
    asNeededBoolean?: boolean;
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    method?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    doseAndRate?: Array<{
      type?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text: string;
      };
      doseQuantity?: {
        value: number;
        unit: string;
        system?: string;
        code?: string;
      };
    }>;
  }>;
  dispenseRequest?: {
    validityPeriod?: {
      start: string;
    };
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value: number;
      unit: string;
    };
    expectedSupplyDuration?: {
      value: number;
      unit: string;
      system?: string;
      code?: string;
    };
  };
}

export interface MedicationsResponse {
  resourceType: string;
  type: string;
  total: number;
  link: Array<{
    relation: string;
    url: string;
  }>;
  entry: Array<{
    link: Array<{
      relation: string;
      url: string;
    }>;
    fullUrl: string;
    resource: Medication;
    search: {
      mode: string;
    };
  }>;
}

export interface FormattedMedication {
  name: string;
  status: string;
  dosage: string;
  prescriber: string;
  date: string;
  identifier: string;
  category: string;
  reason: string;
  therapyType: string;
  timing: string;
  route: string;
  quantity?: number;
  unit?: string;
  duration?: number;
  durationUnit?: string;
  repeatsAllowed?: number;
  medicationRequestId: string;
}

// types/medication.ts - Add this interface

export interface IndividualMedicationResponse {
  resourceType: string;
  id: string;
  identifier: Array<{
    use: string;
    system: string;
    value: string;
  }>;
  status: string;
  intent: string;
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  }>;
  medicationReference: {
    reference: string;
    display: string;
  };
  subject: {
    reference: string;
    display: string;
  };
  encounter?: {
    reference: string;
    identifier: {
      use: string;
      system: string;
      value: string;
    };
    display: string;
  };
  authoredOn: string;
  requester: {
    reference: string;
    type: string;
    display: string;
  };
  recorder?: {
    reference: string;
    type: string;
    display: string;
  };
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  }>;
  courseOfTherapyType?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  dosageInstruction: Array<{
    text: string;
    patientInstruction?: string;
    timing?: {
      repeat?: {
        boundsPeriod?: {
          start: string;
        };
        count?: number;
        timeOfDay?: string[];
      };
      code?: {
        text: string;
      };
    };
    asNeededBoolean?: boolean;
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    method?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    doseAndRate?: Array<{
      type?: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
        text: string;
      };
      doseQuantity?: {
        value: number;
        unit: string;
        system?: string;
        code?: string;
      };
    }>;
  }>;
  dispenseRequest?: {
    validityPeriod?: {
      start: string;
    };
    numberOfRepeatsAllowed?: number;
    quantity?: {
      value: number;
      unit: string;
    };
    expectedSupplyDuration?: {
      value: number;
      unit: string;
      system?: string;
      code?: string;
    };
  };
}

export interface EOBData {
  resourceType: string;
  id: string;
  status: string;
  type: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  patient: {
    reference: string;
    display: string;
  };
  billablePeriod: {
    start: string;
    end: string;
  };
  insurer: {
    identifier: {
      use: string;
      system: string;
      value: string;
    };
    display: string;
  };
  provider: {
    type: string;
    identifier: {
      use: string;
      system: string;
      value: string;
    };
    display: string;
  };
  outcome: string;
  disposition: string;
  careTeam: Array<{
    sequence: number;
    provider: {
      reference: string;
      identifier: {
        use: string;
        system: string;
        value: string;
      };
      display: string;
    };
    responsible: boolean;
    role: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
  }>;
  diagnosis: Array<{
    sequence: number;
    diagnosisCodeableConcept: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
  }>;
  item: Array<{
    sequence: number;
    diagnosisSequence: number[];
    productOrService: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    servicedPeriod: {
      start: string;
      end: string;
    };
    locationCodeableConcept: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    quantity: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
    net: {
      value: number;
      currency: string;
    };
    adjudication: Array<{
      category: {
        coding: Array<{
          system: string;
          code: string;
          display: string;
        }>;
      };
      amount: {
        value: number;
        currency: string;
      };
    }>;
  }>;
  total: Array<{
    category: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    amount: {
      value: number;
      currency: string;
    };
  }>;
  payment: {
    date: string;
    amount: {
      value: number;
      currency: string;
    };
  };
}

// types/eob.ts
export interface Patient {
  ok: boolean;
  id: string;
  full_name: string;
  given: string[];
  family: string;
  mrn: string;
  external_id: string;
  mychart_username: string;
  mychart_password: string;
  source: string;
}

export interface PatientsResponse {
  total: number;
  items: Patient[];
}

export interface Coding {
  system: string;
  code: string;
  display: string;
}

export interface Type {
  coding: Coding[];
}

export interface PatientRef {
  reference: string;
  display: string;
}

export interface BillablePeriod {
  start: string;
  end: string;
}

export interface Identifier {
  use: string;
  system: string;
  value: string;
}

export interface Insurer {
  identifier: Identifier;
  display: string;
}

export interface Provider {
  type: string;
  identifier: Identifier;
  display: string;
}

export interface CareTeam {
  sequence: number;
  provider: {
    reference: string;
    identifier: Identifier;
    display: string;
  };
  responsible: boolean;
  role: {
    coding: Coding[];
  };
}

export interface Item {
  sequence: number;
  diagnosisSequence: number[];
  productOrService: {
    coding: Coding[];
  };
  servicedPeriod: {
    start: string;
    end: string;
  };
  locationCodeableConcept: {
    coding: Coding[];
  };
  quantity: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  net: {
    value: number;
    currency: string;
  };
  adjudication: Array<{
    category: {
      coding: Coding[];
    };
    amount: {
      value: number;
      currency: string;
    };
  }>;
}

export interface Total {
  category: {
    coding: Coding[];
  };
  amount: {
    value: number;
    currency: string;
  };
}

export interface Payment {
  date: string;
  amount: {
    value: number;
    currency: string;
  };
}

export interface ExplanationOfBenefit {
  resourceType: string;
  id: string;
  status: string;
  type: Type;
  use: string;
  patient: PatientRef;
  billablePeriod: BillablePeriod;
  created: string;
  insurer: Insurer;
  provider: Provider;
  outcome: string;
  disposition: string;
  careTeam: CareTeam[];
  item: Item[];
  total: Total[];
  payment: Payment;
}

export interface EOBEntry {
  fullUrl: string;
  resource: ExplanationOfBenefit;
  search: {
    mode: string;
  };
}

export interface EOBSearchResponse {
  resourceType: string;
  type: string;
  total: number;
  entry: EOBEntry[];
}