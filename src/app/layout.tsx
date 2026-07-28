import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KiroSpec Studio — AI Agent Pipeline",
  description:
    "Transform product ideas into validated architecture specs with 4 AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
