import { createClient } from '@/lib/supabase/client'; // Đảm bảo bạn đã setup supabase client
import { Standing } from '@/types/database.types';

export const getStandings = async (): Promise<Standing[]> => {
  const supabase = createClient();
  
  // 1. Lấy dữ liệu từ bảng standings và join với bảng teams để lấy tên/logo
  const { data, error } = await supabase
    .from('standings')
    .select(`
      *,
      teams (
        id,
        name,
        short_name,
        logo_path
      )
    `)
    .order('points', { ascending: false })
    .order('map_diff', { ascending: false }); // Sort sơ bộ bằng SQL

  if (error) {
    console.error('Error fetching standings:', error);
    return [];
  }

  // Cast kiểu dữ liệu trả về
  return data as unknown as Standing[];
};