export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  title: string;
  company: string;
  /**
   * Out of 5. Rendered as stars on the home page only — `/about` shows the
   * quotes unadorned, where two five-star ratings would read as decoration
   * rather than information.
   */
  rating: number;
  logo: { src: string; width: number; height: number };
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    id: "ultra",
    quote:
      "When we needed a website fast, Sam delivered what we needed in the time we needed it. From start to finish, all the features we needed to manage our social media presence were met.",
    name: "Xavier Chavaria",
    title: "Owner/Operator",
    company: "Ultra Demolition",
    rating: 5,
    logo: { src: "/images/logos/ud.png", width: 185, height: 111 },
  },
  {
    id: "deleon",
    quote:
      "I approached Sam with only a rough idea in mind and he helped me bring my idea to fruition. Sam helped with a logo, unique design & functional contact forms to keep up with customer demands.",
    name: "Martha DeLeon",
    title: "CEO",
    company: "DeLeon Safety Solutions",
    rating: 5,
    logo: { src: "/images/logos/dss-logo.png", width: 400, height: 340 },
  },
] as const;

export function getTestimonial(id: string): Testimonial {
  const found = TESTIMONIALS.find((testimonial) => testimonial.id === id);
  if (!found) {
    throw new Error(`Unknown testimonial id: ${id}`);
  }
  return found;
}
