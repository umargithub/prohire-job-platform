/**
 * Same centered-card chrome as (auth), but for routes whose action is
 * independent of the current session — token-based operations that prove
 * possession of something (an email inbox), not identity of the caller. They
 * must render and succeed no matter what's logged into this browser, so
 * unlike (auth) this layout is intentionally not wrapped in GuestGuard.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
