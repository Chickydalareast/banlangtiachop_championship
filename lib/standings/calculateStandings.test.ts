import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateStandings,
} from "./calculateStandings";
import type {
  StandingMatch,
  StandingRow,
  StandingTeam,
} from "./standings.types";

function makeTeams(
  teamNames: readonly string[],
): StandingTeam[] {
  return teamNames.map(
    (name, index) => ({
      id: name,
      name,
      displayOrder:
        teamNames.length - index,
    }),
  );
}

function finished(
  teamAId: string,
  teamBId: string,
  scoreA: number,
  scoreB: number,
): StandingMatch {
  return {
    id: `${teamAId}-${teamBId}`,
    teamAId,
    teamBId,
    scoreA,
    scoreB,
    status: "finished",
  };
}

function scheduled(
  teamAId: string,
  teamBId: string,
): StandingMatch {
  return {
    id: `${teamAId}-${teamBId}`,
    teamAId,
    teamBId,
    scoreA: null,
    scoreB: null,
    status: "scheduled",
  };
}

function calculate(
  teamNames: readonly string[],
  matches: readonly StandingMatch[],
  qualificationCount = 6,
): StandingRow[] {
  return calculateStandings(
    makeTeams(teamNames),
    matches,
    {
      qualificationCount,
    },
  );
}

function getRow(
  rows: readonly StandingRow[],
  teamId: string,
): StandingRow {
  const row = rows.find(
    (candidate) =>
      candidate.teamId === teamId,
  );

  if (!row) {
    throw new Error(
      `Missing row for ${teamId}`,
    );
  }

  return row;
}

describe(
  "calculateStandings",
  () => {
    it(
      "orders teams by points first",
      () => {
        const rows = calculate(
          ["A", "B", "C"],
          [
            finished(
              "A",
              "B",
              2,
              0,
            ),
          ],
        );

        expect(
          rows.map(
            (row) => row.teamId,
          ),
        ).toEqual([
          "A",
          "C",
          "B",
        ]);
      },
    );

    it(
      "orders equal-point teams by global game difference",
      () => {
        const rows = calculate(
          ["A", "B", "C", "D"],
          [
            finished(
              "A",
              "C",
              2,
              0,
            ),
            finished(
              "B",
              "D",
              2,
              1,
            ),
          ],
        );

        expect(
          getRow(
            rows,
            "A",
          ).displayOrder,
        ).toBeLessThan(
          getRow(
            rows,
            "B",
          ).displayOrder,
        );
      },
    );

    it(
      "uses completed head-to-head before alphabetical fallback",
      () => {
        const rows = calculate(
          ["Alpha", "Beta", "X", "Y"],
          [
            finished(
              "Beta",
              "Alpha",
              2,
              0,
            ),
            finished(
              "X",
              "Beta",
              2,
              0,
            ),
            finished(
              "Alpha",
              "Y",
              2,
              0,
            ),
          ],
        );

        expect(
          getRow(
            rows,
            "Beta",
          ).displayOrder,
        ).toBeLessThan(
          getRow(
            rows,
            "Alpha",
          ).displayOrder,
        );
      },
    );

    it(
      "uses alphabetical order when two tied teams have not played",
      () => {
        const rows = calculate(
          [
            "Zulu",
            "Alpha",
            "X",
            "Y",
          ],
          [
            finished(
              "Zulu",
              "X",
              2,
              0,
            ),
            finished(
              "Alpha",
              "Y",
              2,
              0,
            ),
          ],
        );

        expect(
          rows
            .filter(
              (row) =>
                row.points === 1 &&
                row.gameDifference ===
                  2,
            )
            .map(
              (row) => row.teamId,
            ),
        ).toEqual([
          "Alpha",
          "Zulu",
        ]);
      },
    );

    it(
      "uses alphabetical order for an incomplete multi-team tie",
      () => {
        const rows = calculate(
          [
            "Charlie",
            "Alpha",
            "Bravo",
            "X",
            "Y",
            "Z",
          ],
          [
            finished(
              "Charlie",
              "X",
              2,
              0,
            ),
            finished(
              "Alpha",
              "Y",
              2,
              0,
            ),
            finished(
              "Bravo",
              "Z",
              2,
              0,
            ),
          ],
        );

        expect(
          rows
            .slice(0, 3)
            .map(
              (row) => row.teamId,
            ),
        ).toEqual([
          "Alpha",
          "Bravo",
          "Charlie",
        ]);
      },
    );

    it(
      "uses alphabetical order after a complete full tie",
      () => {
        const rows = calculate(
          [
            "Charlie",
            "Alpha",
            "Bravo",
          ],
          [
            finished(
              "Alpha",
              "Bravo",
              2,
              0,
            ),
            finished(
              "Bravo",
              "Charlie",
              2,
              0,
            ),
            finished(
              "Charlie",
              "Alpha",
              2,
              0,
            ),
          ],
          2,
        );

        expect(
          rows.map(
            (row) => row.teamId,
          ),
        ).toEqual([
          "Alpha",
          "Bravo",
          "Charlie",
        ]);
      },
    );

    it(
      "always assigns unique sequential ranks",
      () => {
        const rows = calculate(
          [
            "D",
            "C",
            "B",
            "A",
          ],
          [],
          2,
        );

        expect(
          rows.map(
            (row) => row.rank,
          ),
        ).toEqual([
          1,
          2,
          3,
          4,
        ]);
        expect(
          rows.map(
            (row) => row.teamId,
          ),
        ).toEqual([
          "A",
          "B",
          "C",
          "D",
        ]);
        expect(
          rows.every(
            (row) =>
              row.tieResolved &&
              row.tieReason === null,
          ),
        ).toBe(true);
      },
    );

    it(
      "makes Top 6 deterministic with alphabetical fallback",
      () => {
        const rows = calculate(
          [
            "I",
            "H",
            "G",
            "F",
            "E",
            "D",
            "C",
            "B",
            "A",
          ],
          [],
          6,
        );

        expect(
          rows
            .slice(0, 6)
            .map(
              (row) =>
                row.qualificationStatus,
            ),
        ).toEqual(
          Array(6).fill(
            "TEMPORARY_QUALIFIED",
          ),
        );
        expect(
          rows
            .slice(6)
            .map(
              (row) =>
                row.qualificationStatus,
            ),
        ).toEqual(
          Array(3).fill(
            "TEMPORARY_ELIMINATED",
          ),
        );
      },
    );

    it(
      "removes a reset match from every statistic",
      () => {
        const rows = calculate(
          ["B", "A"],
          [
            scheduled(
              "A",
              "B",
            ),
          ],
          1,
        );

        expect(
          rows.map(
            (row) => row.teamId,
          ),
        ).toEqual([
          "A",
          "B",
        ]);
        expect(
          rows.every(
            (row) =>
              row.played === 0 &&
              row.points === 0 &&
              row.gameDifference ===
                0,
          ),
        ).toBe(true);
      },
    );

    it(
      "preserves whole-tournament invariants",
      () => {
        const matches = [
          finished(
            "A",
            "B",
            2,
            0,
          ),
          finished(
            "C",
            "D",
            2,
            1,
          ),
          finished(
            "A",
            "C",
            1,
            2,
          ),
          finished(
            "B",
            "D",
            2,
            1,
          ),
        ];
        const rows = calculate(
          [
            "A",
            "B",
            "C",
            "D",
          ],
          matches,
          2,
        );
        const sum = (
          selector: (
            row: StandingRow,
          ) => number,
        ) =>
          rows.reduce(
            (total, row) =>
              total + selector(row),
            0,
          );

        expect(
          sum(
            (row) => row.wins,
          ),
        ).toBe(matches.length);
        expect(
          sum(
            (row) => row.losses,
          ),
        ).toBe(matches.length);
        expect(
          sum(
            (row) => row.points,
          ),
        ).toBe(matches.length);
        expect(
          sum(
            (row) => row.played,
          ),
        ).toBe(
          matches.length * 2,
        );
        expect(
          sum(
            (row) =>
              row.gameDifference,
          ),
        ).toBe(0);
      },
    );
  },
);
