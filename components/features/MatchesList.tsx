"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Match } from "@/types/database.types";
import clsx from "clsx";
import { Calendar, Clock } from "lucide-react";

export default function MatchesList() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchMatches = async () => {
      const { data } = await supabase
        .from("matches")
        .select(`*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)`)
        .order("match_day", { ascending: true }) // Sắp xếp theo ngày trước
        .order("created_at", { ascending: true }); // Sau đó theo thứ tự tạo

      if (data) setMatches(data as any);
      setLoading(false);
    };

    fetchMatches();

    // Realtime: Tự động cập nhật khi Admin sửa tỉ số hoặc đổi trạng thái
    const channel = supabase
      .channel("realtime-matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchMatches())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Hàm gom nhóm trận đấu theo ngày (Group by Match Day)
  const groupedMatches = matches.reduce((acc, match) => {
    const day = match.match_day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  if (loading) return <div className="text-center text-slate-500 py-10 font-teko text-xl">Loading Schedule...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {Object.entries(groupedMatches).map(([day, dayMatches]) => (
        <div key={day} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Day Header */}
          <div className="flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20"></div>
            <h3 className="text-primary font-teko font-bold text-3xl uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-5 h-5 mb-1" /> Match Day {day}
            </h3>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20"></div>
          </div>

          {/* Matches Grid */}
          <div className="grid gap-4">
            {dayMatches.map((match) => (
              <div 
                key={match.id}
                className={clsx(
                  "relative bg-gunmetal/40 border rounded-lg p-4 md:p-6 flex items-center justify-between transition-all hover:bg-gunmetal/60",
                  // Hiệu ứng viền: Nếu LIVE thì viền đỏ rực, Xong thì viền tối, Chưa đá thì viền xám
                  match.status === 'live' ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : 
                  match.status === 'finished' ? "border-slate-800" : "border-slate-700"
                )}
              >
                {/* Trạng thái LIVE badge (Absolute) */}
                {match.status === 'live' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold px-3 py-0.5 rounded-full animate-pulse shadow-lg tracking-wider">
                    LIVE NOW
                  </div>
                )}

                {/* TEAM A (Left) */}
                <div className="flex-1 flex flex-col md:flex-row items-center gap-3 md:gap-6 justify-end text-right">
                  <span className={clsx("font-teko font-bold text-2xl md:text-4xl uppercase tracking-wide", match.score_a > match.score_b && match.status === 'finished' ? "text-win" : "text-white")}>
                    {match.team_a?.short_name}
                  </span>
                  <div className="relative w-12 h-12 md:w-16 md:h-16">
                    <Image src={match.team_a?.logo_path || '/placeholder.png'} alt="Team A" fill className="object-contain drop-shadow-lg" />
                  </div>
                </div>

                {/* SCORE / VS (Center) */}
                <div className="w-24 md:w-32 flex flex-col items-center justify-center mx-2 md:mx-4 shrink-0">
                  {match.status === 'scheduled' ? (
                    <div className="text-center">
                      <span className="block font-teko text-3xl text-slate-600 font-bold">VS</span>
                      <div className="flex items-center gap-1 text-slate-500 text-xs font-inter mt-1">
                        <Clock className="w-3 h-3" /> 19:00 {/* Giả lập giờ, sau này có thể thêm cột time vào DB */}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 md:gap-4 font-teko font-black text-4xl md:text-6xl text-white">
                      <span className={clsx(match.status === 'live' ? "text-white" : match.score_a > match.score_b ? "text-win" : match.score_a < match.score_b ? "text-loss" : "text-slate-400")}>
                        {match.score_a}
                      </span>
                      <span className="text-slate-600 text-2xl md:text-4xl">-</span>
                      <span className={clsx(match.status === 'live' ? "text-white" : match.score_b > match.score_a ? "text-win" : match.score_b < match.score_a ? "text-loss" : "text-slate-400")}>
                        {match.score_b}
                      </span>
                    </div>
                  )}
                </div>

                {/* TEAM B (Right) */}
                <div className="flex-1 flex flex-col-reverse md:flex-row items-center gap-3 md:gap-6 justify-start text-left">
                  <div className="relative w-12 h-12 md:w-16 md:h-16">
                    <Image src={match.team_b?.logo_path || '/placeholder.png'} alt="Team B" fill className="object-contain drop-shadow-lg" />
                  </div>
                  <span className={clsx("font-teko font-bold text-2xl md:text-4xl uppercase tracking-wide", match.score_b > match.score_a && match.status === 'finished' ? "text-win" : "text-white")}>
                    {match.team_b?.short_name}
                  </span>
                </div>

              </div>
            ))}
          </div>
        </div>
      ))}

      {matches.length === 0 && (
        <div className="text-center text-slate-600 italic">Chưa có lịch thi đấu được công bố.</div>
      )}
    </div>
  );
}