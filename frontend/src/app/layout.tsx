import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../providers/query-provider";

export const metadata: Metadata = {
  title: "ProHire — Find Your Next Opportunity",
  description: "Production-grade job board connecting top companies with great candidates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
