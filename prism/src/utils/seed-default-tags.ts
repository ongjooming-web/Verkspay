import { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_TAGS = [
  { name: 'VIP', color: '#F59E0B', is_system: true },              // amber
  { name: 'High Value', color: '#8B5CF6', is_system: true },       // purple
  { name: 'Recurring', color: '#3B82F6', is_system: true },        // blue
  { name: 'Late Payer', color: '#EF4444', is_system: true },       // red
  { name: 'New', color: '#10B981', is_system: true },              // green
  { name: 'At Risk', color: '#F97316', is_system: true },          // orange
  { name: 'Inactive', color: '#6B7280', is_system: true }          // gray
]

export async function seedDefaultTags(userId: string, supabase: SupabaseClient) {
  try {
    // Check if user already has any tags
    const { data: existingTags, error: checkError } = await supabase
      .from('client_tags')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (checkError) {
      console.error('[SeedDefaultTags] Error checking existing tags:', checkError)
      return
    }

    // If user already has tags, don't seed
    if ((existingTags || []).length > 0) {
      console.log('[SeedDefaultTags] User already has tags, skipping seed')
      return
    }

    // Insert default tags
    const tagsToInsert = DEFAULT_TAGS.map((tag) => ({
      user_id: userId,
      name: tag.name,
      color: tag.color,
      is_system: tag.is_system
    }))

    const { error: insertError } = await supabase
      .from('client_tags')
      .insert(tagsToInsert)

    if (insertError) {
      console.error('[SeedDefaultTags] Error seeding default tags:', insertError)
      return
    }

    console.log('[SeedDefaultTags] Successfully seeded', tagsToInsert.length, 'default tags for user', userId)
  } catch (err) {
    console.error('[SeedDefaultTags] Error:', err)
  }
}
