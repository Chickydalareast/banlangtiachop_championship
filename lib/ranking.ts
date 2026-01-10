import { Match, Standing } from "@/types/database.types";

export const sortStandings = (standings: Standing[], matches: Match[]) => {
  // Tạo bản sao mảng để tránh mutation
  return [...standings].sort((a, b) => {
    
    // ƯU TIÊN 1: Tổng điểm (Points) - Cao xếp trên
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // ƯU TIÊN 2: Hiệu số ván thắng bại (Map Difference) - Cao xếp trên
    if (a.map_diff !== b.map_diff) {
      return b.map_diff - a.map_diff;
    }

    // ƯU TIÊN 3: Đối đầu trực tiếp (Head-to-Head)
    // Tìm trận đấu đã kết thúc giữa 2 đội này
    const match = matches.find(
      (m) =>
        m.status === "finished" &&
        ((m.team_a_id === a.team_id && m.team_b_id === b.team_id) ||
         (m.team_a_id === b.team_id && m.team_b_id === a.team_id))
    );

    if (match) {
      // Xác định ai là A, ai là B trong trận đấu đó để so sánh
      // Lưu ý: a và b ở đây là row trong bảng standings, còn match.team_a_id là cột trong bảng matches
      const scoreA = match.team_a_id === a.team_id ? match.score_a : match.score_b;
      const scoreB = match.team_a_id === b.team_id ? match.score_b : match.score_a;

      if (scoreA > scoreB) return -1; // Đội A thắng đối đầu -> A xếp trên (return -1 để đẩy lên đầu)
      if (scoreB > scoreA) return 1;  // Đội B thắng đối đầu -> B xếp trên
    }

    // ƯU TIÊN 4: Nếu vẫn hòa (hoặc chưa đá với nhau), xếp theo tên (Alphabet)
    // Để danh sách không bị nhảy loạn xạ mỗi lần refresh
    return (a.teams?.name || "").localeCompare(b.teams?.name || "");
  });
};