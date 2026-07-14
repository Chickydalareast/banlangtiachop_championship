"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Calendar,
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
  team_a: Team;
  team_b: Team;
};

export default function MatchesList() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );
  const [matches, setMatches] = useState<
    Match[]
  >([]);
  const [loading, setLoading] =
    useState(true);

  const fetchMatches = useCallback(
    async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id,status,score_a,score_b,match_day,match_order,team_a:teams!team_a_id(id,short_name,logo_path),team_b:teams!team_b_id(id,short_name,logo_path)",
        )
        .order("match_day", {
          ascending: true,
        })
        .order("match_order", {
          ascending: true,
        });

      if (!error) {
        setMatches((data ?? []) as unknown as Match[]);
      }

      setLoading(false);
    },
    [supabase],
  );

  useEffect(() => {
    void fetchMatches();

    const channel = supabase
      .channel("realtime-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          void fetchMatches();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchMatches, supabase]);

  const groupedMatches = useMemo(() => {
    const groups = new Map<
      number,
      Match[]
    >();

    for (const match of matches) {
      const current =
        groups.get(match.match_day) ?? [];

      current.push(match);
      groups.set(match.match_day, current);
    }

    return Array.from(groups.entries()).sort(
      ([left], [right]) => left - right,
    );
  }, [matches]);

  if (loading) {
    return (
      <div className="py-20 text-center font-teko text-2xl uppercase tracking-widest text-slate-500">
        Đang tải lịch thi đấu...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groupedMatches.map(
        ([day, dayMatches]) => (
          <section key={day}>
            <div className="mb-5 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-teko text-3xl font-bold uppercase text-white">
                Ngày thi đấu {day}
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {dayMatches.map((match) => {
                const teamAWon =
                  match.status === "finished" &&
                  (match.score_a ?? 0) >
                    (match.score_b ?? 0);
                const teamBWon =
                  match.status === "finished" &&
                  (match.score_b ?? 0) >
                    (match.score_a ?? 0);

                return (
                  <article
                    key={match.id}
                    className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-gunmetal p-5"
                  >
                    {match.status === "live" && (
                      <span className="absolute right-3 top-3 rounded-full bg-loss/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-300">
                        Live
                      </span>
                    )}

                    <div className="min-w-0 text-center">
                      <div className="mx-auto mb-2 h-14 w-14">
                        {match.team_a.logo_path && (
                          <Image
                            src={
                              match.team_a
                                .logo_path
                            }
                            alt={
                              match.team_a
                                .short_name
                            }
                            width={56}
                            height={56}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <p
                        className={clsx(
                          "truncate font-teko text-2xl font-bold uppercase",
                          teamAWon
                            ? "text-emerald-300"
                            : "text-white",
                        )}
                      >
                        {
                          match.team_a
                            .short_name
                        }
                      </p>
                    </div>

                    <div className="text-center">
                      {match.status ===
                      "scheduled" ? (
                        <p className="font-teko text-2xl font-bold text-slate-500">
                          VS
                        </p>
                      ) : (
                        <p className="font-teko text-4xl font-bold text-white">
                          {match.score_a}
                          <span className="mx-2 text-slate-600">
                            :
                          </span>
                          {match.score_b}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        Trận{" "}
                        {match.match_order}
                      </p>
                    </div>

                    <div className="min-w-0 text-center">
                      <div className="mx-auto mb-2 h-14 w-14">
                        {match.team_b.logo_path && (
                          <Image
                            src={
                              match.team_b
                                .logo_path
                            }
                            alt={
                              match.team_b
                                .short_name
                            }
                            width={56}
                            height={56}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <p
                        className={clsx(
                          "truncate font-teko text-2xl font-bold uppercase",
                          teamBWon
                            ? "text-emerald-300"
                            : "text-white",
                        )}
                      >
                        {
                          match.team_b
                            .short_name
                        }
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ),
      )}

      {matches.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-gunmetal p-8 text-center text-slate-400">
          Chưa có lịch thi đấu được công
          bố.
        </div>
      )}
    </div>
  );
}
