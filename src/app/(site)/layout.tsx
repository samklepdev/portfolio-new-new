import React from "react";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
