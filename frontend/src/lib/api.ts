import axios, { type AxiosError } from "axios";
import { useAuthStore } from "../store/auth.store";

export const apiClient = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/api/v1",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      try {
        const { data } = await axios.post<{
          accessToken: string;
          user: { id: string; email: string; role: string };
        }>(
          (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") +
            "/api/v1/auth/refresh",
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setAuth(data.accessToken, data.user);
        if (err.config) {
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient.request(err.config);
        }
      } catch {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  },
);
