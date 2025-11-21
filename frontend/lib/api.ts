import axios from "axios";
import { API_BASE_URL, AUTH_STORAGE_KEY } from "./constants";
import type {
  AuthResponse,
  ChildCreate,
  ChildRead,
  GoogleLoginRequest,
  GrowthLogCreate,
  GrowthLogRead,
  GrowthLogUpdate,
  MedicationLogCreate,
  MedicationLogRead,
  MedicationLogUpdate,
  UserLogin,
  UserRead,
  UserRegister,
  VaccineRecordCreate,
  VaccineRecordRead,
  VaccineRecordUpdate,
} from "./types";

export interface StoredAuth {
  token: string;
  user: UserRead;
}

const getStoredAuth = (): StoredAuth | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

export const loginUser = async (payload: UserLogin) => {
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/login", payload);
  return data;
};

export const registerUser = async (payload: UserRegister) => {
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/register", payload);
  return data;
};

export const googleLogin = async (payload: GoogleLoginRequest) => {
  const { data } = await apiClient.post<AuthResponse>("/api/v1/auth/google", payload);
  return data;
};

export const getChildren = async () => {
  const { data } = await apiClient.get<ChildRead[]>("/api/v1/children/");
  return data;
};

export const createChild = async (payload: ChildCreate) => {
  const { data } = await apiClient.post<ChildRead>("/api/v1/children/", payload);
  return data;
};

export const getGrowthLogs = async (childId?: string) => {
  const { data } = await apiClient.get<GrowthLogRead[]>("/api/v1/health/growth", {
    params: childId ? { child_id: childId } : undefined,
  });
  return data;
};

export const createGrowthLog = async (payload: GrowthLogCreate) => {
  const { data } = await apiClient.post<GrowthLogRead>("/api/v1/health/growth", payload);
  return data;
};

export const updateGrowthLog = async (id: string, payload: GrowthLogUpdate) => {
  const { data } = await apiClient.put<GrowthLogRead>(`/api/v1/health/growth/${id}`, payload);
  return data;
};

export const getMedicationLogs = async (childId?: string) => {
  const { data } = await apiClient.get<MedicationLogRead[]>("/api/v1/health/medications", {
    params: childId ? { child_id: childId } : undefined,
  });
  return data;
};

export const createMedicationLog = async (payload: MedicationLogCreate) => {
  const { data } = await apiClient.post<MedicationLogRead>("/api/v1/health/medications", payload);
  return data;
};

export const updateMedicationLog = async (id: string, payload: MedicationLogUpdate) => {
  const { data } = await apiClient.put<MedicationLogRead>(`/api/v1/health/medications/${id}`, payload);
  return data;
};

export const downloadMedicationLogsPdf = async (childId: string) => {
  const { data } = await apiClient.get<Blob>("/api/v1/health/medications/export/pdf", {
    params: { child_id: childId },
    responseType: "blob",
  });
  return data;
};

export const getVaccineRecords = async (childId?: string) => {
  const { data } = await apiClient.get<VaccineRecordRead[]>("/api/v1/health/vaccines", {
    params: childId ? { child_id: childId } : undefined,
  });
  return data;
};

export const createVaccineRecord = async (payload: VaccineRecordCreate) => {
  const { data } = await apiClient.post<VaccineRecordRead>("/api/v1/health/vaccines", payload);
  return data;
};

export const updateVaccineRecord = async (id: string, payload: VaccineRecordUpdate) => {
  const { data } = await apiClient.put<VaccineRecordRead>(`/api/v1/health/vaccines/${id}`, payload);
  return data;
};
