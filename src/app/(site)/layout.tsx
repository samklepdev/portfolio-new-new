import React from "react";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { getPublicThemes } from "@/db/queries";
import { toPublicTheme } from "@/lib/themeStyle";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const publicThemes = (await getPublicThemes()).map(toPublicTheme);
  return (
    <>
      <Header publicThemes={publicThemes} />
      {children}
      <Footer />
    </>
  );
}
