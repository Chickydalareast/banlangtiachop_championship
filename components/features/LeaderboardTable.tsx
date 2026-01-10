"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Standing } from "@/types/database.types";
import { ArrowUp, ArrowDown, Minus, Crown, Skull } from "lucide-react"; 
import clsx from "clsx";
import { sortStandings } from "@/lib/ranking"; 
import { Match } from "@/types/database.types";

export default function LeaderboardTable() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Gọi song song 2 request: Lấy BXH và Lấy Lịch sử đấu
      const standingsReq = supabase
        .from("standings")
        .select(`*, teams(id, name, logo_path, short_name)`);
        
      const matchesReq = supabase
        .from("matches")
        .select("*")
        .eq("status", "finished"); // Chỉ cần lấy trận đã đấu để xét đối đầu

      const [standingsRes, matchesRes] = await Promise.all([standingsReq, matchesReq]);
      
      if (standingsRes.data && matchesRes.data) {
         // --- MAGIC HAPPENS HERE ---
         // Thay vì setStandings(standingsRes.data) luôn, ta qua hàm lọc
         const sortedData = sortStandings(
            standingsRes.data as any, 
            matchesRes.data as any
         );
         setStandings(sortedData);
      }
    };

    fetchData();

    // Subscribe cả 2 bảng để realtime chuẩn xác
    const channel = supabase
      .channel("realtime-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "standings" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-2">
      {/* HEADER */}
      <div className="grid grid-cols-[1fr_3.5fr_1.5fr_1.5fr_1.5fr] md:grid-cols-[0.8fr_4fr_1fr_1fr_1fr] px-4 py-3 border-b-2 border-white/10 text-slate-500 font-teko font-bold text-xl md:text-2xl uppercase tracking-widest">
        <div className="text-center">#</div>
        <div className="text-left pl-2">Team</div>
        <div className="text-center">M</div>
        <div className="text-center">GD</div>
        <div className="text-center text-primary">PTS</div>
      </div>

      {/* ROWS */}
      <div className="flex flex-col gap-2 relative">
        {standings.map((team, index) => {
          // Logic xác định Top 4 (Playoff) và Bottom 2 (Loại)
          // Giả sử giải có 7 đội thì index 5 và 6 là 2 đội cuối
          const isBottomTwo = index >= standings.length - 2; 
          const isTopFour = index < 4;

          return (
            <div key={team.team_id} className="contents">
              {/* Vạch kẻ đỏ "Elimination Line" ngăn cách nhóm an toàn và nhóm nguy hiểm */}
              {index === standings.length - 2 && (
                 <div className="relative h-px w-full bg-gradient-to-r from-transparent via-red-600/50 to-transparent my-2 flex items-center justify-center">
                    <span className="bg-void px-2 text-[10px] text-red-500 font-inter uppercase tracking-widest border border-red-900/30 rounded">
                      Elimination Zone
                    </span>
                 </div>
              )}

              <div
                className={clsx(
                  "relative grid grid-cols-[1fr_3.5fr_1.5fr_1.5fr_1.5fr] md:grid-cols-[0.8fr_4fr_1fr_1fr_1fr] items-center px-4 py-3 rounded-r-lg border-l-4 transition-all duration-500 group",
                  // 1. STYLE CHO TOP 1 (Vua)
                  index === 0 ? "border-yellow-400 bg-gradient-to-r from-yellow-500/10 to-transparent z-10 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.1)]" :
                  // 2. STYLE CHO BOTTOM 2 (Bóng ma - Bị loại)
                  isBottomTwo ? "border-slate-800 bg-transparent opacity-40 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-100 scale-[0.98]" :
                  // 3. STYLE CHO TOP 4 (Playoff)
                  isTopFour ? "border-primary/50 bg-gunmetal/60" : 
                  // 4. STYLE BÌNH THƯỜNG
                  "border-slate-700 bg-gunmetal/30"
                )}
              >
                {/* RANK & STATUS ICON */}
                <div className="flex flex-col items-center justify-center">
                  <span className={clsx(
                    "font-teko font-bold text-3xl md:text-4xl leading-none",
                    index === 0 ? "text-yellow-400" : isBottomTwo ? "text-slate-600" : "text-white"
                  )}>
                    {index + 1}
                  </span>
                  <div className="mt-1">
                     {index === 0 ? <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" /> : 
                      isBottomTwo ? <Skull className="w-3 h-3 text-slate-500" /> : // Icon đầu lâu cho đội bét bảng
                      team.trend > 0 ? <ArrowUp className="text-win w-4 h-4" /> : 
                      team.trend < 0 ? <ArrowDown className="text-loss w-4 h-4" /> : 
                      <Minus className="text-slate-700 w-3 h-3" />}
                  </div>
                </div>

                {/* TEAM INFO */}
                <div className="flex items-center gap-3 pl-2 overflow-hidden">
                  <div className="relative w-10 h-10 md:w-14 md:h-14 flex-shrink-0">
                    <Image 
                      src={team.teams?.logo_path || '/placeholder.png'} 
                      alt={team.teams?.short_name || 'Team'} 
                      fill 
                      className="object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className={clsx(
                    "font-teko font-bold text-2xl md:text-4xl tracking-wide uppercase truncate transition-colors",
                    index === 0 ? "text-white" : isBottomTwo ? "text-slate-500 group-hover:text-slate-300" : "text-slate-200"
                  )}>
                    {team.teams?.short_name}
                  </span>
                </div>

                {/* STATS COLUMNS (Mờ hơn nếu ở nhóm cuối) */}
                <div className={clsx("text-center font-teko font-bold text-2xl md:text-3xl", isBottomTwo ? "text-slate-600" : "text-slate-400")}>
                  {team.played}
                </div>

                <div className={clsx(
                  "text-center font-teko font-bold text-2xl md:text-3xl",
                  isBottomTwo ? "text-slate-600" : team.map_diff > 0 ? "text-win" : team.map_diff < 0 ? "text-loss" : "text-slate-500"
                )}>
                  {team.map_diff > 0 ? `+${team.map_diff}` : team.map_diff}
                </div>

                <div className={clsx(
                  "text-center font-teko font-black text-4xl md:text-5xl transition-all",
                  isBottomTwo ? "text-slate-600" : "text-primary drop-shadow-[0_0_15px_rgba(255,85,0,0.6)]"
                )}>
                  {team.points}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}