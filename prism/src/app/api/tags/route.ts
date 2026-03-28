import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/tags - List all tags for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id

    // Get all tags with client count
    const { data: tags, error: tagsError } = await supabase
      .from('client_tags')
      .select(`
        id,
        name,
        color,
        created_at,
        client_tag_assignments(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (tagsError) {
      console.error('[Tags] Error fetching tags:', tagsError)
      return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
    }

    const formattedTags = (tags || []).map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      created_at: tag.created_at,
      client_count: tag.client_tag_assignments?.length || 0
    }))

    return NextResponse.json({ tags: formattedTags })
  } catch (err) {
    console.error('[Tags] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tags - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data, error: authError } = await supabase.auth.getUser(token)

    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = data.user.id
    const body = await request.json()
    const { name, color } = body

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    if (name.trim().length > 30) {
      return NextResponse.json({ error: 'Tag name must be 30 characters or less' }, { status: 400 })
    }

    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json({ error: 'Invalid color format (must be hex like #FF0000)' }, { status: 400 })
    }

    // Create tag
    const { data: newTag, error: createError } = await supabase
      .from('client_tags')
      .insert([{
        user_id: userId,
        name: name.trim(),
        color: color.toUpperCase()
      }])
      .select()
      .single()

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'Tag name already exists' }, { status: 400 })
      }
      console.error('[Tags] Error creating tag:', createError)
      return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
    }

    return NextResponse.json({
      id: newTag.id,
      name: newTag.name,
      color: newTag.color,
      created_at: newTag.created_at,
      client_count: 0
    }, { status: 201 })
  } catch (err) {
    console.error('[Tags] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
