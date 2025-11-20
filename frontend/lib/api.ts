import axios from "axios";
import { API_BASE_URL, AUTH_STORAGE_KEY } from "./constants";
import type {
  AuthResponse,
  ChildCreate,
  ChildRead,
  GoogleLoginRequest,
  GrowthLogCreate,
  GrowthLogRead,
  UserLogin,
  UserRead,
  UserRegister,
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
