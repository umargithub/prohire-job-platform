import { z } from "zod";

export const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const LoginDto = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const ForgotPasswordDto = z.object({
  email: z.string().email(),
});

export const ResetPasswordDto = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

export const ResendVerificationDto = z.object({ email: z.string().email() });

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordDto>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordDto>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationDto>;
