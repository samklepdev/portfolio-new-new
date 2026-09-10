import { CONTACT_EMAIL, RESUME_URL, SOCIAL_LINKS } from "@/lib/siteLinks";

describe("siteLinks", () => {
  it("exposes the samklep.dev address", () => {
    expect(CONTACT_EMAIL).toBe("contact@samklep.dev");
  });

  it("points the resume at the committed PDF", () => {
    expect(RESUME_URL).toBe("/images/documents/samuel-klepper-resume.pdf");
  });

  it("includes a GitHub link", () => {
    const ids = SOCIAL_LINKS.map((link) => link.id);
    expect(ids).toContain("github");
  });

  it("no longer surfaces GitLab", () => {
    const ids = SOCIAL_LINKS.map((link) => link.id);
    expect(ids).not.toContain("gitlab");
    expect(ids).toEqual(["linkedin", "github"]);
  });
});
