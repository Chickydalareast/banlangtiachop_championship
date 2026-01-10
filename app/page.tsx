"use client";

import { useState } from "react";
import Image from "next/image"; // Nhớ import Image
import LeaderboardTable from "@/components/features/LeaderboardTable";
import MatchesList from "@/components/features/MatchesList";
import clsx from "clsx";
import { Trophy, Swords } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'rankings' | 'matches'>('rankings');

  return (
    <main className="min-h-screen bg-void bg-noise bg-cover bg-fixed text-white selection:bg-primary selection:text-white pb-20 relative overflow-hidden">

      {/* --- [NEW] BACKGROUND LOGO LAYER (LỚP LOGO CHÌM) --- */}
      {/* pointer-events-none: Để chuột bấm xuyên qua được logo, không bị chặn nút bấm */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        {/* Điều chỉnh độ mờ (opacity) ở đây. opacity-5 hoặc opacity-10 là đẹp nhất */}
        <div className="relative w-[100vw] h-[100vw] md:w-[900px] md:h-[900px] opacity-10 grayscale mix-blend-overlay">
          <Image
            src="/images/logoRealVer.png"
            alt="Background Watermark"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* --- [OLD] BACKGROUND DECOR (GIỮ NGUYÊN HIỆU ỨNG SÁNG) --- */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      {/* --- MAIN CONTENT (NỔI LÊN TRÊN) --- */}
      {/* Thêm relative z-10 để nội dung đè lên logo nền */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 md:py-20">

        {/* Header Section */}
        <div className="flex flex-col items-center justify-center mb-12 space-y-6">
          {/* Logo Chính (Nổi bật) */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 animate-in zoom-in duration-700">
            <Image
              src="/images/tournament-logo.png" // Dùng luôn logo này làm logo chính nếu muốn
              alt="Tournament Logo"
              fill
              className="object-contain drop-shadow-[0_0_30px_rgba(255,85,0,0.6)]"
              priority
            />
          </div>

          <div className="text-center">
            <h2 className="text-primary font-teko tracking-widest text-xl md:text-2xl uppercase font-bold opacity-80 animate-pulse">
              Spring Season 2026
            </h2>
            <h1 className="font-teko text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-lg">
                Ban Lang Tia Chop
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FCD34D] to-[#B45309] drop-shadow-[0_0_25px_rgba(255,85,0,0.4)]">
                Championship Spring 2026
              </span>
            </h1>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex justify-center mb-12">
          <div className="flex bg-gunmetal/50 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">

            <button
              onClick={() => setActiveTab('rankings')}
              className={clsx(
                "px-6 md:px-10 py-3 rounded-lg font-teko text-2xl tracking-wide transition-all duration-300 flex items-center gap-2",
                activeTab === 'rankings'
                  ? "bg-primary text-white shadow-[0_0_20px_rgba(255,85,0,0.4)] scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Trophy className="w-5 h-5 mb-1" /> Standings
            </button>

            <button
              onClick={() => setActiveTab('matches')}
              className={clsx(
                "px-6 md:px-10 py-3 rounded-lg font-teko text-2xl tracking-wide transition-all duration-300 flex items-center gap-2",
                activeTab === 'matches'
                  ? "bg-primary text-white shadow-[0_0_20px_rgba(255,85,0,0.4)] scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Swords className="w-5 h-5 mb-1" /> Matches
            </button>

          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="min-h-[500px]">
          {activeTab === 'rankings' ? (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <LeaderboardTable />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <MatchesList />
            </div>
          )}
        </div>

      </div>
    </main>
  );
}