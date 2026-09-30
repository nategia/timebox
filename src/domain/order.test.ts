import { describe, expect, it } from "vitest";
import { dropIndex } from "./order";

describe("dropIndex", () => {
  it("moves up", () => expect(dropIndex(3, 0)).toBe(0));
  it("moves down past itself", () => expect(dropIndex(0, 3)).toBe(2));
  it("dropping on its own gap is a no-op", () => {
    expect(dropIndex(2, 2)).toBe(2);
    expect(dropIndex(2, 3)).toBe(2);
  });
});
