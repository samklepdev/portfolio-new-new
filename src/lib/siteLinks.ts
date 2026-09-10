export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
] as const;

export const SOCIAL_LINKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/samuel-klepper-0435b5193/",
  },
  { id: "github", label: "GitHub", href: "https://github.com/samklepdev" },
] as const;

export type SocialId = (typeof SOCIAL_LINKS)[number]["id"];

export const RESUME_URL = "/images/documents/samuel-klepper-resume.pdf";

export const EMAIL = "hello@samklep.dev";
