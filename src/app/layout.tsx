import React from "react";
import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import "./toast.css";
import { getActiveTheme, getPublicThemes } from "@/db/queries";
import { themeToStyle, toPublicTheme } from "@/lib/themeStyle";
import { buildThemeBootScript } from "@/lib/themeBoot";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sam Klepper",
  description: "Full-stack engineer — TypeScript, React, C#",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTheme, publicRows] = await Promise.all([getActiveTheme(), getPublicThemes()]);
  const publicThemes = publicRows.map(toPublicTheme);

  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      style={themeToStyle(activeTheme) as React.CSSProperties}
    >
      <body>
        <script
          id="__themes__"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(publicThemes).replace(/</g, "\\u003c") }}
        />
        <script dangerouslySetInnerHTML={{ __html: buildThemeBootScript() }} />
        {children}
        <ToastContainer theme="dark" position="bottom-right" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
