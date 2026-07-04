import { GuestGuard } from "@/components/auth/auth-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <GuestGuard>
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </GuestGuard>
  );
}
