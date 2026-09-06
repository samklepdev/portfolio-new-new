export function HeroStaticFallback() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -10,
        background:
          "radial-gradient(circle at 50% 40%, rgba(0,240,255,0.15), transparent 60%), " +
          "radial-gradient(circle at 30% 70%, rgba(255,46,151,0.08), transparent 55%), " +
          "#0B0E14",
      }}
    />
  );
}
