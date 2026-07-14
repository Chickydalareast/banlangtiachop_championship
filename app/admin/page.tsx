"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  Loader2,
  LockKeyhole,
  LogOut,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";

import {
  commandToMatchUpdate,
  type AdminMatchCommand,
} from "@/lib/admin/match-command";
import { createClient } from "@/lib/supabase/client";

type Team = {
  id: string;
  name: string;
  short_name: string;
  logo_path: string | null;
};

type MatchStatus =
  | "scheduled"
  | "live"
  | "finished";

type Match = {
  id: string;
  score_a: number | null;
  score_b: number | null;
  status: MatchStatus;
  match_day: number;
  match_order: number;
  team_a: Team;
  team_b: Team;
};

type AuthState =
  | "checking"
  | "anonymous"
  | "authenticated";

const ADMIN_USERNAME =
  process.env.NEXT_PUBLIC_ADMIN_USERNAME ??
  "admin";
const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ??
  "";
const ADMIN_SESSION_KEY =
  "bltc-simple-admin-session";

const resultPresets = [
  {
    label: "2–0",
    scoreA: 2,
    scoreB: 0,
  },
  {
    label: "2–1",
    scoreA: 2,
    scoreB: 1,
  },
  {
    label: "1–2",
    scoreA: 1,
    scoreB: 2,
  },
  {
    label: "0–2",
    scoreA: 0,
    scoreB: 2,
  },
] as const;

export default function AdminDashboard() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );
  const [authState, setAuthState] =
    useState<AuthState>("checking");
  const [username, setUsername] =
    useState("admin");
  const [password, setPassword] =
    useState("");
  const [matches, setMatches] = useState<
    Match[]
  >([]);
  const [loadingMatches, setLoadingMatches] =
    useState(false);
  const [busyMatchId, setBusyMatchId] =
    useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);

    try {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id,score_a,score_b,status,match_day,match_order,team_a:teams!team_a_id(id,name,short_name,logo_path),team_b:teams!team_b_id(id,name,short_name,logo_path)",
        )
        .order("match_day", {
          ascending: true,
        })
        .order("match_order", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      setMatches(
        (data ?? []) as unknown as Match[],
      );
    } catch (error) {
      console.error(
        "Failed to load admin matches:",
        error,
      );
      toast.error(
        "Unable to load match schedule.",
      );
    } finally {
      setLoadingMatches(false);
    }
  }, [supabase]);

  useEffect(() => {
    const isAuthenticated =
      window.sessionStorage.getItem(
        ADMIN_SESSION_KEY,
      ) === "true";

    setAuthState(
      isAuthenticated
        ? "authenticated"
        : "anonymous",
    );
  }, []);

  useEffect(() => {
    if (authState !== "authenticated") {
      return;
    }

    void fetchMatches();

    const channel = supabase
      .channel("simple-admin-matches")
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
  }, [
    authState,
    fetchMatches,
    supabase,
  ]);

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

  const login = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      username === ADMIN_USERNAME &&
      password === ADMIN_PASSWORD
    ) {
      window.sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        "true",
      );
      setPassword("");
      setAuthState("authenticated");
      toast.success(
        "Admin login successful.",
      );
      return;
    }

    toast.error(
      "Incorrect username or password.",
    );
  };

  const logout = () => {
    window.sessionStorage.removeItem(
      ADMIN_SESSION_KEY,
    );
    setMatches([]);
    setAuthState("anonymous");
  };

  const mutateMatch = async (
    matchId: string,
    command: AdminMatchCommand,
  ) => {
    setBusyMatchId(matchId);

    try {
      const update =
        commandToMatchUpdate(command);
      const { error } = await supabase
        .from("matches")
        .update(update)
        .eq("id", matchId);

      if (error) {
        throw error;
      }

      await fetchMatches();

      toast.success(
        command.action === "finish"
          ? "Result saved and standings updated."
          : command.action === "reset"
            ? "Match reset to scheduled."
            : "Match started.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update match.",
      );
    } finally {
      setBusyMatchId(null);
    }
  };

  if (authState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void p-6">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </main>
    );
  }

  if (authState === "anonymous") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-void p-6">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-gunmetal p-7 shadow-2xl shadow-black/30"
        >
          <div className="mb-7 flex items-center gap-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3">
              <LockKeyhole className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Tournament Admin
              </p>
              <h1 className="font-teko text-4xl font-bold uppercase text-white">
                Admin Control
              </h1>
            </div>
          </div>

          {!ADMIN_PASSWORD && (
            <p className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
              Missing configuration:
              NEXT_PUBLIC_ADMIN_PASSWORD.
            </p>
          )}

          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Username
          </label>
          <input
            value={username}
            onChange={(event) =>
              setUsername(
                event.target.value,
              )
            }
            autoComplete="username"
            className="mb-5 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-primary"
          />

          <label className="mb-2 block text-sm font-semibold text-slate-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-primary"
          />

          <button
            type="submit"
            disabled={
              !username ||
              !password ||
              !ADMIN_PASSWORD
            }
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold uppercase text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockKeyhole className="h-5 w-5" />
            Login
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void px-4 py-8 text-slate-200 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-white/10 bg-gunmetal p-6 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-primary/10 p-3">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                Summer 2026
              </p>
              <h1 className="font-teko text-4xl font-bold uppercase text-white sm:text-5xl">
                Match Control
              </h1>
              <p className="text-sm text-slate-400">
                Fixed 36-match schedule ·
                BO3 · live standings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-loss/40 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>

        {loadingMatches &&
        matches.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {groupedMatches.map(
              ([day, dayMatches]) => (
                <section
                  key={day}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-gunmetal"
                >
                  <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-5 py-4 sm:px-7">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                        Round Robin
                      </p>
                      <h2 className="font-teko text-3xl font-bold uppercase text-white">
                        Match Day {day}
                      </h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
                      4 matches
                    </span>
                  </div>

                  <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-6">
                    {dayMatches.map(
                      (match) => {
                        const isBusy =
                          busyMatchId ===
                          match.id;

                        return (
                          <article
                            key={match.id}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Match{" "}
                                {
                                  match.match_order
                                }
                              </span>
                              <span
                                className={clsx(
                                  "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                                  match.status ===
                                    "scheduled" &&
                                    "bg-white/5 text-slate-400",
                                  match.status ===
                                    "live" &&
                                    "bg-loss/10 text-red-300",
                                  match.status ===
                                    "finished" &&
                                    "bg-win/10 text-emerald-300",
                                )}
                              >
                                {match.status ===
                                "scheduled"
                                  ? "Scheduled"
                                  : match.status ===
                                      "live"
                                    ? "Live"
                                    : "Final"}
                              </span>
                            </div>

                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                              <div className="min-w-0 text-center">
                                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                                  {match.team_a
                                    .logo_path && (
                                    <Image
                                      src={
                                        match
                                          .team_a
                                          .logo_path
                                      }
                                      alt={
                                        match
                                          .team_a
                                          .short_name
                                      }
                                      width={56}
                                      height={56}
                                      className="h-full w-full object-contain p-1"
                                    />
                                  )}
                                </div>
                                <p className="truncate font-teko text-2xl font-bold uppercase text-white">
                                  {
                                    match.team_a
                                      .short_name
                                  }
                                </p>
                              </div>

                              <div className="text-center">
                                <p className="font-teko text-4xl font-bold text-white">
                                  {match.score_a ??
                                    "–"}
                                  <span className="mx-2 text-slate-600">
                                    :
                                  </span>
                                  {match.score_b ??
                                    "–"}
                                </p>
                              </div>

                              <div className="min-w-0 text-center">
                                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                                  {match.team_b
                                    .logo_path && (
                                    <Image
                                      src={
                                        match
                                          .team_b
                                          .logo_path
                                      }
                                      alt={
                                        match
                                          .team_b
                                          .short_name
                                      }
                                      width={56}
                                      height={56}
                                      className="h-full w-full object-contain p-1"
                                    />
                                  )}
                                </div>
                                <p className="truncate font-teko text-2xl font-bold uppercase text-white">
                                  {
                                    match.team_b
                                      .short_name
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-6">
                              {match.status ===
                                "scheduled" && (
                                <button
                                  type="button"
                                  disabled={
                                    isBusy
                                  }
                                  onClick={() =>
                                    void mutateMatch(
                                      match.id,
                                      {
                                        action:
                                          "start",
                                      },
                                    )
                                  }
                                  className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase text-black disabled:opacity-50 sm:col-span-1"
                                >
                                  <Play className="h-4 w-4" />
                                  Start
                                </button>
                              )}

                              {resultPresets.map(
                                (result) => (
                                  <button
                                    key={
                                      result.label
                                    }
                                    type="button"
                                    disabled={
                                      isBusy
                                    }
                                    onClick={() =>
                                      void mutateMatch(
                                        match.id,
                                        {
                                          action:
                                            "finish",
                                          scoreA:
                                            result.scoreA,
                                          scoreB:
                                            result.scoreB,
                                        },
                                      )
                                    }
                                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-teko text-lg font-bold text-white transition hover:border-win/40 hover:text-emerald-300 disabled:opacity-50"
                                  >
                                    {
                                      result.label
                                    }
                                  </button>
                                ),
                              )}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Reset this match to scheduled?",
                                    )
                                  ) {
                                    void mutateMatch(
                                      match.id,
                                      {
                                        action:
                                          "reset",
                                      },
                                    );
                                  }
                                }}
                                className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold uppercase text-slate-400 transition hover:border-loss/40 hover:text-red-300 disabled:opacity-50 sm:col-span-1"
                              >
                                {isBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                                Reset
                              </button>
                            </div>

                            {match.status ===
                              "finished" && (
                              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                                Result included
                                in standings
                              </div>
                            )}
                          </article>
                        );
                      },
                    )}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </main>
  );
}
