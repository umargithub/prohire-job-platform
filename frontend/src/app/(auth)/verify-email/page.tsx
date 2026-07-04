"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { resendVerification, verifyEmail } from "@/lib/api/auth";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { EMAIL_VERIFIED_KEY } from "@/lib/storage-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

// ── Token mode (/verify-email?token=...) ─────────────────────────────────────

function TokenVerification({ token }: { token: string }): JSX.Element {
  const router = useRouter();
  // Guards against React StrictMode's double effect invocation in dev. Not a
  // correctness mechanism — the backend consume is idempotent (200 on re-hit).
  const attempted = useRef(false);

  const { mutate, isError, isSuccess } = useMutation({
    mutationFn: () => verifyEmail(token),
    onSuccess: (data) => {
      // Broadcasts to a sibling "check your email" tab via the storage event.
      localStorage.setItem(EMAIL_VERIFIED_KEY, "true");
      if (data.message === "Email already verified.") {
        toast.info("Your email is already verified. Please sign in.");
        router.replace("/login");
        return;
      }
      toast.success("Email verified! You can now sign in.");
      setTimeout(() => router.push("/login"), 2000);
    },
  });

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    mutate();
  }, [mutate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isError && "Verification failed"}
          {isSuccess && "Email verified!"}
          {!isError && !isSuccess && "Verifying your email…"}
        </CardTitle>
        <CardDescription>
          {isError && "The link may have expired or already been used."}
          {isSuccess && "Redirecting you to login…"}
          {!isError &&
            !isSuccess &&
            "Please wait while we verify your email address."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

// ── Email mode (/verify-email?email=...) ─────────────────────────────────────

function PendingVerification({ email }: { email: string }): JSX.Element {
  const router = useRouter();
  const [rateLimited, setRateLimited] = useState(false);
  const { mounted, secondsLeft, canResend, markSent } = useResendCooldown();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === EMAIL_VERIFIED_KEY && e.newValue === "true") {
        toast.info("Your email has been verified. Please sign in.");
        router.replace("/login");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => resendVerification(email),
    onSuccess: (data: {
      message: string;
      alreadyVerified?: boolean;
      rateLimited?: boolean;
    }) => {
      if (data.alreadyVerified) {
        toast.info("Your email is already verified. Please sign in.");
        router.replace("/login");
        return;
      }
      if (data.rateLimited) {
        setRateLimited(true);
        return;
      }
      markSent();
      toast.success(
        "Verification email sent. Check your spam folder if you don't see it.",
      );
    },
    onError: () => {
      toast.error("Failed to resend. Please try again later.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to {email}.
        </CardDescription>
      </CardHeader>
      {mounted && (
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Didn&apos;t receive the email?
          </p>
          {rateLimited ? (
            <p className="text-sm text-muted-foreground text-center">
              Maximum resends reached. Please check your spam folder or contact
              support.
            </p>
          ) : (
            <Button
              className="w-full"
              variant="outline"
              disabled={!canResend || resending}
              onClick={() => resend()}
            >
              {resending
                ? "Sending…"
                : canResend
                  ? "Resend verification email"
                  : `Resend in ${secondsLeft}s`}
            </Button>
          )}
        </CardContent>
      )}
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VerifyEmailPage(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (token) return <TokenVerification token={token} />;
  if (email) return <PendingVerification email={email} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invalid link</CardTitle>
        <CardDescription>
          This verification link is missing required parameters.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
