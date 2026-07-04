import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProHire. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link
              href="/jobs"
              className="hover:text-foreground transition-colors"
            >
              Browse Jobs
            </Link>
            <Link
              href="/register/candidate"
              className="hover:text-foreground transition-colors"
            >
              For Candidates
            </Link>
            <Link
              href="/register/company"
              className="hover:text-foreground transition-colors"
            >
              For Companies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
