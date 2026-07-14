import {
  describe,
  expect,
  it,
} from "vitest";

import {
  adminMatchCommandSchema,
  commandToMatchUpdate,
} from "./match-command";

describe("admin match commands", () => {
  it("accepts all four valid BO3 results", () => {
    for (const [scoreA, scoreB] of [
      [2, 0],
      [2, 1],
      [1, 2],
      [0, 2],
    ] as const) {
      expect(
        adminMatchCommandSchema.safeParse({
          action: "finish",
          scoreA,
          scoreB,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects impossible BO3 results", () => {
    for (const [scoreA, scoreB] of [
      [0, 0],
      [1, 1],
      [2, 2],
      [1, 0],
    ] as const) {
      expect(
        adminMatchCommandSchema.safeParse({
          action: "finish",
          scoreA,
          scoreB,
        }).success,
      ).toBe(false);
    }
  });

  it("maps start to a live 0-0 state", () => {
    expect(
      commandToMatchUpdate({
        action: "start",
      }),
    ).toEqual({
      status: "live",
      score_a: 0,
      score_b: 0,
    });
  });

  it("maps reset to a clean scheduled state", () => {
    expect(
      commandToMatchUpdate({
        action: "reset",
      }),
    ).toEqual({
      status: "scheduled",
      score_a: null,
      score_b: null,
    });
  });
});
