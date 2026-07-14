import {
  pairKey,
  resolveTieGroup,
  type TieBlock,
} from "./resolveTieGroup";
import type {
  CalculateStandingsOptions,
  StandingMatch,
  StandingRow,
  StandingTeam,
} from "./standings.types";

type BaseStanding = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDifference: number;
  points: number;
};

function isValidFinishedMatch(match: StandingMatch): boolean {
  if (match.status !== "finished") {
    return false;
  }

  if (
    !Number.isInteger(match.scoreA) ||
    !Number.isInteger(match.scoreB)
  ) {
    return false;
  }

  const scoreA = match.scoreA as number;
  const scoreB = match.scoreB as number;

  return (
    (scoreA === 2 && (scoreB === 0 || scoreB === 1)) ||
    (scoreB === 2 && (scoreA === 0 || scoreA === 1))
  );
}

function normalizeName(name: string): string {
  return name.normalize("NFKD").toLowerCase();
}

function makeFallbackCompare(
  teamById: ReadonlyMap<string, StandingTeam>,
): (teamAId: string, teamBId: string) => number {
  return (teamAId, teamBId) => {
    const teamA = teamById.get(teamAId);
    const teamB = teamById.get(teamBId);

    if (!teamA || !teamB) {
      return teamAId < teamBId ? -1 : teamAId > teamBId ? 1 : 0;
    }

    const orderA = teamA.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = teamB.displayOrder ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const nameA = normalizeName(teamA.name);
    const nameB = normalizeName(teamB.name);

    if (nameA !== nameB) {
      return nameA < nameB ? -1 : 1;
    }

    return teamA.id < teamB.id ? -1 : teamA.id > teamB.id ? 1 : 0;
  };
}

function createBaseStanding(teamId: string): BaseStanding {
  return {
    teamId,
    played: 0,
    wins: 0,
    losses: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    gameDifference: 0,
    points: 0,
  };
}

function groupByPrimaryCriteria(
  rows: readonly BaseStanding[],
  fallbackCompare: (teamAId: string, teamBId: string) => number,
): BaseStanding[][] {
  const sortedRows = [...rows].sort((rowA, rowB) => {
    if (rowA.points !== rowB.points) {
      return rowB.points - rowA.points;
    }

    if (rowA.gameDifference !== rowB.gameDifference) {
      return rowB.gameDifference - rowA.gameDifference;
    }

    return fallbackCompare(rowA.teamId, rowB.teamId);
  });

  const groups: BaseStanding[][] = [];

  for (const row of sortedRows) {
    const currentGroup = groups.at(-1);
    const firstRow = currentGroup?.[0];

    if (
      firstRow &&
      firstRow.points === row.points &&
      firstRow.gameDifference === row.gameDifference
    ) {
      currentGroup.push(row);
    } else {
      groups.push([row]);
    }
  }

  return groups;
}

function singletonBlock(teamId: string): TieBlock {
  return {
    teamIds: [teamId],
    tieGroupId: null,
    tieResolved: true,
    tieReason: null,
  };
}

export function calculateStandings(
  teams: readonly StandingTeam[],
  matches: readonly StandingMatch[],
  options: CalculateStandingsOptions,
): StandingRow[] {
  if (
    !Number.isInteger(options.qualificationCount) ||
    options.qualificationCount <= 0
  ) {
    throw new Error("qualificationCount must be a positive integer.");
  }

  const teamById = new Map<string, StandingTeam>();
  const baseByTeamId = new Map<string, BaseStanding>();

  for (const team of teams) {
    if (teamById.has(team.id)) {
      throw new Error(`Duplicate team id: ${team.id}`);
    }

    teamById.set(team.id, team);
    baseByTeamId.set(team.id, createBaseStanding(team.id));
  }

  const matchByPair = new Map<string, StandingMatch>();

  for (const match of matches) {
    if (!isValidFinishedMatch(match)) {
      continue;
    }

    const teamAStanding = baseByTeamId.get(match.teamAId);
    const teamBStanding = baseByTeamId.get(match.teamBId);

    if (!teamAStanding || !teamBStanding) {
      throw new Error(
        `Finished match references an unknown team: ${match.teamAId} vs ${match.teamBId}`,
      );
    }

    const key = pairKey(match.teamAId, match.teamBId);

    if (matchByPair.has(key)) {
      throw new Error(`Duplicate finished match for pair: ${key}`);
    }

    matchByPair.set(key, match);

    const scoreA = match.scoreA as number;
    const scoreB = match.scoreB as number;

    teamAStanding.played += 1;
    teamBStanding.played += 1;

    teamAStanding.gamesFor += scoreA;
    teamAStanding.gamesAgainst += scoreB;
    teamBStanding.gamesFor += scoreB;
    teamBStanding.gamesAgainst += scoreA;

    if (scoreA > scoreB) {
      teamAStanding.wins += 1;
      teamAStanding.points += 1;
      teamBStanding.losses += 1;
    } else {
      teamBStanding.wins += 1;
      teamBStanding.points += 1;
      teamAStanding.losses += 1;
    }
  }

  baseByTeamId.forEach((row) => {
    row.gameDifference = row.gamesFor - row.gamesAgainst;
  });

  const fallbackCompare = makeFallbackCompare(teamById);
  const primaryGroups = groupByPrimaryCriteria(
    Array.from(baseByTeamId.values()),
    fallbackCompare,
  );
  const blocks: TieBlock[] = [];

  for (const group of primaryGroups) {
    if (group.length === 1) {
      blocks.push(singletonBlock(group[0].teamId));
      continue;
    }

    blocks.push(
      ...resolveTieGroup(
        group.map((row) => row.teamId),
        {
          matchByPair,
          fallbackCompare,
        },
      ),
    );
  }

  const output: StandingRow[] = [];
  let nextDisplayPosition = 1;

  for (const block of blocks) {
    const blockStart = nextDisplayPosition;
    const blockEnd = blockStart + block.teamIds.length - 1;
    const crossesQualificationBoundary =
      !block.tieResolved &&
      blockStart <= options.qualificationCount &&
      blockEnd > options.qualificationCount;

    for (const teamId of block.teamIds) {
      const team = teamById.get(teamId);
      const base = baseByTeamId.get(teamId);

      if (!team || !base) {
        throw new Error(`Missing standings data for team: ${teamId}`);
      }

      const qualificationStatus = crossesQualificationBoundary
        ? "UNDECIDED"
        : nextDisplayPosition <= options.qualificationCount
          ? "TEMPORARY_QUALIFIED"
          : "TEMPORARY_ELIMINATED";

      output.push({
        teamId,
        teamName: team.name,
        played: base.played,
        wins: base.wins,
        losses: base.losses,
        gamesFor: base.gamesFor,
        gamesAgainst: base.gamesAgainst,
        gameDifference: base.gameDifference,
        points: base.points,
        rank: blockStart,
        displayOrder: nextDisplayPosition,
        tieGroupId: block.tieGroupId,
        tieResolved: block.tieResolved,
        tieReason: block.tieReason,
        qualificationStatus,
      });

      nextDisplayPosition += 1;
    }
  }

  return output;
}
