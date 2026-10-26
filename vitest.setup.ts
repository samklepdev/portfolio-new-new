import "@testing-library/jest-dom/vitest";

// jsdom under vitest does not provide Web Storage, so components that read or
// write localStorage (e.g. AdminShell's persisted collapse state) have nothing
// to talk to. Install a minimal in-memory Storage so those code paths — and the
// tests that assert on them — run against a real API.
if (typeof window !== "undefined" && !window.localStorage) {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length() {
      return this.store.size;
    }
    clear() {
      this.store.clear();
    }
    getItem(key: string) {
      return this.store.has(key) ? this.store.get(key)! : null;
    }
    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null;
    }
    removeItem(key: string) {
      this.store.delete(key);
    }
    setItem(key: string, value: string) {
      this.store.set(key, String(value));
    }
  }
  Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });
  Object.defineProperty(window, "sessionStorage", { value: new MemoryStorage(), configurable: true });
}
