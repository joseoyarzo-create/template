import { supabase } from '@/lib/supabase'
import { unwrap } from '@/lib/errors'
import type { BlockType, ScheduleBlock } from '@/types/database'

/* ============= Bloqueos: feriados, vacaciones y cierres puntuales ========= */

export async function listBlocks(
  businessId: string,
  options: { fromIso?: string; toIso?: string } = {},
): Promise<ScheduleBlock[]> {
  let query = supabase
    .from('schedule_blocks')
    .select('*')
    .eq('business_id', businessId)
    .order('starts_at', { ascending: true })

  if (options.fromIso) query = query.gte('ends_at', options.fromIso)
  if (options.toIso) query = query.lte('starts_at', options.toIso)

  const { data, error } = await query
  return unwrap<ScheduleBlock[]>({ data: data as ScheduleBlock[] | null, error })
}

export interface BlockInput {
  business_id: string
  staff_id: string | null
  block_type: BlockType
  all_day: boolean
  starts_at: string
  ends_at: string
  reason?: string | null
}

export async function createBlock(input: BlockInput): Promise<ScheduleBlock> {
  const { data, error } = await supabase.from('schedule_blocks').insert(input).select('*').single()
  return unwrap<ScheduleBlock>({ data: data as ScheduleBlock | null, error })
}

export async function updateBlock(id: string, patch: Partial<BlockInput>): Promise<ScheduleBlock> {
  const { data, error } = await supabase
    .from('schedule_blocks')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  return unwrap<ScheduleBlock>({ data: data as ScheduleBlock | null, error })
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('schedule_blocks').delete().eq('id', id)
  if (error) throw error
}
