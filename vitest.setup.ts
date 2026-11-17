import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `server-only` throws when imported outside a React Server environment.
// Unit tests exercise server modules directly, so stub it out.
vi.mock("server-only", () => ({}));

afterEach(() => {
  cleanup();
});
