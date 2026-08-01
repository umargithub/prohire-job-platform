"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheckIcon } from "lucide-react";
import { logout, resetPassword } from "@/lib/api/auth";
import { getApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { broadcastLogout } from "@/lib/auth-broadcast";
import { toast } from "sonner";
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
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

/**
 * Resetting a password proves ownership of the reset link, not identity of
 * the caller — like /verify-email, this is session-independent. So on
 * success we never navigate (a logged-in browser would just get bounced
 * back by GuestGuard on /login); we render the final state in place and let
 * the user decide what to do about whatever session already exists here.
 */
function ResetResult(): JSX.Element {
  const { user, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      broadcastLogout();
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CircleCheckIcon className="size-5 text-foreground" />
          <CardTitle>Password reset</CardTitle>
        </div>
        <CardDescription>Your password has been changed.</CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re currently signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
            If the password you just reset belongs to a different account, sign
            out first and then sign in with the new password.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign in with your new password.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {user ? (
          <Button
            className="w-full"
            variant="outline"
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </Button>
        ) : (
          <Button className="w-full" render={<Link href="/login" />}>
            Sign in
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function ResetPasswordContent(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending, isSuccess } = useMutation({
    mutationFn: (values: FormValues) =>
      resetPassword(token ?? "", values.password),
    onError: (err: unknown) => {
      toast.error(
        getApiError(err)?.message ?? "Reset failed. The link may have expired.",
      );
    },
  });

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/forgot-password"
            className="text-sm text-foreground hover:underline"
          >
            Request a new reset link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (isSuccess) return <ResetResult />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>
          Choose a strong password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="reset-form"
          onSubmit={handleSubmit((v) => mutate(v))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
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
            <Label htmlFor="confirmPassword">Confirm new password</Label>
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
          form="reset-form"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Set new password"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          <Link href="/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
