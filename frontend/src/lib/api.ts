import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/store/auth.store";
import type {
  ApiErrorDetail,
  ApiErrorResponse,
  LoginResponse,
} from "@/types/api";

export const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/v1";

let inFlightRefresh: Promise<LoginResponse> | null = null;

/**
 * Refreshes the session via the httpOnly refresh cookie.
 *
 * Single-flight: concurrent callers — the 401 response interceptor and the
 * AuthProvider bootstrap — share ONE in-flight request, so exactly one
 * POST /auth/refresh is ever active per tab. Without this, the two owners
 * could race the rotating refresh token.
 *
 * Uses a bare axios call (not `apiClient`) so it never re-triggers the
 * response interceptor's refresh-on-401 logic — this IS that building block.
 */
export function refreshSession(): Promise<LoginResponse> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = axios
    .post<{ success: true; data: LoginResponse }>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 5000 },
    )
    .then((res) => res.data.data)
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

/**
 * Extracts the typed error detail from a rejected axios request, if present.
 * Returns `undefined` for network errors or non-API error shapes.
 */
export function getApiError(err: unknown): ApiErrorDetail | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data && data.success === false) return data.error;
  }
  return undefined;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config;

    const url = originalRequest?.url ?? "";
    if (
      err.response?.status !== 401 ||
      !originalRequest ||
      url.includes("/auth/login") ||
      url.includes("/auth/refresh")
    ) {
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token as string}`;
        return apiClient.request(originalRequest);
      });
    }

    isRefreshing = true;

    try {
      const session = await refreshSession();
      useAuthStore.getState().setAuth(session.accessToken, session.user);
      processQueue(null, session.accessToken);
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return apiClient.request(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
