"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Match, Team } from "@/types/database.types";
import { toast } from "sonner";
import { Loader2, Zap, Trash2, Save, CheckCircle, RotateCcw } from "lucide-react";
import clsx from "clsx";

export default function AdminDashboard() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [matchDay, setMatchDay] = useState(1);

    // Form tạo nhanh: Chỉ cần chọn 2 đội
    const [quickA, setQuickA] = useState("");
    const [quickB, setQuickB] = useState("");

    const supabase = createClient();

    const fetchData = async () => {
        setLoading(true);
        // Lấy matches: Mới nhất lên đầu
        const matchesReq = supabase
            .from("matches")
            .select(`*, team_a:teams!team_a_id(*), team_b:teams!team_b_id(*)`)
            .order("created_at", { ascending: false });

        const teamsReq = supabase.from("teams").select("*").eq("is_active", true).order("name");

        const [matchesRes, teamsRes] = await Promise.all([matchesReq, teamsReq]);
        if (matchesRes.data) setMatches(matchesRes.data as any);
        if (teamsRes.data) setTeams(teamsRes.data as any);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // --- HÀM TẠO NHANH (INSTANT CREATE) ---
    const handleQuickCreate = async () => {
        if (!quickA || !quickB) return toast.error("Chọn đủ 2 đội đi sếp!");
        if (quickA === quickB) return toast.error("2 đội giống nhau sao đá?");

        // Tạo trận với đúng Match Day bạn chọn
        const { error } = await supabase.from("matches").insert({
            team_a_id: quickA,
            team_b_id: quickB,
            match_day: matchDay,
            status: "live",
            score_a: 0,
            score_b: 0
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success(`Đã tạo trận ${matchDay === 1 ? 'Lượt đi' : 'Lượt về'} thành công!`);
            setQuickA("");
            setQuickB("");
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa trận này nhé?")) return;
        await supabase.from("matches").delete().eq("id", id);
        toast.success("Đã xóa.");
        fetchData();
    };

    const updateMatch = async (matchId: string, updates: Partial<Match>) => {
        // Optimistic Update cho mượt
        setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, ...updates } : m)));

        // Nếu bấm "Kết thúc", hỏi lại cho chắc
        if (updates.status === 'finished') {
            if (!confirm("Chốt sổ trận này? BXH sẽ cập nhật ngay.")) {
                fetchData(); return; // Revert nếu cancel
            }
        }

        const { error } = await supabase.from("matches").update(updates).eq("id", matchId);
        if (error) {
            toast.error("Lỗi: " + error.message);
            fetchData();
        } else {
            if (updates.status === 'finished') toast.success("Đã chốt điểm & Cập nhật BXH!");
        }
    };

    const [isAuth, setIsAuth] = useState(false);
    const [pass, setPass] = useState("");

    if (!isAuth) {
        return (
            <div className="h-screen bg-void flex flex-col items-center justify-center gap-4">
                <h1 className="text-white font-teko text-2xl">ADMIN ACCESS</h1>
                <input
                    type="password"
                    className="bg-gunmetal border border-slate-700 p-2 text-white rounded"
                    placeholder="Enter Code"
                    onChange={(e) => setPass(e.target.value)}
                />
                <button
                    className="bg-primary text-white px-4 py-2 rounded font-teko"
                    onClick={() => pass === "admin123" ? setIsAuth(true) : alert("Sai mật khẩu!")}
                >
                    LOGIN
                </button>
            </div>
        );
    }

    if (loading) return <div className="flex h-screen items-center justify-center text-primary"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-void p-4 pb-40 font-inter text-slate-200">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-teko font-bold uppercase text-white">Admin Control</h1>
                    <div className="text-xs text-slate-500">Auto-save enabled</div>
                </div>

                {/* --- KHU VỰC TẠO NHANH (QUICK BAR) --- */}
                <div className="bg-gunmetal border border-primary/30 p-4 rounded-xl shadow-[0_0_20px_rgba(255,85,0,0.1)]">
                    <div className="flex items-center gap-2 mb-2 text-primary font-bold uppercase text-sm">
                        <Zap className="w-4 h-4" /> Tạo Trận Mới
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
                        {/* Chọn Vòng đấu (Lượt đi / Về) */}
                        <select
                            className="w-full md:w-32 bg-black/50 border border-slate-600 rounded p-3 text-white outline-none focus:border-primary font-bold text-center"
                            value={matchDay}
                            onChange={(e) => setMatchDay(Number(e.target.value))}
                        >
                            <option value="1">Lượt đi</option>
                            <option value="2">Lượt về</option>
                            <option value="3">Tie-break</option>
                        </select>

                        {/* Chọn Đội A */}
                        <select
                            className="flex-1 bg-black/50 border border-slate-600 rounded p-3 text-white outline-none focus:border-primary"
                            value={quickA} onChange={(e) => setQuickA(e.target.value)}
                        >
                            <option value="">Chọn Đội A...</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.short_name}</option>)}
                        </select>

                        <span className="self-center font-teko text-xl text-slate-500 hidden md:block">VS</span>

                        {/* Chọn Đội B */}
                        <select
                            className="flex-1 bg-black/50 border border-slate-600 rounded p-3 text-white outline-none focus:border-primary"
                            value={quickB} onChange={(e) => setQuickB(e.target.value)}
                        >
                            <option value="">Chọn Đội B...</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.short_name}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={handleQuickCreate}
                        className="w-full mt-3 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded uppercase tracking-wider transition-all active:scale-95"
                    >
                        Bắt đầu trận đấu ngay
                    </button>
                </div>

                {/* --- DANH SÁCH TRẬN ĐẤU (ĐANG DIỄN RA & VỪA XONG) --- */}
                <div className="space-y-4">
                    {matches.map((match) => (
                        <div key={match.id} className={clsx(
                            "relative border rounded-lg p-4 transition-all",
                            match.status === 'live' ? "bg-gunmetal border-red-500 shadow-md" : "bg-black/20 border-slate-800 opacity-60 hover:opacity-100"
                        )}>
                            {/* Status & Day Label (Đoạn này đã được nâng cấp) */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
                                {/* 1. Nhãn Lượt đi / Lượt về (Cái bạn đang thiếu) */}
                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full border bg-black border-slate-600 text-slate-300 shadow-sm">
                                    {match.match_day === 1 ? 'Lượt đi' : match.match_day === 2 ? 'Lượt về' : `Day ${match.match_day}`}
                                </span>

                                {/* 2. Nhãn Status (Cũ) */}
                                <span className={clsx(
                                    "text-[10px] font-bold uppercase px-3 py-1 rounded-full border shadow-sm",
                                    match.status === 'live' ? "bg-red-600 border-red-500 text-white animate-pulse" : "bg-slate-800 border-slate-700 text-slate-400"
                                )}>
                                    {match.status}
                                </span>
                            </div>

                            {/* Delete Button (Góc phải) */}
                            <button onClick={() => handleDelete(match.id)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 p-2">
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {/* SCORING AREA */}
                            <div className="flex items-center justify-between mt-2 gap-4">
                                {/* TEAM A */}
                                <div className="flex-1 text-center">
                                    <div className="font-teko text-2xl font-bold mb-1">{match.team_a?.short_name}</div>
                                    <input
                                        type="number"
                                        className="w-full h-16 text-center text-5xl font-teko bg-black/40 border border-slate-600 rounded focus:border-primary outline-none"
                                        value={match.score_a}
                                        onChange={(e) => updateMatch(match.id, { score_a: Number(e.target.value) })}
                                        disabled={match.status === 'finished'}
                                    />
                                </div>

                                {/* Middle Action */}
                                <div className="w-24 flex flex-col items-center gap-2">
                                    {match.status === 'live' ? (
                                        <button
                                            onClick={() => updateMatch(match.id, { status: 'finished' })}
                                            className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-bold uppercase flex flex-col items-center gap-1"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Chốt Sổ
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => updateMatch(match.id, { status: 'live' })}
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-bold uppercase flex flex-col items-center gap-1"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Mở Lại
                                        </button>
                                    )}
                                </div>

                                {/* TEAM B */}
                                <div className="flex-1 text-center">
                                    <div className="font-teko text-2xl font-bold mb-1">{match.team_b?.short_name}</div>
                                    <input
                                        type="number"
                                        className="w-full h-16 text-center text-5xl font-teko bg-black/40 border border-slate-600 rounded focus:border-primary outline-none"
                                        value={match.score_b}
                                        onChange={(e) => updateMatch(match.id, { score_b: Number(e.target.value) })}
                                        disabled={match.status === 'finished'}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}