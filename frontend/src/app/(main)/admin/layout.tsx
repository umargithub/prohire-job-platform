import { AdminGuard } from '@/components/auth/auth-guard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <AdminGuard>{children}</AdminGuard>;
}
