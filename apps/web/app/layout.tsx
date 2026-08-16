import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Songforge OS — BLAIZE SUNDAY",
  description: "Supervised autonomous artist operations for BLAIZE SUNDAY."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
