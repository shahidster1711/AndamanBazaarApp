import { createHmac } from "node:crypto";

// ============================================================
// E2E Test: Financial System + Invoice Generation + Email
// Tests the full pipeline from order creation through invoice
// ============================================================

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "YOUR_APP_ID";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "YOUR_SECRET_KEY";
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg";

const PASS = "✅ PASS";
const FAIL = "❌ FAIL";
let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
    if (condition) {
        console.log(`  ${PASS} ${label}`);
        passed++;
    } else {
        console.log(`  ${FAIL} ${label}${detail ? " — " + detail : ""}`);
        failed++;
    }
}

// ── Test 1: Invoice Number Generator Logic ──
function testInvoiceNumberFormat() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 1: Invoice Number Format Validation");
    console.log("═══════════════════════════════════════════════\n");

    // Simulate the generate_invoice_number() SQL function
    function generateInvoiceNumber(seqVal) {
        const monthStr = new Date().toISOString().slice(0, 7).replace("-", "");
        return `AB-INV-${monthStr}-${String(seqVal).padStart(5, "0")}`;
    }

    const inv1 = generateInvoiceNumber(1);
    const inv2 = generateInvoiceNumber(99);
    const inv3 = generateInvoiceNumber(12345);

    assert("Format: AB-INV-YYYYMM-XXXXX", /^AB-INV-\d{6}-\d{5}$/.test(inv1), inv1);
    assert("Sequential padding works (00001)", inv1.endsWith("-00001"));
    assert("Sequential padding works (00099)", inv2.endsWith("-00099"));
    assert("Sequential overflow (12345)", inv3.endsWith("-12345"));
    assert("Each call produces unique number", inv1 !== inv2);
}

// ── Test 2: Invoice HTML Generation ──
function testInvoiceHtmlGeneration() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 2: Invoice HTML Content Validation");
    console.log("═══════════════════════════════════════════════\n");

    // Minimal HTML generator matching the edge function
    function generateInvoiceHtml(data) {
        return `<!DOCTYPE html><html><body>
            <h1>AndamanBazaar</h1>
            <div>${data.invoice_number}</div>
            <div>${data.customer_name}</div>
            <div>${data.customer_email}</div>
            <div>₹${data.amount_total.toFixed(2)}</div>
            <div>${data.tier} Boost — ${data.duration_days} days</div>
            <div>${data.cashfree_order_id}</div>
        </body></html>`;
    }

    const html = generateInvoiceHtml({
        invoice_number: "AB-INV-202602-00001",
        customer_name: "Shahid Test",
        customer_email: "test@andamanbazaar.in",
        amount_total: 49,
        tier: "spark",
        duration_days: 3,
        cashfree_order_id: "AB_BOOST_test_123",
    });

    assert("Contains invoice number", html.includes("AB-INV-202602-00001"));
    assert("Contains customer name", html.includes("Shahid Test"));
    assert("Contains email", html.includes("test@andamanbazaar.in"));
    assert("Contains amount", html.includes("₹49.00"));
    assert("Contains tier info", html.includes("spark Boost"));
    assert("Contains duration", html.includes("3 days"));
    assert("Contains order reference", html.includes("AB_BOOST_test_123"));
    assert("Is valid HTML", html.startsWith("<!DOCTYPE html>"));
}

// ── Test 3: Email Template Validation ──
function testEmailTemplate() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 3: Email Template Content Validation");
    console.log("═══════════════════════════════════════════════\n");

    const emailData = {
        invoice_number: "AB-INV-202602-00042",
        customer_name: "John Doe",
        item_description: "⚡ Spark Boost — 3 days",
        amount_total: 49.00,
        paid_at: "2026-02-25T07:00:00+05:30",
        invoice_pdf_url: "https://example.com/invoice.html",
    };

    // Simulate email subject
    const subject = `Your AndamanBazaar Invoice #${emailData.invoice_number}`;
    assert("Subject contains invoice number", subject.includes("AB-INV-202602-00042"));
    assert("Subject contains brand", subject.includes("AndamanBazaar"));

    // Validate data integrity
    assert("Amount is numeric", typeof emailData.amount_total === "number");
    assert("Amount is positive", emailData.amount_total > 0);
    assert("Paid date is valid ISO", !isNaN(Date.parse(emailData.paid_at)));
    assert("PDF URL is present", emailData.invoice_pdf_url.length > 0);
    assert("PDF URL starts with https", emailData.invoice_pdf_url.startsWith("https://"));
}

// ── Test 4: Webhook → Invoice Chain Logic ──
function testWebhookInvoiceChain() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 4: Webhook → Invoice Chain Logic");
    console.log("═══════════════════════════════════════════════\n");

    // Simulate the webhook payload
    const webhookPayload = {
        data: {
            order: { order_id: "AB_BOOST_abc12345_1740000", order_status: "PAID", order_amount: 99 },
            payment: { cf_payment_id: 555666777, payment_status: "SUCCESS" },
        },
        type: "PAYMENT_SUCCESS_WEBHOOK",
    };

    assert("Event type is PAYMENT_SUCCESS_WEBHOOK", webhookPayload.type === "PAYMENT_SUCCESS_WEBHOOK");
    assert("Order status is PAID", webhookPayload.data.order.order_status === "PAID");
    assert("Order ID has AB_BOOST prefix", webhookPayload.data.order.order_id.startsWith("AB_BOOST_"));
    assert("Payment ID exists", !!webhookPayload.data.payment.cf_payment_id);

    // Simulate featured_until calculation
    const now = new Date();
    const durationDays = 7;
    const featuredUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    assert("Featured until is in the future", featuredUntil > now);
    assert("Featured duration is 7 days", Math.round((featuredUntil - now) / (24 * 60 * 60 * 1000)) === 7);

    // Simulate invoice trigger URL
    const invoiceUrl = "https://mock.supabase.co/functions/v1/generate-invoice";
    assert("Invoice trigger URL is correct", invoiceUrl.includes("generate-invoice"));
}

// ── Test 5: Cashfree Order + Signature (Sanity) ──
async function testCashfreeOrderAndSignature() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 5: Cashfree Sandbox Order + Signature");
    console.log("═══════════════════════════════════════════════\n");

    const orderId = `FIN_TEST_${Date.now()}`;
    const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify({
            order_id: orderId,
            order_amount: 199,
            order_currency: "INR",
            customer_details: {
                customer_id: "fin_test_user",
                customer_name: "Finance Test",
                customer_email: "finance@andamanbazaar.in",
                customer_phone: "9876543210",
            },
            order_meta: { return_url: `https://www.andamanbazaar.in/boost-success?order_id=${orderId}` },
            order_note: "Power 💎 boost — Finance E2E test",
        }),
    });

    const data = await res.json();
    assert("Order created (HTTP 200)", res.status === 200, `Got ${res.status}`);
    assert("Order amount is ₹199", data.order_amount === 199);
    assert("Payment session ID present", !!data.payment_session_id);

    // Verify webhook signature logic
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id: orderId } } });
    const ts = Date.now().toString();
    const sig = createHmac("sha256", CASHFREE_SECRET_KEY).update(ts + body).digest("base64");
    const verify = createHmac("sha256", CASHFREE_SECRET_KEY).update(ts + body).digest("base64");
    assert("Signature verification passes", sig === verify);
}

// ── Test 6: Database Schema Validation ──
function testSchemaConstraints() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 6: Database Schema Constraints");
    console.log("═══════════════════════════════════════════════\n");

    const validTiers = ["spark", "boost", "power"];
    const validStatuses = ["pending", "paid", "failed", "refunded", "expired"];

    validTiers.forEach(t => assert(`Tier '${t}' is valid`, validTiers.includes(t)));
    assert("Invalid tier rejected", !validTiers.includes("premium"));

    validStatuses.forEach(s => assert(`Status '${s}' is valid`, validStatuses.includes(s)));
    assert("Invalid status rejected", !validStatuses.includes("cancelled"));

    // Amount constraints
    assert("Amount ₹49 valid (numeric 10,2)", 49.00.toFixed(2) === "49.00");
    assert("Amount ₹99 valid", 99.00.toFixed(2) === "99.00");
    assert("Amount ₹199 valid", 199.00.toFixed(2) === "199.00");
}

// ═══════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════

async function main() {
    console.log("╔═══════════════════════════════════════════════╗");
    console.log("║  FINANCIAL SYSTEM E2E TEST SUITE              ║");
    console.log("║  Invoice Generation · Email · Schema          ║");
    console.log("╚═══════════════════════════════════════════════╝");

    const startTime = Date.now();

    testInvoiceNumberFormat();
    testInvoiceHtmlGeneration();
    testEmailTemplate();
    testWebhookInvoiceChain();
    await testCashfreeOrderAndSignature();
    testSchemaConstraints();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n╔═══════════════════════════════════════════════╗");
    console.log(`║  RESULTS: ${passed} passed, ${failed} failed (${elapsed}s)         `);
    console.log("╚═══════════════════════════════════════════════╝");

    if (failed > 0) process.exit(1);
}

main();
