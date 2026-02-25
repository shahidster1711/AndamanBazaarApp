import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// Edge Function: generate-invoice
// Generates an HTML invoice, stores it, and triggers email.
// Called internally after successful payment webhook.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

/**
 * Generate a branded HTML invoice
 */
function generateInvoiceHtml(invoice: {
    invoice_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    item_description: string;
    amount_total: number;
    payment_method: string;
    cashfree_order_id: string;
    paid_at: string;
    tier: string;
    duration_days: number;
    listing_title: string;
}): string {
    const tierInfo = TIERS[invoice.tier] || { label: invoice.tier, emoji: "📦" };
    const paidDate = new Date(invoice.paid_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a2e; background: #f8f9fa; }
        .invoice-container { max-width: 650px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #0f3460 0%, #16213e 100%); color: white; padding: 40px 40px 30px; }
        .header h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
        .header .tagline { font-size: 12px; opacity: 0.7; margin-top: 4px; letter-spacing: 2px; text-transform: uppercase; }
        .invoice-meta { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 24px; }
        .invoice-meta .label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px; }
        .invoice-meta .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
        .body { padding: 40px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #999; margin-bottom: 12px; font-weight: 700; }
        .customer-info { margin-bottom: 30px; }
        .customer-info p { font-size: 14px; line-height: 1.8; color: #444; }
        .customer-info strong { color: #1a1a2e; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #f1f3f5; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px; text-align: left; color: #666; font-weight: 700; }
        .items-table td { padding: 16px; font-size: 14px; border-bottom: 1px solid #f1f3f5; }
        .items-table .item-name { font-weight: 600; color: #1a1a2e; }
        .items-table .item-detail { font-size: 12px; color: #888; margin-top: 2px; }
        .items-table .amount { text-align: right; font-weight: 700; font-size: 16px; color: #0f3460; }
        .total-row { background: linear-gradient(135deg, #e8f4f8 0%, #f0f7ff 100%); }
        .total-row td { padding: 20px 16px; font-size: 18px; font-weight: 800; }
        .total-row .amount { color: #0f3460; font-size: 22px; }
        .payment-info { background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .payment-info .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .payment-info .row .label { color: #888; }
        .payment-info .row .value { font-weight: 600; color: #1a1a2e; }
        .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .footer { text-align: center; padding: 30px 40px; border-top: 1px solid #f1f3f5; }
        .footer p { font-size: 12px; color: #999; line-height: 1.6; }
        .footer .brand { font-weight: 700; color: #0f3460; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1>AndamanBazaar</h1>
            <div class="tagline">Andaman & Nicobar Islands Marketplace</div>
            <div class="invoice-meta">
                <div>
                    <div class="label">Invoice Number</div>
                    <div class="value">${invoice.invoice_number}</div>
                </div>
                <div>
                    <div class="label">Date</div>
                    <div class="value">${paidDate}</div>
                </div>
                <div>
                    <div class="label">Status</div>
                    <div class="value">✅ Paid</div>
                </div>
            </div>
        </div>

        <div class="body">
            <div class="customer-info">
                <div class="section-title">Billed To</div>
                <p><strong>${invoice.customer_name}</strong></p>
                <p>${invoice.customer_email}</p>
                ${invoice.customer_phone ? `<p>${invoice.customer_phone}</p>` : ""}
            </div>

            <div class="section-title">Order Details</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div class="item-name">${tierInfo.emoji} ${tierInfo.label} Boost — ${invoice.duration_days} days</div>
                            <div class="item-detail">Listing: "${invoice.listing_title}"</div>
                        </td>
                        <td class="amount">₹${invoice.amount_total.toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>Total Paid</strong></td>
                        <td class="amount">₹${invoice.amount_total.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">Payment Information</div>
            <div class="payment-info">
                <div class="row">
                    <span class="label">Payment Method</span>
                    <span class="value">${(invoice.payment_method || "UPI").toUpperCase()}</span>
                </div>
                <div class="row">
                    <span class="label">Order Reference</span>
                    <span class="value">${invoice.cashfree_order_id}</span>
                </div>
                <div class="row">
                    <span class="label">Payment Date</span>
                    <span class="value">${paidDate}</span>
                </div>
                <div class="row">
                    <span class="label">Status</span>
                    <span class="value"><span class="badge">Confirmed</span></span>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for boosting your listing on <span class="brand">AndamanBazaar</span>!</p>
            <p>For questions, contact support@andamanbazaar.in</p>
            <p style="margin-top: 12px; font-size: 10px; color: #ccc;">This is a computer-generated invoice and does not require a signature.</p>
        </div>
    </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { boost_id } = await req.json();

        if (!boost_id) {
            return new Response(
                JSON.stringify({ error: "boost_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Fetch boost record
        const { data: boost, error: boostError } = await supabase
            .from("listing_boosts")
            .select("*")
            .eq("id", boost_id)
            .single();

        if (boostError || !boost) {
            console.error("Boost not found:", boostError);
            return new Response(
                JSON.stringify({ error: "Boost record not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Fetch user profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("name, email, phone_number")
            .eq("id", boost.user_id)
            .single();

        // 3. Fetch listing title
        const { data: listing } = await supabase
            .from("listings")
            .select("title")
            .eq("id", boost.listing_id)
            .single();

        // 4. Fetch user email from auth
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(boost.user_id);

        const customerName = profile?.name || authUser?.user_metadata?.name || "AndamanBazaar User";
        const customerEmail = authUser?.email || profile?.email || "user@andamanbazaar.in";
        const customerPhone = authUser?.phone || profile?.phone_number || "";
        const listingTitle = listing?.title || "Listing";

        const tierInfo = TIERS[boost.tier] || { label: boost.tier, emoji: "📦" };
        const itemDescription = `${tierInfo.emoji} ${tierInfo.label} Boost — ${boost.duration_days} days`;

        // 5. Create invoice record (auto-generates invoice_number)
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
            return new Response(
                JSON.stringify({ error: "Failed to create invoice record" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 6. Generate HTML invoice
        const invoiceHtml = generateInvoiceHtml({
            invoice_number: invoice.invoice_number,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            item_description: itemDescription,
            amount_total: boost.amount_inr,
            payment_method: boost.payment_method || "upi",
            cashfree_order_id: boost.cashfree_order_id,
            paid_at: boost.featured_from || new Date().toISOString(),
            tier: boost.tier,
            duration_days: boost.duration_days,
            listing_title: listingTitle,
        });

        // 7. Upload HTML invoice to Storage
        const fileName = `${boost.user_id}/${invoice.invoice_number}.html`;
        const { error: uploadError } = await supabase.storage
            .from("invoices")
            .upload(fileName, invoiceHtml, {
                contentType: "text/html",
                upsert: true,
            });

        if (uploadError) {
            console.error("Failed to upload invoice:", uploadError);
        }

        // 8. Get signed URL (valid for 365 days)
        const { data: urlData } = await supabase.storage
            .from("invoices")
            .createSignedUrl(fileName, 365 * 24 * 60 * 60);

        const pdfUrl = urlData?.signedUrl || "";

        // 9. Update invoice with PDF URL
        await supabase
            .from("invoices")
            .update({ invoice_pdf_url: pdfUrl })
            .eq("id", invoice.id);

        // 10. Trigger email sending
        try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({ invoice_id: invoice.id }),
            });
        } catch (emailErr) {
            console.error("Email trigger failed (non-blocking):", emailErr);
        }

        // 11. Audit log
        await supabase.from("payment_audit_log").insert({
            boost_id: boost.id,
            event_type: "invoice_generated",
            cashfree_order_id: boost.cashfree_order_id,
            raw_payload: {
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                amount: boost.amount_inr,
            },
        });

        console.log(`📄 Invoice generated: ${invoice.invoice_number} for boost ${boost.id}`);

        return new Response(
            JSON.stringify({
                success: true,
                invoice_id: invoice.id,
                invoice_number: invoice.invoice_number,
                invoice_url: pdfUrl,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Invoice generation error:", err);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
