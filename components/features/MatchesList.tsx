"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Moon,
} from "lucide-react";
import clsx from "clsx";

import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  short_name: string;
  logo_path: string | null;
};

type Match = {
  id: string;
  status: "scheduled" | "live" | "finished";
  score_a: number | null;
  score_b: number | null;
  match_day: number;
  match_order: number;
  scheduled_at: string | null;
  team_a: Team;
  team_b: Team;
};

type MatchDay = {
  day: number;
  dateLabel: string;
  timeLabel: string;
  byeTeam: Team | null;
  matches: Match[];
};

const tournamentTimeZone =
  "Asia/Ho_Chi_Minh";

function formatDate(
  scheduledAt: string | null,
  day: number,
): string {
  if (!scheduledAt) {
    return `MATCH DAY ${day}`;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "2-digit",
      weekday: "short",
      timeZone: tournamentTimeZone,
    },
  )
    .format(new Date(scheduledAt))
    .toUpperCase();
}

function formatTime(
  scheduledAt: string | null,
): string {
  if (!scheduledAt) {
    return "20:00";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tournamentTimeZone,
    },
  ).format(new Date(scheduledAt));
}

export default function MatchesList() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );
  const [matches, setMatches] = useState<
    Match[]
  >([]);
  const [teams, setTeams] = useState<
    Team[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const fetchMatches = useCallback(
    async () => {
      setErrorMessage(null);

      const [
        matchesResult,
        teamsResult,
      ] = await Promise.all([
        supabase
          .from("matches")
          .select(
            "id,status,score_a,score_b,match_day,match_order,scheduled_at,team_a:teams!team_a_id(id,short_name,logo_path),team_b:teams!team_b_id(id,short_name,logo_path)",
          )
          .order("match_day", {
            ascending: true,
          })
          .order("match_order", {
            ascending: true,
          }),
        supabase
          .from("teams")
          .select(
            "id,short_name,logo_path",
          )
          .eq("is_active", true)
          .order("display_order", {
            ascending: true,
          }),
      ]);

      const requestError =
        matchesResult.error ??
        teamsResult.error;

      if (requestError) {
        throw requestError;
      }

      setMatches(
        (matchesResult.data ??
          []) as unknown as Match[],
      );
      setTeams(
        (teamsResult.data ??
          []) as Team[],
      );
      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        await fetchMatches();
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error(
          "Failed to load matches:",
          error,
        );
        setErrorMessage(
          "Unable to load match schedule.",
        );
        setLoading(false);
      }
    };

    void load();

    const channel = supabase
      .channel(
        "realtime-public-matches",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, [fetchMatches, supabase]);

  const groupedMatches = useMemo<
    MatchDay[]
  >(() => {
    const groups = new Map<
      number,
      Match[]
    >();

    for (const match of matches) {
      const current =
        groups.get(match.match_day) ?? [];

      current.push(match);
      groups.set(
        match.match_day,
        current,
      );
    }

    return Array.from(groups.entries())
      .sort(
        ([left], [right]) =>
          left - right,
      )
      .map(([day, dayMatches]) => {
        const playingTeamIds =
          new Set(
            dayMatches.flatMap(
              (match) => [
                match.team_a.id,
                match.team_b.id,
              ],
            ),
          );
        const byeTeam =
          teams.find(
            (team) =>
              !playingTeamIds.has(
                team.id,
              ),
          ) ?? null;
        const firstMatch =
          dayMatches[0];

        return {
          day,
          dateLabel: formatDate(
            firstMatch?.scheduled_at ??
              null,
            day,
          ),
          timeLabel: formatTime(
            firstMatch?.scheduled_at ??
              null,
          ),
          byeTeam,
          matches: dayMatches,
        };
      });
  }, [matches, teams]);

  if (loading) {
    return (
      <div className="py-16 text-center font-teko text-2xl uppercase tracking-[0.18em] text-slate-500">
        Loading matches...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-8 text-center font-semibold text-red-200">
        {errorMessage}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {groupedMatches.map((group) => (
        <section
          key={group.day}
          className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d12]/95"
        >
          <header className="flex items-center justify-between border-b border-white/10 bg-[#151219] px-4 py-3 sm:px-5">
            <div>
              <p className="font-teko text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Match Day {group.day}
              </p>
              <h3 className="font-teko text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                {group.dateLabel}
              </h3>
            </div>

            <div className="text-right">
              <p className="font-teko text-2xl font-black text-white">
                {group.timeLabel}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                BO3
              </p>
            </div>
          </header>

          <div className="divide-y divide-white/5">
            {group.matches.map(
              (match) => {
                const teamAWon =
                  match.status ===
                    "finished" &&
                  (match.score_a ?? 0) >
                    (match.score_b ?? 0);
                const teamBWon =
                  match.status ===
                    "finished" &&
                  (match.score_b ?? 0) >
                    (match.score_a ?? 0);

                return (
                  <article
                    key={match.id}
                    className="grid min-h-[78px] grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] items-center gap-2 px-3 py-3 sm:min-h-[88px] sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                        {match.team_a
                          .logo_path && (
                          <Image
                            src={
                              match.team_a
                                .logo_path
                            }
                            alt={
                              match.team_a
                                .short_name
                            }
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <span
                        className={clsx(
                          "truncate font-teko text-xl font-black uppercase sm:text-2xl",
                          teamAWon
                            ? "text-emerald-300"
                            : "text-white",
                        )}
                      >
                        {
                          match.team_a
                            .short_name
                        }
                      </span>
                    </div>

                    <div className="text-center">
                      {match.status ===
                      "scheduled" ? (
                        <span className="font-teko text-xl font-bold uppercase tracking-widest text-slate-600">
                          VS
                        </span>
                      ) : (
                        <span className="font-teko text-3xl font-black text-white">
                          {match.score_a}
                          <span className="mx-1.5 text-slate-600">
                            :
                          </span>
                          {match.score_b}
                        </span>
                      )}

                      {match.status ===
                        "live" && (
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-red-400">
                          Live
                        </p>
                      )}
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
                      <span
                        className={clsx(
                          "truncate font-teko text-xl font-black uppercase sm:text-2xl",
                          teamBWon
                            ? "text-emerald-300"
                            : "text-white",
                        )}
                      >
                        {
                          match.team_b
                            .short_name
                        }
                      </span>
                      <div className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                        {match.team_b
                          .logo_path && (
                          <Image
                            src={
                              match.team_b
                                .logo_path
                            }
                            alt={
                              match.team_b
                                .short_name
                            }
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>

          {group.byeTeam && (
            <footer className="flex items-center justify-center gap-2 border-t border-white/10 bg-black/20 px-4 py-2.5">
              <Moon className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Bye:{" "}
                {
                  group.byeTeam
                    .short_name
                }
              </span>
            </footer>
          )}
        </section>
      ))}

      {matches.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-[#0d0d12] p-8 text-center font-teko text-2xl uppercase text-slate-500">
          No matches published
        </div>
      )}
    </div>
  );
}
