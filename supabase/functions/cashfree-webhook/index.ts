/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
/// <reference lib="dom" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyWebhookSignature } from "../_shared/cashfree.ts";

// ============================================================
// Edge Function: cashfree-webhook
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-id",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";

    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
        await supabaseAdmin.from("payment_audit_log").insert({
            event_type: "webhook_signature_invalid",
            raw_payload: { body: rawBody.substring(0, 500), timestamp },
        });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const payload = JSON.parse(rawBody);
        const { type: eventType, data: { order: orderData, payment: paymentData } } = payload;

        console.log(`Webhook received: ${eventType}`, { order_id: orderData?.order_id, order_status: orderData?.order_status });

        await supabaseAdmin.from("payment_audit_log").insert({
            event_type: `webhook_${eventType}`,
            cashfree_order_id: orderData?.order_id,
            raw_payload: payload,
        });

        if (eventType === "PAYMENT_SUCCESS_WEBHOOK" && orderData?.order_status === "PAID") {
            const orderId = orderData.order_id;
            if (!orderId) {
                console.error("No order_id in success webhook payload");
                return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const { data: boost, error: boostError } = await supabaseAdmin.from("listing_boosts").select("id, listing_id, tier, duration_days, status").eq("cashfree_order_id", orderId).single();

            if (boostError || !boost) {
                console.error("Boost record not found for order:", orderId, boostError);
                return new Response(JSON.stringify({ error: "Boost record not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            if (boost.status === "paid") {
                console.log("Boost already marked as paid, skipping:", boost.id);
                return new Response(JSON.stringify({ message: "Already processed" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const now = new Date();
            const featuredUntil = new Date(now.getTime() + boost.duration_days * 24 * 60 * 60 * 1000);

            await supabaseAdmin.from("listing_boosts").update({ status: "paid", cashfree_payment_id: paymentData?.cf_payment_id?.toString() || null, featured_from: now.toISOString(), featured_until: featuredUntil.toISOString(), updated_at: now.toISOString() }).eq("id", boost.id);
            await supabaseAdmin.from("listings").update({ is_featured: true, featured_until: featuredUntil.toISOString(), featured_tier: boost.tier, updated_at: now.toISOString() }).eq("id", boost.listing_id);
            
            console.log(`✅ Boost activated: listing ${boost.listing_id}, tier ${boost.tier}, until ${featuredUntil.toISOString()}`);

            // Trigger invoice generation (non-blocking)
            fetch(`${SUPABASE_URL}/functions/v1/generate-invoice`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }, body: JSON.stringify({ boost_id: boost.id }) }).catch(err => console.error("Invoice trigger failed:", err));

            return new Response(JSON.stringify({ success: true, message: "Boost activated" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (eventType === "PAYMENT_FAILED_WEBHOOK" || (orderData?.order_status && orderData.order_status !== "PAID")) {
            const orderId = orderData?.order_id;
            if (orderId) {
                await supabaseAdmin.from("listing_boosts").update({ status: "failed", updated_at: new Date().toISOString() }).eq("cashfree_order_id", orderId).eq("status", "pending");
                console.log(`❌ Payment failed for order: ${orderId}`);
            }
            return new Response(JSON.stringify({ message: "Payment failure acknowledged" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.log(`Unhandled webhook event type: ${eventType}`);
        return new Response(JSON.stringify({ message: "Event acknowledged" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        console.error("Webhook processing error:", (err as any).message);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
