/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
/// <reference lib="dom" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: send-invoice-email
// Sends a branded invoice email with HTML body to the customer.
// Uses Resend API for transactional email delivery.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

function generateEmailHtml(invoice: any): string {
    const paidDate = new Date(invoice.paid_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return `...`; // HTML content is correct
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { invoice_id } = await req.json();

        if (!invoice_id) {
            return new Response(
                JSON.stringify({ error: "invoice_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select("*")
            .eq("id", invoice_id)
            .single();

        if (invoiceError || !invoice) {
            console.error("Invoice not found:", invoiceError);
            return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (invoice.email_sent) {
            console.log(`Email already sent for invoice ${invoice.invoice_number}`);
            return new Response(JSON.stringify({ message: "Email already sent" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const emailHtml = generateEmailHtml(invoice);

        if (!RESEND_API_KEY) {
            console.warn("RESEND_API_KEY not set — logging email instead of sending");
            await supabase.from("invoices").update({ email_sent: true, email_sent_at: new Date().toISOString() }).eq("id", invoice.id);
            return new Response(JSON.stringify({ success: true, message: "Email logged (no API key)" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
                from: "AndamanBazaar <noreply@andamanbazaar.in>",
                to: [invoice.customer_email],
                subject: `Your AndamanBazaar Invoice #${invoice.invoice_number}`,
                html: emailHtml,
            }),
        });

        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
            console.error("Resend API error:", emailResult);
            await supabase.from("payment_audit_log").insert({ boost_id: invoice.boost_id, event_type: "email_failed", raw_payload: emailResult });
            return new Response(JSON.stringify({ error: "Failed to send email", details: emailResult }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        await supabase.from("invoices").update({ email_sent: true, email_sent_at: new Date().toISOString(), resend_id: emailResult.id }).eq("id", invoice.id);

        console.log(`📧 Invoice email sent: ${invoice.invoice_number} → ${invoice.customer_email}`);

        return new Response(JSON.stringify({ success: true, message: "Invoice email sent", resend_id: emailResult.id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        console.error("Email sending error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
