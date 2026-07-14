export type MatchStatus = "scheduled" | "live" | "finished";

export type StandingTeam = {
  id: string;
  name: string;
  displayOrder?: number | null;
};

export type StandingMatch = {
  id?: string;
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
  status: MatchStatus;
};

export type TieReason =
  | null
  | "HEAD_TO_HEAD_NOT_PLAYED"
  | "HEAD_TO_HEAD_GROUP_INCOMPLETE"
  | "FULL_TIE";

export type QualificationStatus =
  | "TEMPORARY_QUALIFIED"
  | "TEMPORARY_ELIMINATED"
  | "UNDECIDED";

export type StandingRow = {
  teamId: string;
  teamName: string;

  played: number;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDifference: number;
  points: number;

  rank: number;
  displayOrder: number;

  tieGroupId: string | null;
  tieResolved: boolean;
  tieReason: TieReason;

  qualificationStatus: QualificationStatus;
};

export type CalculateStandingsOptions = {
  qualificationCount: number;
};
