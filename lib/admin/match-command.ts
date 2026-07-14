import { z } from "zod";

const scoreSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

const finishCommandSchema = z
  .object({
    action: z.literal("finish"),
    scoreA: scoreSchema,
    scoreB: scoreSchema,
  })
  .refine(
    ({ scoreA, scoreB }) =>
      (scoreA === 2 && scoreB <= 1) ||
      (scoreB === 2 && scoreA <= 1),
    {
      message:
        "Kết quả BO3 phải là 2-0, 2-1, 1-2 hoặc 0-2.",
    },
  );

export const adminMatchCommandSchema =
  z.discriminatedUnion("action", [
    z.object({
      action: z.literal("start"),
    }),
    finishCommandSchema,
    z.object({
      action: z.literal("reset"),
    }),
  ]);

export type AdminMatchCommand = z.infer<
  typeof adminMatchCommandSchema
>;

export function commandToMatchUpdate(
  command: AdminMatchCommand,
): {
  status: "scheduled" | "live" | "finished";
  score_a: number | null;
  score_b: number | null;
} {
  switch (command.action) {
    case "start":
      return {
        status: "live",
        score_a: 0,
        score_b: 0,
      };
    case "finish":
      return {
        status: "finished",
        score_a: command.scoreA,
        score_b: command.scoreB,
      };
    case "reset":
      return {
        status: "scheduled",
        score_a: null,
        score_b: null,
      };
  }
}
