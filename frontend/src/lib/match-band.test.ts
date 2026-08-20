import { describe, expect, it } from "vitest";
import { matchBand } from "./match-band";

describe("matchBand", () => {
  it("labels scores honestly instead of always saying Strong match", () => {
    expect(matchBand(92).label).toBe("Strong match");
    expect(matchBand(85).label).toBe("Strong match");
    expect(matchBand(70).label).toBe("Good match");
    expect(matchBand(50).label).toBe("Partial match");
    expect(matchBand(49).label).toBe("Weak match");
    expect(matchBand(12).label).toBe("Weak match");
  });
});
