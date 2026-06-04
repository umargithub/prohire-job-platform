import { AuthGuard } from '@/components/auth/auth-guard';

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <AuthGuard role="candidate">{children}</AuthGuard>;
}
