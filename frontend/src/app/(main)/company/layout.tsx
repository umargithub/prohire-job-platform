import { AuthGuard } from "@/components/auth/auth-guard";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <AuthGuard role="company">{children}</AuthGuard>;
}
