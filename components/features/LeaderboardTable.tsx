"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { AlertTriangle, Crown, ShieldCheck } from "lucide-react";

import { calculateStandings } from "@/lib/standings/calculateStandings";
import type {
  StandingMatch,
  StandingRow,
  StandingTeam,
  TieReason,
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

function tieLabel(reason: TieReason): string | null {
  switch (reason) {
    case "HEAD_TO_HEAD_NOT_PLAYED":
      return "Chưa đối đầu";
    case "HEAD_TO_HEAD_GROUP_INCOMPLETE":
      return "Đối đầu chưa hoàn tất";
    case "FULL_TIE":
      return "Chưa phân định";
    default:
      return null;
  }
}

function qualificationLabel(row: StandingRow): string {
  switch (row.qualificationStatus) {
    case "TEMPORARY_QUALIFIED":
      return "Top 6 tạm thời";
    case "TEMPORARY_ELIMINATED":
      return "Tạm ngoài Top 6";
    case "UNDECIDED":
      return "Chưa phân định suất Top 6";
  }
}

export default function LeaderboardTable() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<StandingRow[]>([]);
  const [teamMetaById, setTeamMetaById] = useState<
    Record<string, TeamMeta>
  >({});
  const [qualificationCount, setQualificationCount] = useState(6);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setErrorMessage(null);

    const [teamsResult, matchesResult, settingsResult] =
      await Promise.all([
        supabase
          .from("teams")
          .select(
            "id,name,short_name,logo_path,display_order",
          )
          .order("display_order", { ascending: true })
          .order("name", { ascending: true }),
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
      Number.isInteger(configuredQualificationCount) &&
      (configuredQualificationCount ?? 0) > 0
        ? (configuredQualificationCount as number)
        : 6;

    const standingsTeams: StandingTeam[] = queryTeams.map(
      (team) => ({
        id: team.id,
        name: team.name,
        displayOrder: team.display_order,
      }),
    );

    const standingsMatches: StandingMatch[] = queryMatches.map(
      (match) => ({
        id: match.id,
        teamAId: match.team_a_id,
        teamBId: match.team_b_id,
        scoreA: match.score_a,
        scoreB: match.score_b,
        status: match.status,
      }),
    );

    const calculatedRows = calculateStandings(
      standingsTeams,
      standingsMatches,
      {
        qualificationCount: safeQualificationCount,
      },
    );

    const nextTeamMeta = Object.fromEntries(
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
    setQualificationCount(safeQualificationCount);
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

        console.error("Failed to load standings:", error);
        setErrorMessage(
          "Không thể tải bảng xếp hạng. Vui lòng thử lại.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void load();

    const channel = supabase
      .channel("realtime-deterministic-standings")
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

  const firstEliminatedIndex = rows.findIndex(
    (row) =>
      row.qualificationStatus === "TEMPORARY_ELIMINATED",
  );

  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-white/10 bg-gunmetal p-8 text-center text-sm text-slate-400"
        aria-live="polite"
      >
        Đang tải bảng xếp hạng...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border border-loss/30 bg-loss/10 p-5 text-sm text-red-200"
        role="alert"
      >
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gunmetal p-8 text-center">
        <p className="font-semibold text-white">
          Chưa có dữ liệu đội tuyển
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Bảng xếp hạng sẽ xuất hiện sau khi seed danh sách
          đội chính thức.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-gunmetal shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="font-teko text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl">
            Bảng xếp hạng
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            Điểm → hiệu số ván → đối đầu
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-win/20 bg-win/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          Top {qualificationCount} tạm thời
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[64px_minmax(220px,1fr)_64px_64px_64px_72px_92px] items-center gap-2 border-b border-white/10 bg-black/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-6">
            <span>Hạng</span>
            <span className="text-left">Đội tuyển</span>
            <span>Trận</span>
            <span>Thắng</span>
            <span>Thua</span>
            <span>Hiệu số</span>
            <span>Điểm</span>
          </div>

          {rows.map((row, index) => {
            const meta = teamMetaById[row.teamId];
            const unresolvedLabel = tieLabel(row.tieReason);
            const showBoundary =
              firstEliminatedIndex >= 0 &&
              index === firstEliminatedIndex;

            return (
              <div key={row.teamId}>
                {showBoundary && (
                  <div className="flex items-center gap-3 border-y border-loss/30 bg-loss/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-300 sm:px-6">
                    <span className="h-px flex-1 bg-loss/30" />
                    Ranh giới Top {qualificationCount}
                    <span className="h-px flex-1 bg-loss/30" />
                  </div>
                )}

                <div
                  className={clsx(
                    "grid grid-cols-[64px_minmax(220px,1fr)_64px_64px_64px_72px_92px] items-center gap-2 border-b border-white/5 px-4 py-4 transition-colors last:border-b-0 sm:px-6",
                    row.qualificationStatus ===
                      "TEMPORARY_QUALIFIED" &&
                      "border-l-2 border-l-win/70 bg-win/[0.035]",
                    row.qualificationStatus ===
                      "TEMPORARY_ELIMINATED" &&
                      "border-l-2 border-l-loss/60 bg-loss/[0.035]",
                    row.qualificationStatus === "UNDECIDED" &&
                      "border-l-2 border-l-amber-400/70 bg-amber-400/[0.05]",
                  )}
                >
                  <div className="flex justify-center">
                    <div
                      className={clsx(
                        "flex h-10 w-10 items-center justify-center rounded-xl border font-teko text-xl font-bold",
                        row.rank === 1
                          ? "border-amber-300/40 bg-amber-300/10 text-amber-300"
                          : row.tieResolved
                            ? "border-white/10 bg-white/5 text-white"
                            : "border-amber-400/30 bg-amber-400/10 text-amber-300",
                      )}
                    >
                      {row.rank === 1 && row.tieResolved ? (
                        <Crown className="h-5 w-5" />
                      ) : (
                        <span>
                          {row.tieResolved ? "" : "="}
                          {row.rank}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      {meta?.logoPath ? (
                        <Image
                          src={meta.logoPath}
                          alt={`Logo ${row.teamName}`}
                          width={44}
                          height={44}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="font-teko text-lg font-bold text-slate-400">
                          {(meta?.shortName ?? row.teamName)
                            .slice(0, 3)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-teko text-xl font-bold uppercase tracking-wide text-white">
                        {meta?.shortName ?? row.teamName}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            row.qualificationStatus ===
                              "TEMPORARY_QUALIFIED" &&
                              "bg-win/10 text-emerald-300",
                            row.qualificationStatus ===
                              "TEMPORARY_ELIMINATED" &&
                              "bg-loss/10 text-red-300",
                            row.qualificationStatus ===
                              "UNDECIDED" &&
                              "bg-amber-400/10 text-amber-300",
                          )}
                        >
                          {qualificationLabel(row)}
                        </span>

                        {unresolvedLabel && (
                          <span className="text-[11px] text-amber-300">
                            {unresolvedLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-center font-teko text-xl text-slate-300">
                    {row.played}
                  </span>
                  <span className="text-center font-teko text-xl text-emerald-300">
                    {row.wins}
                  </span>
                  <span className="text-center font-teko text-xl text-red-300">
                    {row.losses}
                  </span>
                  <span
                    className={clsx(
                      "text-center font-teko text-xl font-semibold",
                      row.gameDifference > 0 &&
                        "text-emerald-300",
                      row.gameDifference < 0 && "text-red-300",
                      row.gameDifference === 0 &&
                        "text-slate-400",
                    )}
                  >
                    {row.gameDifference > 0 ? "+" : ""}
                    {row.gameDifference}
                  </span>
                  <span className="text-center font-teko text-2xl font-bold text-white">
                    {row.points}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/20 px-4 py-3 text-xs leading-relaxed text-slate-500 sm:px-6">
        Tên đội hoặc thứ tự hiển thị chỉ được dùng để giữ giao
        diện ổn định. Các đội chưa phân định vẫn giữ cùng hạng
        chính thức.
      </div>
    </section>
  );
}
