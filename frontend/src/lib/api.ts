import axios, { type AxiosError } from "axios";
import { useAuthStore, type AuthUser } from "@/store/auth.store";

export const apiClient = axios.create({
  baseURL:
    (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/v1",
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
      const { data } = await axios.post<{
        accessToken: string;
        user: AuthUser;
      }>(
        (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") +
          "/api/v1/auth/refresh",
        {},
        { withCredentials: true },
      );
      useAuthStore.getState().setAuth(data.accessToken, data.user);
      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
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
