"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import { CircleCheckIcon } from "lucide-react";
import { logout, resendVerification, verifyEmail } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth.store";
import { broadcastLogout } from "@/lib/auth-broadcast";
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

/**
 * Verification proves ownership of an email, not identity of the caller —
 * the backend endpoint isn't tied to the request's session at all. So this
 * page never redirects based on (or into) auth state: it renders whatever
 * session already exists in this browser and lets the user decide the next
 * step, instead of guessing and silently bouncing them somewhere confusing.
 */
function VerifiedResult({
  alreadyVerified,
}: {
  alreadyVerified: boolean;
}): JSX.Element {
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
          <CardTitle>
            {alreadyVerified ? "Already verified" : "Email verified"}
          </CardTitle>
        </div>
        <CardDescription>
          {alreadyVerified
            ? "This email address was already confirmed."
            : "This email address is now confirmed."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <p className="text-sm text-muted-foreground">
            You&apos;re currently signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
            If you want to use the account you just verified, sign out first and
            then sign in with that account.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your account is ready.
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

// ── Token mode (/verify-email?token=...) ─────────────────────────────────────

function TokenVerification({ token }: { token: string }): JSX.Element {
  const { mutate, isPending, isError, isSuccess, data, error } = useMutation({
    mutationFn: () => verifyEmail(token),
    onSuccess: () => {
      // Broadcasts to a sibling "check your email" tab via the storage event.
      localStorage.setItem(EMAIL_VERIFIED_KEY, "true");
    },
  });

  // A 400 is a definitive token error (invalid / expired / already used) —
  // retrying can't change the outcome. Anything else (network, timeout, 5xx)
  // is transient, so keep the button available for an inline retry.
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const isTokenError = status === 400;

  if (isSuccess) {
    return (
      <VerifiedResult
        alreadyVerified={data.message === "Email already verified."}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isError ? "Verification failed" : "Confirm your email"}
        </CardTitle>
        <CardDescription>
          {isError
            ? isTokenError
              ? "The link may have expired or already been used."
              : "Something went wrong. Please try again."
            : "Click the button below to verify your email address."}
        </CardDescription>
      </CardHeader>
      {(!isError || !isTokenError) && (
        <CardContent>
          {/* Verification is an explicit user action (POST), never auto-fired on
              load, so email link scanners and prefetchers can't consume the token. */}
          <Button
            className="w-full"
            onClick={() => mutate()}
            disabled={isPending}
          >
            {isPending
              ? "Verifying…"
              : isError
                ? "Try again"
                : "Verify my email"}
          </Button>
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

// ── Email mode (/verify-email?email=...) ─────────────────────────────────────

function PendingVerification({ email }: { email: string }): JSX.Element {
  const [verifiedElsewhere, setVerifiedElsewhere] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const { user } = useAuthStore();
  const { mounted, secondsLeft, canResend, markSent } = useResendCooldown();

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === EMAIL_VERIFIED_KEY && e.newValue === "true") {
        setVerifiedElsewhere(true);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => resendVerification(email),
    onSuccess: (data: {
      message: string;
      alreadyVerified?: boolean;
      rateLimited?: boolean;
    }) => {
      if (data.alreadyVerified) {
        setVerifiedElsewhere(true);
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

  if (verifiedElsewhere) return <VerifiedResult alreadyVerified={false} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to {email}.
        </CardDescription>
      </CardHeader>
      {mounted && (
        <CardContent className="flex flex-col gap-3">
          {user && (
            <p className="text-xs text-muted-foreground">
              You&apos;re currently signed in as{" "}
              <span className="font-medium text-foreground">{user.email}</span>.
              That session is unaffected by this verification.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
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

function VerifyEmailContent(): JSX.Element {
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

export default function VerifyEmailPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
