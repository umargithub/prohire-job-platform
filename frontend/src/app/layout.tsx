import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../providers/query-provider";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
