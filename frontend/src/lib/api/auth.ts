import { apiClient } from "@/lib/api";
import type { LoginResponse, MessageResponse } from "@/types/api";

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<{ success: true; data: LoginResponse }>(
    "/auth/login",
    { email, password },
  );
  return data.data;
}

export async function registerCandidate(
  email: string,
  password: string,
): Promise<MessageResponse> {
  const { data } = await apiClient.post<{
    success: true;
    data: MessageResponse;
  }>("/auth/register/candidate", { email, password });
  return data.data;
}

export async function registerCompany(
  email: string,
  password: string,
): Promise<MessageResponse> {
  const { data } = await apiClient.post<{
    success: true;
    data: MessageResponse;
  }>("/auth/register/company", { email, password });
  return data.data;
}

export async function forgotPassword(email: string): Promise<MessageResponse> {
  const { data } = await apiClient.post<{
    success: true;
    data: MessageResponse;
  }>("/auth/forgot-password", { email });
  return data.data;
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<MessageResponse> {
  const { data } = await apiClient.post<{
    success: true;
    data: MessageResponse;
  }>("/auth/reset-password", { token, password });
  return data.data;
}

export async function resendVerification(
  email: string,
): Promise<MessageResponse> {
  const { data } = await apiClient.post<{
    success: true;
    data: MessageResponse;
  }>("/auth/resend-verification", { email });
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
