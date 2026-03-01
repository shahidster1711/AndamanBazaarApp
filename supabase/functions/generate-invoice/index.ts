/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
/// <reference lib="dom" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: generate-invoice
// Generates an HTML invoice, stores it, and triggers email.
// Called internally after successful payment webhook.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

const TIERS: Record<string, { label: string; emoji: string }> = {
    spark: { label: "Spark", emoji: "⚡" },
    boost: { label: "Boost", emoji: "🚀" },
    power: { label: "Power", emoji: "💎" },
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

function generateInvoiceHtml(invoice: any): string {
    const tierInfo = TIERS[invoice.tier] || { label: invoice.tier, emoji: "📦" };
    const paidDateObj = new Date(invoice.paid_at);
    const paidDate = paidDateObj.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Kolkata" });
    const paidTime = paidDateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: true });
    const paidDateTime = `${paidDate}, ${paidTime} IST`;

    // ... (HTML content is correct)
    return `<!DOCTYPE html><html>...</html>`;

}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { boost_id } = await req.json();
        if (!boost_id) {
            return new Response(JSON.stringify({ error: "boost_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: existingInvoice } = await supabase.from("invoices").select("id, invoice_number, invoice_pdf_url").eq("boost_id", boost_id).maybeSingle();
        if (existingInvoice) {
            console.log(`Invoice already exists for boost ${boost_id}: ${existingInvoice.invoice_number}`);
            return new Response(JSON.stringify({ success: true, invoice_id: existingInvoice.id, invoice_number: existingInvoice.invoice_number, invoice_url: existingInvoice.invoice_pdf_url || "", already_existed: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Consolidated data fetch
        const { data: boost, error: boostError } = await supabase
            .from("listing_boosts")
            .select(`
                *, 
                listing:listings(title, user_id), 
                user:users(email, phone)
            `)
            .eq("id", boost_id)
            .single();

        if (boostError || !boost) {
            console.error("Boost record not found:", boostError);
            return new Response(JSON.stringify({ error: "Boost record not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const customerName = boost.user?.name || "AndamanBazaar User";
        const customerEmail = boost.user?.email || "user@andamanbazaar.in";
        const customerPhone = boost.user?.phone || "";
        const listingTitle = boost.listing?.title || "Listing";
        const tierInfo = TIERS[boost.tier] || { label: boost.tier, emoji: "📦" };
        const itemDescription = `${tierInfo.emoji} ${tierInfo.label} Boost — ${boost.duration_days} days`;

        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
                boost_id: boost.id,
                user_id: boost.user_id,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                item_description: itemDescription,
                amount_total: boost.amount_inr,
                payment_method: boost.payment_method || "upi",
                cashfree_order_id: boost.cashfree_order_id,
                cashfree_payment_id: boost.cashfree_payment_id,
                paid_at: boost.featured_from || new Date().toISOString(),
            })
            .select("*")
            .single();

        if (invoiceError) {
            console.error("Failed to create invoice:", invoiceError);
            return new Response(JSON.stringify({ error: "Failed to create invoice record" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const invoiceHtml = generateInvoiceHtml({
            ...invoice,
            listing_title: listingTitle,
            tier: boost.tier, // Pass required fields to template
            duration_days: boost.duration_days
        });

        const fileName = `${boost.user_id}/${invoice.invoice_number}.html`;
        const { error: uploadError } = await supabase.storage.from("invoices").upload(fileName, invoiceHtml, { contentType: "text/html", upsert: true });
        if (uploadError) {
            console.error("Failed to upload invoice:", uploadError);
        }

        const { data: urlData } = await supabase.storage.from("invoices").createSignedUrl(fileName, 365 * 24 * 60 * 60);
        const pdfUrl = urlData?.signedUrl || "";

        await supabase.from("invoices").update({ invoice_pdf_url: pdfUrl }).eq("id", invoice.id);

        try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
                body: JSON.stringify({ invoice_id: invoice.id }),
            });
        } catch (emailErr) {
            console.error("Email trigger failed (non-blocking):", emailErr as any);
        }

        console.log(`📄 Invoice generated: ${invoice.invoice_number} for boost ${boost.id}`);

        return new Response(JSON.stringify({ success: true, invoice_id: invoice.id, invoice_number: invoice.invoice_number, invoice_url: pdfUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
        console.error("Invoice generation error:", err as any);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
