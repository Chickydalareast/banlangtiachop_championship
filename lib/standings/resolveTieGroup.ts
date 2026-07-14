import type { StandingMatch, TieReason } from "./standings.types";

export type TieBlock = {
  teamIds: string[];
  tieGroupId: string | null;
  tieResolved: boolean;
  tieReason: TieReason;
};

export type TieResolverContext = {
  matchByPair: ReadonlyMap<string, StandingMatch>;
  fallbackCompare: (teamAId: string, teamBId: string) => number;
};

type MiniStanding = {
  teamId: string;
  points: number;
  gameDifference: number;
};

export function pairKey(teamAId: string, teamBId: string): string {
  return [teamAId, teamBId].sort().join(":");
}

function makeTieGroupId(teamIds: readonly string[]): string {
  return `tie:${[...teamIds].sort().join(":")}`;
}

function unresolvedBlock(
  teamIds: readonly string[],
  context: TieResolverContext,
  reason: Exclude<TieReason, null>,
): TieBlock {
  return {
    teamIds: [...teamIds].sort(context.fallbackCompare),
    tieGroupId: makeTieGroupId(teamIds),
    tieResolved: false,
    tieReason: reason,
  };
}

function resolvedSingleton(teamId: string, tieGroupId: string): TieBlock {
  return {
    teamIds: [teamId],
    tieGroupId,
    tieResolved: true,
    tieReason: null,
  };
}

function resolveTwoTeamTie(
  teamIds: readonly [string, string],
  context: TieResolverContext,
): TieBlock[] {
  const [teamAId, teamBId] = teamIds;
  const match = context.matchByPair.get(pairKey(teamAId, teamBId));

  if (!match) {
    return [
      unresolvedBlock(
        teamIds,
        context,
        "HEAD_TO_HEAD_NOT_PLAYED",
      ),
    ];
  }

  const scoreA = match.scoreA as number;
  const scoreB = match.scoreB as number;

  const winnerId =
    match.teamAId === teamAId
      ? scoreA > scoreB
        ? teamAId
        : teamBId
      : scoreA > scoreB
        ? teamBId
        : teamAId;

  const loserId = winnerId === teamAId ? teamBId : teamAId;
  const tieGroupId = makeTieGroupId(teamIds);

  return [
    resolvedSingleton(winnerId, tieGroupId),
    resolvedSingleton(loserId, tieGroupId),
  ];
}

function hasCompleteRoundRobin(
  teamIds: readonly string[],
  context: TieResolverContext,
): boolean {
  for (let leftIndex = 0; leftIndex < teamIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < teamIds.length;
      rightIndex += 1
    ) {
      if (
        !context.matchByPair.has(
          pairKey(teamIds[leftIndex], teamIds[rightIndex]),
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

function buildMiniTable(
  teamIds: readonly string[],
  context: TieResolverContext,
): MiniStanding[] {
  const miniTable = new Map<string, MiniStanding>();

  for (const teamId of teamIds) {
    miniTable.set(teamId, {
      teamId,
      points: 0,
      gameDifference: 0,
    });
  }

  for (let leftIndex = 0; leftIndex < teamIds.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < teamIds.length;
      rightIndex += 1
    ) {
      const leftTeamId = teamIds[leftIndex];
      const rightTeamId = teamIds[rightIndex];
      const match = context.matchByPair.get(
        pairKey(leftTeamId, rightTeamId),
      );

      if (!match) {
        continue;
      }

      const scoreA = match.scoreA as number;
      const scoreB = match.scoreB as number;
      const teamAStats = miniTable.get(match.teamAId);
      const teamBStats = miniTable.get(match.teamBId);

      if (!teamAStats || !teamBStats) {
        continue;
      }

      teamAStats.gameDifference += scoreA - scoreB;
      teamBStats.gameDifference += scoreB - scoreA;

      if (scoreA > scoreB) {
        teamAStats.points += 1;
      } else {
        teamBStats.points += 1;
      }
    }
  }

  return Array.from(miniTable.values());
}

function groupMiniTable(
  miniTable: readonly MiniStanding[],
  context: TieResolverContext,
): MiniStanding[][] {
  const sortedRows = [...miniTable].sort((rowA, rowB) => {
    if (rowA.points !== rowB.points) {
      return rowB.points - rowA.points;
    }

    if (rowA.gameDifference !== rowB.gameDifference) {
      return rowB.gameDifference - rowA.gameDifference;
    }

    return context.fallbackCompare(rowA.teamId, rowB.teamId);
  });

  const groups: MiniStanding[][] = [];

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

export function resolveTieGroup(
  teamIds: readonly string[],
  context: TieResolverContext,
): TieBlock[] {
  if (teamIds.length === 0) {
    return [];
  }

  if (teamIds.length === 1) {
    return [
      {
        teamIds: [teamIds[0]],
        tieGroupId: null,
        tieResolved: true,
        tieReason: null,
      },
    ];
  }

  if (teamIds.length === 2) {
    return resolveTwoTeamTie(
      [teamIds[0], teamIds[1]],
      context,
    );
  }

  if (!hasCompleteRoundRobin(teamIds, context)) {
    return [
      unresolvedBlock(
        teamIds,
        context,
        "HEAD_TO_HEAD_GROUP_INCOMPLETE",
      ),
    ];
  }

  const miniGroups = groupMiniTable(
    buildMiniTable(teamIds, context),
    context,
  );

  if (miniGroups.length === 1) {
    return [unresolvedBlock(teamIds, context, "FULL_TIE")];
  }

  const tieGroupId = makeTieGroupId(teamIds);
  const blocks: TieBlock[] = [];

  for (const miniGroup of miniGroups) {
    const miniGroupTeamIds = miniGroup.map((row) => row.teamId);

    if (miniGroupTeamIds.length === 1) {
      blocks.push(
        resolvedSingleton(miniGroupTeamIds[0], tieGroupId),
      );
      continue;
    }

    blocks.push(...resolveTieGroup(miniGroupTeamIds, context));
  }

  return blocks;
}
