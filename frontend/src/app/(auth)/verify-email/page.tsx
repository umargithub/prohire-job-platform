"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { resendVerification } from '@/lib/api/auth';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

type VerifyState = 'verifying' | 'success' | 'error' | 'pending';

export default function VerifyEmailPage(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'pending');
  const { secondsLeft, canResend, markSent } = useResendCooldown();

  useEffect(() => {
    if (!token) return;
    apiClient.get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setState('success');
        toast.success('Email verified! You can now sign in.');
        setTimeout(() => router.push('/login'), 2000);
      })
      .catch(() => {
        setState('error');
      });
  }, [token, router]);

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: () => resendVerification(email ?? ''),
    onSuccess: () => {
      markSent();
      toast.success('Verification email sent.');
    },
    onError: () => {
      toast.error('Failed to resend. Please try again later.');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {state === 'verifying' && 'Verifying your email…'}
          {state === 'success' && 'Email verified!'}
          {state === 'error' && 'Verification failed'}
          {state === 'pending' && 'Check your email'}
        </CardTitle>
        <CardDescription>
          {state === 'verifying' && 'Please wait while we verify your email address.'}
          {state === 'success' && 'Redirecting you to login…'}
          {state === 'error' && 'The link may have expired or already been used.'}
          {state === 'pending' && `We sent a verification link to ${email ?? 'your email'}.`}
        </CardDescription>
      </CardHeader>

      {(state === 'error' || state === 'pending') && email && (
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Didn&apos;t receive the email?</p>
          <Button
            className="w-full"
            variant="outline"
            disabled={!canResend || resending}
            onClick={() => resend()}
          >
            {resending
              ? 'Sending…'
              : canResend
              ? 'Resend verification email'
              : `Resend in ${secondsLeft}s`}
          </Button>
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
