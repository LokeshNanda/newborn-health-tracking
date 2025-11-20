export type Gender = "MALE" | "FEMALE" | "OTHER";

export type VaccineStatus = "PENDING" | "COMPLETED";

export interface UserRead {
  email: string;
  id: string;
  created_at: string;
  full_name?: string | null;
  google_sub?: string | null;
}

export interface UserRegister {
  email: string;
  password: string;
  full_name?: string | null;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface AuthResponse {
  access_token: string;
  token_type?: string;
  user: UserRead;
}

export interface ChildBase {
  name: string;
  dob: string;
  gender: Gender;
  blood_type?: string | null;
}

export interface ChildCreate extends ChildBase {
  parent_id: string;
}

export interface ChildRead extends ChildBase {
  id: string;
  parent_id: string;
  created_at: string;
}

export interface ChildUpdate {
  name?: string | null;
  dob?: string | null;
  gender?: Gender | null;
  blood_type?: string | null;
}

export interface GrowthLogCreate {
  record_date: string;
  weight_kg: number;
  height_cm: number;
  child_id: string;
}

export interface GrowthLogRead {
  record_date: string;
  weight_kg: number;
  height_cm: number;
  id: string;
  child_id: string;
}

export interface MedicationLogCreate {
  medicine_name: string;
  dosage?: string | null;
  administered_at: string;
  child_id: string;
}

export interface MedicationLogRead {
  medicine_name: string;
  dosage?: string | null;
  administered_at: string;
  id: string;
  child_id: string;
}

export interface VaccineRecordCreate {
  vaccine_name: string;
  scheduled_date: string;
  status: VaccineStatus;
  child_id: string;
}

export interface VaccineRecordRead {
  vaccine_name: string;
  scheduled_date: string;
  status: VaccineStatus;
  id: string;
  child_id: string;
}
