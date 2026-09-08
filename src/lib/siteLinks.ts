/**
 * Every link the site publishes about itself, in one place.
 *
 * These were previously duplicated — the resume path lived in both `Header.tsx`
 * and `src/app/contact/page.tsx`, so renaming the PDF would have broken one and
 * not the other. Adding a footer would have made a third copy. Import from here
 * rather than re-declaring.
 */

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
] as const;

/**
 * `id` exists so consumers can pair a link with its icon by a stable key
 * instead of matching on the display label, which is copy and may change.
 */
export const SOCIAL_LINKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/samuel-klepper-0435b5193/",
  },
  { id: "github", label: "GitHub", href: "https://github.com/samklepdev" },
  { id: "gitlab", label: "GitLab", href: "https://gitlab.com/bklep" },
] as const;

export type SocialId = (typeof SOCIAL_LINKS)[number]["id"];

export const RESUME_URL = "/images/documents/samuel-klepper-resume.pdf";

/**
 * The published contact address. The old site used sam@samklepper.com; this one
 * is the confirmed working address and must stay in step with the contact form's
 * CONTACT_TO_EMAIL default.
 */
export const EMAIL = "hello@samklep.dev";
