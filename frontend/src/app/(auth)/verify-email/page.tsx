"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { resendVerification } from '@/lib/api/auth';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

type TokenState = 'verifying' | 'success' | 'error';

// ── Token mode (/verify-email?token=...) ─────────────────────────────────────

function TokenVerification({ token }: { token: string }): JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<TokenState>('verifying');

  useEffect(() => {
    apiClient.get<{ message: string }>(`/auth/verify-email?token=${token}`)
      .then(({ data }) => {
        if (data.message === 'Email already verified.') {
          toast.info('Your email is already verified. Please sign in.');
          router.replace('/login');
          return;
        }
        localStorage.setItem('prohire:email-verified', 'true');
        setState('success');
        toast.success('Email verified! You can now sign in.');
        setTimeout(() => router.push('/login'), 2000);
      })
      .catch(() => setState('error'));
  }, [token, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {state === 'verifying' && 'Verifying your email…'}
          {state === 'success' && 'Email verified!'}
          {state === 'error' && 'Verification failed'}
        </CardTitle>
        <CardDescription>
          {state === 'verifying' && 'Please wait while we verify your email address.'}
          {state === 'success' && 'Redirecting you to login…'}
          {state === 'error' && 'The link may have expired or already been used.'}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground hover:underline">Back to sign in</Link>
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
      if (e.key === 'prohire:email-verified' && e.newValue === 'true') {
        toast.info('Your email has been verified. Please sign in.');
        router.replace('/login');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router]);

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => resendVerification(email),
    onSuccess: (data: { message: string; alreadyVerified?: boolean; rateLimited?: boolean }) => {
      if (data.alreadyVerified) {
        toast.info('Your email is already verified. Please sign in.');
        router.replace('/login');
        return;
      }
      if (data.rateLimited) {
        setRateLimited(true);
        return;
      }
      markSent();
      toast.success('Verification email sent. Check your spam folder if you don\'t see it.');
    },
    onError: () => {
      toast.error('Failed to resend. Please try again later.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
        <CardDescription>We sent a verification link to {email}.</CardDescription>
      </CardHeader>
      {mounted && (
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Didn&apos;t receive the email?</p>
          {rateLimited ? (
            <p className="text-sm text-muted-foreground text-center">
              Maximum resends reached. Please check your spam folder or contact support.
            </p>
          ) : (
            <Button
              className="w-full"
              variant="outline"
              disabled={!canResend || resending}
              onClick={() => resend()}
            >
              {resending ? 'Sending…' : canResend ? 'Resend verification email' : `Resend in ${secondsLeft}s`}
            </Button>
          )}
        </CardContent>
      )}
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground hover:underline">Back to sign in</Link>
        </p>
      </CardFooter>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function VerifyEmailPage(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (token) return <TokenVerification token={token} />;
  if (email) return <PendingVerification email={email} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invalid link</CardTitle>
        <CardDescription>This verification link is missing required parameters.</CardDescription>
      </CardHeader>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          <Link href="/login" className="text-foreground hover:underline">Back to sign in</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
