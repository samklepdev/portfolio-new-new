import { HeroLogoFlight } from "@/components/hero/HeroLogoFlight";
import { HeroSection } from "@/components/hero/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { ClientBand } from "@/components/home/ClientBand";
import { ContactSection } from "@/components/home/ContactSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { getFeaturedProjects } from "@/db/queries";
import ProjectsSection from "@/app/ProjectsSection";

export const revalidate = 60;

export default async function Home() {
  const projects = await getFeaturedProjects();

  return (
    <main>
        <HeroSection/>
        <HeroLogoFlight/>
        <ClientBand/>
        <AboutSection/>
        <ServicesSection/>
        <ProjectsSection projects={projects}/>
        <ContactSection/>
    </main>
  );
}
