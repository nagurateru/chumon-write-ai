import type { SupabaseClient } from '@supabase/supabase-js'

export const MONTHLY_LIMIT = 30

/** 日本時間の今月1日 0:00 を ISO 文字列で返す（サーバーが UTC でもずれないように） */
export function startOfMonthJst(now = new Date()): string {
  const JST_OFFSET = 9 * 60 * 60 * 1000
  const jst = new Date(now.getTime() + JST_OFFSET)
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1) - JST_OFFSET).toISOString()
}

/** 今月の生成回数（ブラウザ・サーバー共通） */
export async function countMonthlyUsage(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('generation_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonthJst())
  if (error) console.error('usage count error:', error)
  return count ?? 0
}
