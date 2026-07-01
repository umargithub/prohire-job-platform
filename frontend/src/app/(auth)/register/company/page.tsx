"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerCompany } from '@/lib/api/auth';
import { initResendState } from '@/hooks/use-resend-cooldown';
import { useAuthStore, useAuthInitialized } from '@/store/auth.store';
import { ROLE_REDIRECTS } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export default function RegisterCompanyPage(): JSX.Element | null {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const hydrated = useAuthInitialized();

  useEffect(() => {
    if (!hydrated || !accessToken || !user) return;
    router.replace(ROLE_REDIRECTS[user.role]);
  }, [hydrated, accessToken, user, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormValues) => registerCompany(values.email, values.password),
    onSuccess: (_, variables) => {
      initResendState();
      toast.success('Account created! Please check your email to verify.');
      router.push(`/verify-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Registration failed';
      toast.error(message);
    },
  });

  if (!hydrated) return null;
  if (accessToken && user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create company account</CardTitle>
        <CardDescription>Start hiring on ProHire.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="register-company-form" onSubmit={handleSubmit((v) => mutate(v))} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" placeholder="you@company.com" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Min 8 characters" aria-invalid={!!errors.password} {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" placeholder="••••••••" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button type="submit" form="register-company-form" className="w-full" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground hover:underline">Sign in</Link>
        </p>
        <p className="text-xs text-muted-foreground text-center">
          Looking for a job?{' '}
          <Link href="/register/candidate" className="text-foreground hover:underline">Register as candidate</Link>
        </p>
      </CardFooter>
    </Card>
  );
}
