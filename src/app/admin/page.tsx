import LogoutButton from "./LogoutButton";

export default function AdminHome() {
  return (
    <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ marginTop: 0 }}>Admin</h1>
      <p>You are signed in. The dashboard lands in Phase 3.</p>
      <LogoutButton />
    </main>
  );
}
