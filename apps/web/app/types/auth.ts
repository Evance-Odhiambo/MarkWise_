export interface Institution {
  id: string;
  name: string;
  apiUrl?: string;
}

export interface VerificationResponse {
  valid: boolean;
  name?: string;
  course?: string;
  error?: string;
}

export interface RegistrationResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface InstitutionListResponse {
  institutions: Institution[];
}
