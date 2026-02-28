import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { Cashfree } from "npm:cashfree-pg";

// ============================================================
// Edge Function: create-boost-order
// Creates a Cashfree payment order for boosting a listing.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

const TIERS: Record<string, { amount_inr: number; duration_days: number; label: string }> = {
    spark: { amount_inr: 49, duration_days: 3, label: "Spark ⚡" },
    boost: { amount_inr: 99, duration_days: 7, label: "Boost 🚀" },
    power: { amount_inr: 199, duration_days: 30, label: "Power 💎" },
};

let sdkInitialized = false;

function initSdk() {
    if (sdkInitialized) return;
    try {
        const CASHFREE_APP_ID = Deno.env.get("CASHFREE_APP_ID");
        const CASHFREE_SECRET_KEY = Deno.env.get("CASHFREE_SECRET_KEY");
        const CASHFREE_ENV = Deno.env.get("CASHFREE_ENV") || "sandbox";

        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
            throw new Error("Missing Cashfree environment variables");
        }

        Cashfree.XClientId = CASHFREE_APP_ID;
        Cashfree.XClientSecret = CASHFREE_SECRET_KEY;
        Cashfree.XEnvironment = CASHFREE_ENV === "production"
            ? (Cashfree.Environment?.PRODUCTION || "PRODUCTION" as any)
            : (Cashfree.Environment?.SANDBOX || "SANDBOX" as any);

        sdkInitialized = true;
    } catch (err: any) {
        throw new Error("Cashfree SDK Init Error: " + err.message);
    }
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        initSdk();
    } catch (sdkError: any) {
        return new Response(
            JSON.stringify({ error: "SDK Initialization Failed", details: sdkError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    try {
        // 1. Authenticate the user
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Parse request body
        const { listing_id, tier: tierKey } = await req.json();

        if (!listing_id || !tierKey) {
            return new Response(
                JSON.stringify({ error: "listing_id and tier are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const tier = TIERS[tierKey];
        if (!tier) {
            return new Response(
                JSON.stringify({ error: "Invalid tier. Choose: spark, boost, or power" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Verify listing ownership using service role
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: listing, error: listingError } = await supabaseAdmin
            .from("listings")
            .select("id, user_id, title, status")
            .eq("id", listing_id)
            .single();

        if (listingError || !listing) {
            console.error("Listing lookup failed:", listingError);
            return new Response(
                JSON.stringify({ error: "Listing not found", details: listingError }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (listing.user_id !== user.id) {
            return new Response(
                JSON.stringify({ error: "You can only boost your own listings" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (listing.status !== "active") {
            return new Response(
                JSON.stringify({ error: "Only active listings can be boosted" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 4. Check for existing pending boost
        const { data: existingBoost } = await supabaseAdmin
            .from("listing_boosts")
            .select("id, status")
            .eq("listing_id", listing_id)
            .eq("status", "pending")
            .maybeSingle();

        // Expire stale pending order (older than 30 min)
        if (existingBoost) {
            await supabaseAdmin
                .from("listing_boosts")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("id", existingBoost.id);
        }

        // 5. Generate a unique order ID
        const orderId = `AB_BOOST_${listing_id.substring(0, 8)}_${Date.now()}`;

        // 6. Create listing_boosts record
        const { data: boostRecord, error: boostError } = await supabaseAdmin
            .from("listing_boosts")
            .insert({
                listing_id,
                user_id: user.id,
                tier: tierKey,
                amount_inr: tier.amount_inr,
                duration_days: tier.duration_days,
                status: "pending",
                cashfree_order_id: orderId,
                payment_method: "upi",
            })
            .select("id")
            .single();

        if (boostError) {
            console.error("Failed to create boost record:", boostError);
            return new Response(
                JSON.stringify({ error: "Failed to create boost order" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 7. Create Cashfree Order
        const returnUrl = `${req.headers.get("origin") || "https://www.andamanbazaar.in"}/boost-success?order_id=${orderId}&boost_id=${boostRecord.id}`;

        const cashfreePayload = {
            order_id: orderId,
            order_amount: tier.amount_inr,
            order_currency: "INR",
            customer_details: {
                customer_id: user.id.substring(0, 50),
                customer_name: user.user_metadata?.name || "AndamanBazaar User",
                customer_email: user.email || "user@andamanbazaar.in",
                customer_phone: user.phone || "9999999999",
            },
            order_meta: {
                return_url: returnUrl,
                notify_url: `${SUPABASE_URL}/functions/v1/cashfree-webhook`,
                payment_methods: "upi",
            },
            order_note: `${tier.label} boost for "${listing.title}"`,
            order_tags: {
                listing_id,
                boost_id: boostRecord.id,
                tier: tierKey,
            },
        };

        let cashfreeData;
        try {
            const response = await Cashfree.PGCreateOrder("2023-08-01", cashfreePayload as any);
            cashfreeData = response.data;
        } catch (error: any) {
            console.error("Cashfree order creation failed:", error.response?.data || error);

            // Mark the boost as failed
            await supabaseAdmin
                .from("listing_boosts")
                .update({ status: "failed", updated_at: new Date().toISOString() })
                .eq("id", boostRecord.id);

            return new Response(
                JSON.stringify({ error: "Payment gateway error. Please try again." }),
                { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 8. Update boost record with payment session ID
        await supabaseAdmin
            .from("listing_boosts")
            .update({
                cashfree_payment_id: cashfreeData.cf_order_id?.toString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", boostRecord.id);

        // 9. Audit log
        await supabaseAdmin.from("payment_audit_log").insert({
            boost_id: boostRecord.id,
            event_type: "order_created",
            cashfree_order_id: orderId,
            raw_payload: cashfreeData,
        });

        // 10. Return payment link to frontend
        return new Response(
            JSON.stringify({
                success: true,
                boost_id: boostRecord.id,
                order_id: orderId,
                payment_session_id: cashfreeData.payment_session_id,
                payment_link: cashfreeData.payment_link,
                cf_order_id: cashfreeData.cf_order_id,
                tier: tier,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
