import { CreateDoctorResponse, DoctorCreationTypes, HealthResponse, EpicPatientsResponse, PatientCreationTypes, SearchDoctorsResponse, startConversationPayload, UpdateDoctorResponse, EpicPractitioner, EpicDocumentReferenceResponse } from "../types";
import { API_BASE_URL_AISEARCH_MediNote, API_ROUTES } from "../../constants/api";
import { promises } from "dns";
const API_SERVICE = "https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net"

export class APIService {
  static async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${API_ROUTES}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response?.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  static async enrollVoice(speakerType: 'doctors' | 'patients', audioFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);

      const response = await fetch(`${API_SERVICE}/${speakerType}/register_voice`, {
        method: "POST",
        body: formData,
      });

      if (!response?.ok) {
        throw new Error(`Voice enrollment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  static generateSessionId(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `${timestamp}${randomString}`;
  }

  static async searchPatients(query: string): Promise<any> {
    try {
      const url = new URL(`${API_ROUTES.searchPatients}`);
      url.searchParams.append('query', query);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData)
      }
      return await response.json();
    } catch (error) {
      console.log('Search error:', error);
    }
  }

  static async startConversation(data:startConversationPayload): Promise<any>{
    try{
      const response = await fetch(`${API_BASE_URL_AISEARCH_MediNote}api/patients/${data?.patient_id}/start-conversation`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData)
      }

      return await response.json();
    }
    catch (error) {
      console.error('Registration error:', error);
    }
  }

static async SearchDoctor(
  text?: string | number | boolean, 
  limit: number = 500, 
  offset: number = 0
): Promise<SearchDoctorsResponse> {
  try {
    // Build the URL with proper encoding
    const url = new URL(`${API_SERVICE}/doctors/doctors/search`);
    
    // Only add query parameter if text has a meaningful value
    if (text !== undefined && text !== null && text !== '') {
      url.searchParams.append('q', String(text));
    }
    
    // Add pagination parameters
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Search doctors error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search doctors error:', error);
    throw error;
  }
}

  static async updateDoctor(doctorData: DoctorCreationTypes, doctorId: number): Promise<UpdateDoctorResponse> {
    try {
      const response = await fetch(`${API_SERVICE}/doctors/doctors/update/${doctorId}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
         credentials: 'include',
        body: JSON.stringify(doctorData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw error;
    }
  }

  static async createDoctor(doctorData: DoctorCreationTypes): Promise<CreateDoctorResponse> {
    try {
      const response = await fetch(`${API_SERVICE}/doctors/doctors/create`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(doctorData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating doctor:', error);
      throw error;
    }
  }

  static async registerPatient(patientData: PatientCreationTypes): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/patients/patients/create`, {
        method: "POST",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(patientData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

static async SearchPatient(text: string | number | boolean): Promise<any> {
  try {
    // Build the URL with proper encoding
    const url = new URL(`${API_SERVICE}/patients/patients/search`);
    
    // Only add query parameter if text has a meaningful value
    if (text !== undefined && text !== null && text !== '') {
      url.searchParams.append('query', String(text));
    }
    
    // Add pagination parameters
    url.searchParams.append('limit', '500');
    url.searchParams.append('offset', '0');

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Search error:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
}

  static async updatePatient(patientData: PatientCreationTypes, id:number): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/patients/patients/update/${id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(patientData) ,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData)
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
    }
  }

  static async enrollPatientVoice(id: number, audioFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('speaker_id', id.toString());
      formData.append('role', 'patient');
      formData.append('file', audioFile);

      const response = await fetch(`${API_SERVICE}/audio/enroll`, {
        method: "POST",
        body: formData,
        credentials: 'include',
        headers: {
          'accept': 'application/json',
        },
      });

      if (!response?.ok) {
        throw new Error(`Voice enrollment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  static async enrollDoctorVoice(id: number, audioFile: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      const response = await fetch(`${API_SERVICE}/doctors/doctors/register_voice/${id}`, {
        method: "POST",
        body: formData,
        credentials: 'include',
      });

      if (!response?.ok) {
        throw new Error(`Doctor voice enrollment failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  static async checkPatientVoiceExists(patientId: number): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/patients/patients/voice_exists?patient_id=${patientId}`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice exists check error:', error);
    }
  }

  static async startSession(patientId: number, doctorId: string| number) {
    try {
      const response = await fetch(`${API_SERVICE}/session/start?doctor_id=${doctorId}&patient_id=${patientId}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Session start failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Session start error:', error);
      throw error;
    }
  }

  static async endSession(sessionId: string | number): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/session/end?session_id=${sessionId}`, {
        method: "POST",
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Session end failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Session end error:', error);
      throw error;
    }
  }

  static async saveSummary(data: {
    doctor_id: number;
    patient_id: number;
    session_id: number;
    original_text: string;
    summary_text: string;
    edited_text?: string;
}): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/summary/summary/summary/save`, {
        method: "POST",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Save summary failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Save summary error:', error);
      throw error;
    }
  }

  static async getSummary(sessionId: number): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/summary/summary/summary/getf/${sessionId}`, {
        method: "GET",
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Get summary failed: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('Get summary error:', error);
      throw error;
    }
  }

  static async getSummaryById(sessionId: number): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/summary/summary/summary/get/${sessionId}`, {
        method: "GET",
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Get summary failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get summary error:', error);
      throw error;
    }
  }

  static async saveFinalSummary(data: { session_id: number}): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/summary/summary/summary/approve`, {
        method: "POST",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Save final summary failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Save final summary error:', error);
      throw error;
    }
  }

  static async editSummary(data: {summaryId: number, edited_text: string}): Promise<any> {
    try {
      const url = `${API_SERVICE}/summary/summary/summary/edit/${data.summaryId}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          summary_text: data.edited_text || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Edit summary failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Edit summary error:', error);
      throw error;
    }
  }

  static async generateSummary(full_text: string): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/summary/generate`, {
        method: "POST",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_text }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Summary generation failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Summary generation error:', error);
      throw error;
    }
  }

  static async getTranscript(sessionId: number): Promise<any> {
    try {
      const response = await fetch(
        `${API_SERVICE}/session/transcript/${sessionId}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Transcript fetch error data:', errorData);
        throw new Error(`Transcript fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Transcript fetch error:", error);
      throw error;
    }
  }

  static async getPatientHistory(patientId: number): Promise<any> {
    const response = await fetch(`${API_SERVICE}/patients/patients/history/${patientId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json'
      },
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  static async transcribeFromFile(formData:any): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/transcribe/from-file`, {
        method: "POST",
        body: formData,
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Transcription failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  static async downloadRecording(sessionId: string | number): Promise<{ blob: Blob, filename: string }> {
    try {
      const response = await fetch(
        `${API_SERVICE}/api/recordings/${sessionId}/download`,
        {
          method: 'GET',
          headers: {
            'accept': 'audio/wav',
          },
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      
      const contentDisposition = response.headers.get('content-disposition')
      let filename = `session_${sessionId}_recording.wav`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      return { blob, filename }
    } catch (error) {
      console.error('Download recording error:', error)
      throw error
    }
  }

  static async getRecordingInfo(sessionId: string | number): Promise<{
    session_id: number;
    exists: boolean;
    storage: string | null;
    blob_key: string | null;
    filename: string | null;
    filesize: number | null;
    web_url: string | null;
    download_url: string | null;
    absolute_path: string | null;
  }> {
    try {
      const response = await fetch(
        `${API_SERVICE}/api/recordings/${sessionId}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
          credentials: 'include',
        }
      )

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Recording info failed: ${response.status} ${text}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Get recording info error:', error)
      throw error
    }
  }

  static async getCurrentUser(): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
       const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  static async logout(): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/auth/logout`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Logout failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  static async searchPharmacy(query: string, limit = 10, source = 'combined'): Promise<any> {
    try {
      const url = new URL(`${API_SERVICE}/pharmacy/search`);
      url.searchParams.append('q', query);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('source', source);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Pharmacy search failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Pharmacy search error:', error);
      throw error;
    }
  }

  static async getDrugById(drugId: number | string): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/pharmacy/drug/${drugId}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Get drug by ID failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get drug by ID error:', error);
      throw error;
    }
  }

  static async getDrugByNdc(ndc: string): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/pharmacy/ndc/${ndc}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Get drug by NDC failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get drug by NDC error:', error);
      throw error;
    }
  }

  static async createMedication(data: {
    session_id: number;
    patient_id: number;
    doctor_id: number;
    query: string;
    rxcui: string;
    drug_name: string;
    ndc: string;
    source: string;
    payload: Record<string, any>;
  }): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/medications`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Create medication failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create medication error:', error);
      throw error;
    }
  }

    static async searchEpicPatients(tokenId: string): Promise<EpicPatientsResponse> {
  try {
    const response = await fetch(
      `${API_SERVICE}/epic/fhir/patients/demo-names?token_id=${tokenId}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch patients: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Epic patients search error:', error);
    throw error;
  }
}
  
  // Epic FHIR Practitioner API
  static async searchEpicPractitioner(practitionerId: string, tokenId: string): Promise<EpicPractitioner> {
    try {
      const response = await fetch(
        `${API_SERVICE}/epic/fhir/practitioner/${practitionerId}/name?token_id=${tokenId}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch practitioner: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Epic practitioner search error:', error);
      throw error;
    }
  }

  static async epicStartSession(patientId: string | number, practitionerId: string) {
    try {
      const response = await fetch(`${API_SERVICE}/session/start?epic_practitioner_id=${practitionerId}&epic_patient_id=${patientId}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.log(errorData);
        throw new Error(`Session start failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Session start error:', error);
      throw error;
    }
  }
  static async getEpicEncounters(tokenId: string, patientId: string, count: number = 50): Promise<any> {
    try {
      const url = new URL(`${API_SERVICE}/epic/fhir/encounters`);
      url.searchParams.append('token_id', tokenId);
      url.searchParams.append('patient_id', patientId);
      url.searchParams.append('count', count.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        },
          credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch encounters: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Epic encounters fetch error:', error);
      throw error;
    }
  }

static async createEpicDocumentReference(
  tokenId: string,
  patientId: string,
  encounterId: string,
  noteText: string,
): Promise<any> {
  try {
    const url = new URL(`${API_SERVICE}/epic/fhir/documentreference`);
    url.searchParams.append('token_id', tokenId);
    url.searchParams.append('patient_id', patientId);
    url.searchParams.append('encounter_id', encounterId);
    url.searchParams.append('title', 'Doctor Assistant Summary');
    url.searchParams.append('content_type', 'text/plain');
    url.searchParams.append('note_type_system', 'http://loinc.org');
    url.searchParams.append('note_type_code', '11506-3');
    url.searchParams.append('note_type_display', 'Progress note');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        note_text: noteText
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create document reference: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Epic document reference creation error:', error);
    throw error;
  }
}
  // In your APIService file (../service/api.ts)
static async saveToEpicDocumentReference(data: any): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const response = await fetch('/api/epic/fhir/documentreference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving to Epic DocumentReference:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to save to Epic DocumentReference' 
    };
  }
}




  static async getEpicDocumentReferences(
    tokenId: string, 
    patientId: string, 
    count: number = 100
  ): Promise<EpicDocumentReferenceResponse> {
    try {
      const response = await fetch(
        `https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net/epic/fhir/documentreference?token_id=${tokenId}&patient_id=${patientId}&count=${count}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch Epic documents: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Epic documents:', error);
      throw error;
    }
  }
  static async getEpicSession(): Promise<any> {
    try {
      const response = await fetch(`${API_SERVICE}/epic/auth/session`, {
        method: 'GET',
        credentials: "include",
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get Epic session: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Epic session:', error);
      throw error;
    }
  }
}