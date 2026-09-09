import { TESTIMONIALS, getTestimonial } from "@/lib/testimonials";

describe("testimonials", () => {
  it("carries both attributable testimonials", () => {
    expect(TESTIMONIALS).toHaveLength(2);
  });

  it("attributes every testimonial to a named person and company", () => {
    for (const testimonial of TESTIMONIALS) {
      expect(testimonial.name.length).toBeGreaterThan(0);
      expect(testimonial.title.length).toBeGreaterThan(0);
      expect(testimonial.company.length).toBeGreaterThan(0);
      expect(testimonial.quote.length).toBeGreaterThan(0);
    }
  });

  it("looks a testimonial up by id", () => {
    expect(getTestimonial("deleon").name).toBe("Martha DeLeon");
    expect(getTestimonial("ultra").name).toBe("Xavier Chavaria");
  });

  it("throws on an unknown id rather than rendering nothing", () => {
    expect(() => getTestimonial("nope")).toThrow();
  });

  it("carries a rating in range for the home page star row", () => {
    for (const testimonial of TESTIMONIALS) {
      expect(testimonial.rating).toBeGreaterThanOrEqual(1);
      expect(testimonial.rating).toBeLessThanOrEqual(5);
      expect(Number.isInteger(testimonial.rating)).toBe(true);
    }
  });
});
