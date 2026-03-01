/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
/// <reference lib="dom" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOrder } from "../_shared/cashfree.ts";

// ============================================================
// Edge Function: create-boost-order
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIERS: Record<string, { amount_inr: number; duration_days: number; label: string }> = {
    spark: { amount_inr: 49, duration_days: 3, label: "Spark ⚡" },
    boost: { amount_inr: 99, duration_days: 7, label: "Boost 🚀" },
    power: { amount_inr: 199, duration_days: 30, label: "Power 💎" },
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { listing_id, tier: tierKey } = await req.json();
        const tier = TIERS[tierKey];
        if (!listing_id || !tier) {
            return new Response(JSON.stringify({ error: "Invalid request: listing_id and a valid tier are required." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: listing, error: listingError } = await supabaseAdmin.from("listings").select("id, user_id, title, status").eq("id", listing_id).single();
        if (listingError || !listing) {
            return new Response(JSON.stringify({ error: "Listing not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (listing.user_id !== user.id) {
            return new Response(JSON.stringify({ error: "You can only boost your own listings" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const orderId = `BOOST_${listing.id.substring(0, 8)}_${Date.now()}`;
        const { data: boostRecord, error: boostError } = await supabaseAdmin.from("listing_boosts").insert({ listing_id, user_id: user.id, tier: tierKey, amount_inr: tier.amount_inr, duration_days: tier.duration_days, status: "pending", cashfree_order_id: orderId }).select("id").single();
        if (boostError) {
            throw new Error(`Failed to create boost record: ${boostError.message}`);
        }

        const cashfreeResponse = await createOrder({
            orderId,
            amount: tier.amount_inr,
            customerId: user.id,
            customerName: user.user_metadata.full_name || "",
            customerEmail: user.email || "",
            customerPhone: user.phone || "",
            listingId: listing.id,
            boostTier: tierKey,
        });

        return new Response(JSON.stringify({ success: true, ...cashfreeResponse }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Error creating boost order:", (err as any).message, (err as any).response?.data);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: (err as any).response?.data?.message || (err as any).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
