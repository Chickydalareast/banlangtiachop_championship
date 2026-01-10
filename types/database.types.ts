export type Team = {
  id: string;
  name: string;
  short_name: string;
  logo_path: string;
};

export type Standing = {
  team_id: string;
  points: number;
  played: number;
  won: number;
  lost: number;
  map_won: number;
  map_lost: number;
  map_diff: number;
  manual_points: number;
  trend: number;
  teams: Team; // Quan hệ join với bảng teams
};

export type Match = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  score_a: number;
  score_b: number;
  status: 'scheduled' | 'live' | 'finished';
  match_day: number;
  team_a?: Team; // Sẽ join để lấy tên đội
  team_b?: Team;
};