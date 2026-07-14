import { describe, expect, it } from "vitest";
import { calculateStandings } from "./calculateStandings";
import type {
  StandingMatch,
  StandingRow,
  StandingTeam,
} from "./standings.types";

function makeTeams(teamIds: readonly string[]): StandingTeam[] {
  return teamIds.map((teamId, index) => ({
    id: teamId,
    name: teamId,
    displayOrder: index + 1,
  }));
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

function scheduled(teamAId: string, teamBId: string): StandingMatch {
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
  teamIds: readonly string[],
  matches: readonly StandingMatch[],
  qualificationCount = 6,
): StandingRow[] {
  return calculateStandings(
    makeTeams(teamIds),
    matches,
    { qualificationCount },
  );
}

function getRow(rows: readonly StandingRow[], teamId: string): StandingRow {
  const row = rows.find((candidate) => candidate.teamId === teamId);

  if (!row) {
    throw new Error(`Missing row for ${teamId}`);
  }

  return row;
}

describe("calculateStandings", () => {
  it("orders teams by points first", () => {
    const rows = calculate(
      ["A", "B", "C"],
      [finished("A", "B", 2, 0)],
    );

    expect(getRow(rows, "A").points).toBe(1);
    expect(getRow(rows, "A").displayOrder).toBeLessThan(
      getRow(rows, "B").displayOrder,
    );
  });

  it("orders equal-point teams by global game difference", () => {
    const rows = calculate(
      ["A", "B", "C", "D"],
      [
        finished("A", "C", 2, 0),
        finished("B", "D", 2, 1),
      ],
    );

    expect(getRow(rows, "A").points).toBe(1);
    expect(getRow(rows, "B").points).toBe(1);
    expect(getRow(rows, "A").gameDifference).toBe(2);
    expect(getRow(rows, "B").gameDifference).toBe(1);
    expect(getRow(rows, "A").displayOrder).toBeLessThan(
      getRow(rows, "B").displayOrder,
    );
  });

  it("resolves a two-team tie by the completed direct match", () => {
    const rows = calculate(
      ["A", "B", "C", "D"],
      [
        finished("A", "B", 2, 0),
        finished("C", "A", 2, 0),
        finished("B", "D", 2, 0),
      ],
    );

    const rowA = getRow(rows, "A");
    const rowB = getRow(rows, "B");

    expect(rowA.points).toBe(rowB.points);
    expect(rowA.gameDifference).toBe(rowB.gameDifference);
    expect(rowA.displayOrder).toBeLessThan(rowB.displayOrder);
    expect(rowA.tieResolved).toBe(true);
    expect(rowB.tieResolved).toBe(true);
  });

  it("keeps two equal teams on the same rank before head-to-head", () => {
    const rows = calculate(
      ["A", "B", "C", "D"],
      [
        finished("A", "C", 2, 0),
        finished("B", "D", 2, 0),
      ],
    );

    const rowA = getRow(rows, "A");
    const rowB = getRow(rows, "B");

    expect(rowA.rank).toBe(rowB.rank);
    expect(rowA.tieReason).toBe("HEAD_TO_HEAD_NOT_PLAYED");
    expect(rowB.tieReason).toBe("HEAD_TO_HEAD_NOT_PLAYED");
    expect(rowA.tieResolved).toBe(false);
    expect(rowB.tieResolved).toBe(false);
  });

  it("is independent of input order for a three-team cycle", () => {
    const teamIds = ["A", "B", "C"];
    const matches = [
      finished("A", "B", 2, 0),
      finished("B", "C", 2, 0),
      finished("C", "A", 2, 0),
    ];

    const first = calculateStandings(
      makeTeams(teamIds),
      matches,
      { qualificationCount: 2 },
    );
    const second = calculateStandings(
      [...makeTeams(teamIds)].reverse(),
      [...matches].reverse(),
      { qualificationCount: 2 },
    );

    expect(
      first.map((row) => ({
        teamId: row.teamId,
        rank: row.rank,
        tieReason: row.tieReason,
      })),
    ).toEqual(
      second.map((row) => ({
        teamId: row.teamId,
        rank: row.rank,
        tieReason: row.tieReason,
      })),
    );
  });

  it("uses the complete mini-table to resolve three tied teams", () => {
    const rows = calculate(
      ["A", "B", "C", "X", "Y", "Z"],
      [
        finished("A", "B", 2, 0),
        finished("A", "C", 2, 1),
        finished("B", "C", 2, 0),
        finished("B", "X", 2, 0),
        finished("C", "Y", 2, 0),
        finished("C", "Z", 2, 1),
        finished("X", "A", 2, 0),
        finished("Y", "B", 2, 0),
        finished("Z", "A", 2, 1),
      ],
    );

    const tiedRows = ["A", "B", "C"].map((teamId) =>
      getRow(rows, teamId),
    );

    expect(tiedRows.map((row) => row.points)).toEqual([2, 2, 2]);
    expect(tiedRows.map((row) => row.gameDifference)).toEqual([0, 0, 0]);
    expect(getRow(rows, "A").displayOrder).toBeLessThan(
      getRow(rows, "B").displayOrder,
    );
    expect(getRow(rows, "B").displayOrder).toBeLessThan(
      getRow(rows, "C").displayOrder,
    );
    expect(tiedRows.every((row) => row.tieResolved)).toBe(true);
  });

  it("marks an incomplete three-team head-to-head group unresolved", () => {
    const rows = calculate(
      ["A", "B", "C", "X", "Y", "Z"],
      [
        finished("A", "X", 2, 0),
        finished("B", "Y", 2, 0),
        finished("C", "Z", 2, 0),
      ],
    );

    const tiedRows = ["A", "B", "C"].map((teamId) =>
      getRow(rows, teamId),
    );

    expect(new Set(tiedRows.map((row) => row.rank)).size).toBe(1);
    expect(
      tiedRows.every(
        (row) => row.tieReason === "HEAD_TO_HEAD_GROUP_INCOMPLETE",
      ),
    ).toBe(true);
  });

  it("marks a complete but fully equal mini-table as a full tie", () => {
    const rows = calculate(
      ["A", "B", "C"],
      [
        finished("A", "B", 2, 0),
        finished("B", "C", 2, 0),
        finished("C", "A", 2, 0),
      ],
      2,
    );

    expect(rows.every((row) => row.rank === 1)).toBe(true);
    expect(rows.every((row) => row.tieReason === "FULL_TIE")).toBe(true);
    expect(rows.every((row) => row.tieResolved === false)).toBe(true);
  });

  it("marks an unresolved positions 5-7 tie as undecided for Top 6", () => {
    const teamIds = [
      "P1",
      "P2",
      "P3",
      "P4",
      "A",
      "B",
      "C",
      "X1",
      "X2",
      "X3",
      "X4",
    ];
    const matches = [
      finished("P1", "X1", 2, 0),
      finished("P1", "X2", 2, 0),
      finished("P1", "X3", 2, 0),
      finished("P1", "X4", 2, 0),
      finished("P2", "X1", 2, 0),
      finished("P2", "X2", 2, 0),
      finished("P2", "X3", 2, 0),
      finished("P3", "X1", 2, 0),
      finished("P3", "X2", 2, 0),
      finished("P4", "X1", 2, 0),
    ];

    const rows = calculate(teamIds, matches, 6);
    const boundaryRows = ["A", "B", "C"].map((teamId) =>
      getRow(rows, teamId),
    );

    expect(boundaryRows.map((row) => row.displayOrder)).toEqual([5, 6, 7]);
    expect(new Set(boundaryRows.map((row) => row.rank)).size).toBe(1);
    expect(
      boundaryRows.every(
        (row) => row.qualificationStatus === "UNDECIDED",
      ),
    ).toBe(true);
  });

  it("recalculates from scratch after a score edit", () => {
    const teams = makeTeams(["A", "B"]);
    const before = calculateStandings(
      teams,
      [finished("A", "B", 2, 0)],
      { qualificationCount: 1 },
    );
    const after = calculateStandings(
      teams,
      [finished("A", "B", 1, 2)],
      { qualificationCount: 1 },
    );

    expect(getRow(before, "A").wins).toBe(1);
    expect(getRow(before, "B").wins).toBe(0);
    expect(getRow(after, "A").wins).toBe(0);
    expect(getRow(after, "B").wins).toBe(1);
    expect(getRow(after, "B").displayOrder).toBe(1);
  });

  it("removes a reset match from every statistic", () => {
    const rows = calculate(
      ["A", "B"],
      [scheduled("A", "B")],
      1,
    );

    expect(rows.every((row) => row.played === 0)).toBe(true);
    expect(rows.every((row) => row.points === 0)).toBe(true);
    expect(rows.every((row) => row.gameDifference === 0)).toBe(true);
    expect(rows.every((row) => row.rank === 1)).toBe(true);
    expect(
      rows.every((row) => row.tieReason === "HEAD_TO_HEAD_NOT_PLAYED"),
    ).toBe(true);
  });

  it("preserves whole-tournament invariants", () => {
    const matches = [
      finished("A", "B", 2, 0),
      finished("C", "D", 2, 1),
      finished("A", "C", 1, 2),
      finished("B", "D", 2, 1),
    ];
    const rows = calculate(["A", "B", "C", "D"], matches, 2);
    const sum = (selector: (row: StandingRow) => number) =>
      rows.reduce((total, row) => total + selector(row), 0);

    expect(sum((row) => row.wins)).toBe(matches.length);
    expect(sum((row) => row.losses)).toBe(matches.length);
    expect(sum((row) => row.points)).toBe(matches.length);
    expect(sum((row) => row.played)).toBe(matches.length * 2);
    expect(sum((row) => row.gameDifference)).toBe(0);
  });
});
