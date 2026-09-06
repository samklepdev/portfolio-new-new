import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sam Klepper",
  description: "Full-stack engineer — TypeScript, React, C#",
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