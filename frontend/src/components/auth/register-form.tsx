"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerCandidate, registerCompany } from "@/lib/api/auth";
import { getApiError } from "@/lib/api";
import { RESEND_SENT_AT_KEY } from "@/lib/storage-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const schema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

type RegisterRole = "candidate" | "company";

interface RoleConfig {
  register: (email: string, password: string) => Promise<{ message: string }>;
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  formId: string;
  crossLinkPrompt: string;
  crossLinkHref: string;
  crossLinkLabel: string;
}

const ROLE_CONFIG: Record<RegisterRole, RoleConfig> = {
  candidate: {
    register: registerCandidate,
    title: "Create candidate account",
    description: "Start applying to jobs on ProHire.",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    formId: "register-candidate-form",
    crossLinkPrompt: "Registering a company?",
    crossLinkHref: "/register/company",
    crossLinkLabel: "Register as company",
  },
  company: {
    register: registerCompany,
    title: "Create company account",
    description: "Start hiring on ProHire.",
    emailLabel: "Work email",
    emailPlaceholder: "you@company.com",
    formId: "register-company-form",
    crossLinkPrompt: "Looking for a job?",
    crossLinkHref: "/register/candidate",
    crossLinkLabel: "Register as candidate",
  },
};

export function RegisterForm({ role }: { role: RegisterRole }): JSX.Element {
  const router = useRouter();
  const config = ROLE_CONFIG[role];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormValues) =>
      config.register(values.email, values.password),
    onSuccess: (_, variables) => {
      // Keep in sync with useResendCooldown's markSent (shared encoding).
      localStorage.setItem(RESEND_SENT_AT_KEY, String(Date.now()));
      toast.success("Account created! Please check your email to verify.");
      router.push(`/verify-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (err: unknown) => {
      toast.error(getApiError(err)?.message ?? "Registration failed");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id={config.formId}
          onSubmit={handleSubmit((v) => mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{config.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              placeholder={config.emailPlaceholder}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          type="submit"
          form={config.formId}
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          {config.crossLinkPrompt}{" "}
          <Link
            href={config.crossLinkHref}
            className="text-foreground hover:underline"
          >
            {config.crossLinkLabel}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
