import { cleanup } from "@testing-library/react/pure";
import { afterEach, vi } from "vitest";

// Automatic cleanup after each test to unmount React trees
afterEach(() => {
  cleanup();
});

// Stub window.matchMedia with a no-op implementation
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })),
});

// Stub navigator.clipboard.writeText as a resolved Promise spy
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
});
