"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Crown,
} from "lucide-react";
import clsx from "clsx";

import { calculateStandings } from "@/lib/standings/calculateStandings";
import type {
  StandingMatch,
  StandingRow,
  StandingTeam,
} from "@/lib/standings/standings.types";
import { createClient } from "@/lib/supabase/client";

type QueryTeam = {
  id: string;
  name: string;
  short_name: string;
  logo_path: string | null;
  display_order: number;
};

type QueryMatch = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  score_a: number | null;
  score_b: number | null;
  status: "scheduled" | "live" | "finished";
};

type QuerySettings = {
  qualification_count: number;
};

type TeamMeta = {
  shortName: string;
  logoPath: string | null;
};

export default function LeaderboardTable() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );
  const [rows, setRows] = useState<
    StandingRow[]
  >([]);
  const [teamMetaById, setTeamMetaById] =
    useState<Record<string, TeamMeta>>({});
  const [
    qualificationCount,
    setQualificationCount,
  ] = useState(6);
  const [isLoading, setIsLoading] =
    useState(true);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setErrorMessage(null);

    const [
      teamsResult,
      matchesResult,
      settingsResult,
    ] = await Promise.all([
      supabase
        .from("teams")
        .select(
          "id,name,short_name,logo_path,display_order",
        )
        .order("display_order", {
          ascending: true,
        }),
      supabase
        .from("matches")
        .select(
          "id,team_a_id,team_b_id,score_a,score_b,status",
        ),
      supabase
        .from("tournament_settings")
        .select("qualification_count")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    const requestError =
      teamsResult.error ??
      matchesResult.error ??
      settingsResult.error;

    if (requestError) {
      throw requestError;
    }

    const queryTeams =
      (teamsResult.data ?? []) as QueryTeam[];
    const queryMatches =
      (matchesResult.data ?? []) as QueryMatch[];
    const querySettings =
      settingsResult.data as QuerySettings | null;
    const configuredQualificationCount =
      querySettings?.qualification_count;
    const safeQualificationCount =
      Number.isInteger(
        configuredQualificationCount,
      ) &&
      (configuredQualificationCount ?? 0) > 0
        ? (configuredQualificationCount as number)
        : 6;

    const standingsTeams: StandingTeam[] =
      queryTeams.map((team) => ({
        id: team.id,
        name: team.name,
        displayOrder: team.display_order,
      }));
    const standingsMatches: StandingMatch[] =
      queryMatches.map((match) => ({
        id: match.id,
        teamAId: match.team_a_id,
        teamBId: match.team_b_id,
        scoreA: match.score_a,
        scoreB: match.score_b,
        status: match.status,
      }));
    const calculatedRows =
      calculateStandings(
        standingsTeams,
        standingsMatches,
        {
          qualificationCount:
            safeQualificationCount,
        },
      );
    const nextTeamMeta =
      Object.fromEntries(
        queryTeams.map((team) => [
          team.id,
          {
            shortName: team.short_name,
            logoPath: team.logo_path,
          },
        ]),
      );

    setRows(calculatedRows);
    setTeamMetaById(nextTeamMeta);
    setQualificationCount(
      safeQualificationCount,
    );
  }, [supabase]);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        await fetchData();
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error(
          "Failed to load standings:",
          error,
        );
        setErrorMessage(
          "Unable to load standings.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    const channel = supabase
      .channel(
        "realtime-public-standings",
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
  }, [fetchData, supabase]);

  if (isLoading) {
    return (
      <div className="py-16 text-center font-teko text-2xl uppercase tracking-[0.18em] text-slate-500">
        Loading standings...
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

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center font-teko text-2xl uppercase tracking-[0.18em] text-slate-500">
        No standings data
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="grid grid-cols-[42px_minmax(0,1fr)_44px_58px_48px] items-center gap-2 border-b border-white/15 px-3 pb-3 font-teko text-lg font-bold uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[54px_minmax(0,1fr)_54px_72px_58px] sm:px-5 sm:text-xl">
        <span>#</span>
        <span>Team</span>
        <span className="text-center">M</span>
        <span className="text-center">GD</span>
        <span className="text-right text-primary">
          PTS
        </span>
      </div>

      <div className="space-y-2 pt-2">
        {rows.map((row, index) => {
          const meta =
            teamMetaById[row.teamId];
          const isChampionRow =
            index === 0;
          const isBottomThree =
            index >= qualificationCount;
          const showEliminationLine =
            index === qualificationCount;

          return (
            <div key={row.teamId}>
              {showEliminationLine && (
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
                  <span className="relative rounded border border-red-500/45 bg-[#100b0d] px-3 py-1 font-teko text-sm font-bold uppercase tracking-[0.18em] text-red-400">
                    Elimination Zone
                  </span>
                </div>
              )}

              <article
                className={clsx(
                  "relative grid min-h-[76px] grid-cols-[42px_minmax(0,1fr)_44px_58px_48px] items-center gap-2 overflow-hidden rounded-lg border px-3 py-3 transition sm:min-h-[88px] sm:grid-cols-[54px_minmax(0,1fr)_54px_72px_58px] sm:px-5",
                  isChampionRow
                    ? "border-amber-400/35 bg-gradient-to-r from-amber-500/15 via-[#171318] to-[#111116] shadow-[inset_4px_0_0_#facc15]"
                    : isBottomThree
                      ? "border-red-950/60 bg-[#0a0a0f]/75 opacity-50 shadow-[inset_4px_0_0_#53151b]"
                      : "border-white/5 bg-[#111116]/95 shadow-[inset_4px_0_0_#a84413]",
                )}
              >
                {isChampionRow && (
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_50%,rgba(245,158,11,0.11),transparent_46%)]" />
                )}

                <div className="relative flex flex-col items-center justify-center">
                  <span
                    className={clsx(
                      "font-teko text-3xl font-black leading-none sm:text-4xl",
                      isChampionRow
                        ? "text-amber-300"
                        : isBottomThree
                          ? "text-slate-600"
                          : "text-white",
                    )}
                  >
                    {row.rank}
                  </span>
                  {isChampionRow &&
                    row.tieResolved && (
                      <Crown className="mt-1 h-4 w-4 fill-amber-400 text-amber-400" />
                    )}
                </div>

                <div className="relative flex min-w-0 items-center gap-3">
                  <div
                    className={clsx(
                      "flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-14 sm:w-14",
                      isBottomThree &&
                        "grayscale",
                    )}
                  >
                    {meta?.logoPath ? (
                      <Image
                        src={meta.logoPath}
                        alt={
                          meta.shortName ??
                          row.teamName
                        }
                        width={56}
                        height={56}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="font-teko text-xl font-bold text-slate-500">
                        {(meta?.shortName ??
                          row.teamName)
                          .slice(0, 3)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <span
                    className={clsx(
                      "truncate font-teko text-2xl font-black uppercase tracking-wide sm:text-3xl",
                      isBottomThree
                        ? "text-slate-600"
                        : "text-white",
                    )}
                  >
                    {meta?.shortName ??
                      row.teamName}
                  </span>
                </div>

                <span
                  className={clsx(
                    "relative text-center font-teko text-2xl font-bold sm:text-3xl",
                    isBottomThree
                      ? "text-slate-700"
                      : "text-slate-300",
                  )}
                >
                  {row.played}
                </span>

                <span
                  className={clsx(
                    "relative text-center font-teko text-2xl font-black sm:text-3xl",
                    isBottomThree
                      ? "text-slate-700"
                      : row.gameDifference > 0
                        ? "text-emerald-400"
                        : row.gameDifference < 0
                          ? "text-red-400"
                          : "text-slate-400",
                  )}
                >
                  {row.gameDifference > 0
                    ? "+"
                    : ""}
                  {row.gameDifference}
                </span>

                <span
                  className={clsx(
                    "relative text-right font-teko text-3xl font-black sm:text-4xl",
                    isBottomThree
                      ? "text-slate-700"
                      : "text-primary",
                  )}
                >
                  {row.points}
                </span>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
