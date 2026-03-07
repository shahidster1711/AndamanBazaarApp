import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';

interface SyncRequest {
  entityType: 'listing' | 'message' | 'profile_update';
  operation: 'create' | 'update' | 'delete';
  payload: any;
  clientTimestamp: string;
}

interface SyncResponse {
  success: boolean;
  serverId?: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user and get their ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const syncRequest: SyncRequest = await req.json();

    // Validate request structure
    if (!syncRequest.entityType || !syncRequest.operation || !syncRequest.payload) {
      return new Response(
        JSON.stringify({ error: 'Invalid request structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process sync based on entity type
    let result: SyncResponse;

    switch (syncRequest.entityType) {
      case 'listing':
        result = await handleListingSync(supabase, userId, syncRequest);
        break;
      case 'message':
        result = await handleMessageSync(supabase, userId, syncRequest);
        break;
      case 'profile_update':
        result = await handleProfileUpdateSync(supabase, userId, syncRequest);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid entity type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Secure sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleListingSync(
  supabase: any,
  userId: string,
  request: SyncRequest
): Promise<SyncResponse> {
  const payload = request.payload;

  // Validate required fields
  if (!payload.title || !payload.price || !payload.category_id || !payload.city) {
    return { success: false, error: 'Missing required fields for listing' };
  }

  // Validate data types and ranges
  if (typeof payload.price !== 'number' || payload.price <= 0) {
    return { success: false, error: 'Invalid price' };
  }

  if (payload.title.length > 200) {
    return { success: false, error: 'Title too long' };
  }

  // Ensure user_id matches authenticated user
  payload.user_id = userId;

  try {
    const { data, error } = await supabase
      .from('listings')
      .insert({
        ...payload,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, serverId: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleMessageSync(
  supabase: any,
  userId: string,
  request: SyncRequest
): Promise<SyncResponse> {
  const payload = request.payload;

  // Validate required fields
  if (!payload.chat_id || (!payload.message_text && !payload.image_url)) {
    return { success: false, error: 'Missing required fields for message' };
  }

  // Validate message length
  if (payload.message_text && payload.message_text.length > 2000) {
    return { success: false, error: 'Message too long' };
  }

  // Ensure sender_id matches authenticated user
  payload.sender_id = userId;

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, serverId: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function handleProfileUpdateSync(
  supabase: any,
  userId: string,
  request: SyncRequest
): Promise<SyncResponse> {
  const payload = request.payload;

  // Validate payload structure
  if (!payload.updates || typeof payload.updates !== 'object') {
    return { success: false, error: 'Invalid updates payload' };
  }

  // Ensure user_id matches authenticated user
  payload.user_id = userId;

  // Sanitize updates - only allow specific fields
  const allowedFields = ['name', 'bio', 'city', 'area', 'phone', 'whatsapp'];
  const sanitizedUpdates: any = {};
  
  for (const [key, value] of Object.entries(payload.updates)) {
    if (allowedFields.includes(key)) {
      sanitizedUpdates[key] = value;
    }
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
