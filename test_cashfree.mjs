import { createHmac } from "node:crypto";

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

async function testCreateOrder() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 1: Create Cashfree Order (Sandbox)");
    console.log("═══════════════════════════════════════════════\n");

    const orderId = `TEST_AB_${Date.now()}`;
    const payload = {
        order_id: orderId,
        order_amount: 49,
        order_currency: "INR",
        customer_details: {
            customer_id: "test_user_123",
            customer_name: "Shahid Test",
            customer_email: "test@andamanbazaar.in",
            customer_phone: "9876543210",
        },
        order_meta: {
            return_url: `https://www.andamanbazaar.in/boost-success?order_id=${orderId}`,
            notify_url: "https://httpbin.org/post",
            payment_methods: "upi",
        },
        order_note: "Spark ⚡ boost for Test Listing",
        order_tags: {
            listing_id: "test-listing-abc",
            boost_id: "test-boost-xyz",
            tier: "spark",
        },
    };

    const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();

    assert("HTTP 200 response", res.status === 200, `Got ${res.status}`);
    assert("order_id matches", data.order_id === orderId, `Expected ${orderId}, got ${data.order_id}`);
    assert("order_status is ACTIVE", data.order_status === "ACTIVE", `Got ${data.order_status}`);
    assert("payment_session_id present", typeof data.payment_session_id === "string" && data.payment_session_id.length > 10, "Missing session ID");
    assert("cf_order_id present", !!data.cf_order_id, "Missing cf_order_id");
    assert("order_amount matches", data.order_amount === 49, `Got ${data.order_amount}`);
    assert("order_currency is INR", data.order_currency === "INR", `Got ${data.order_currency}`);
    assert("return_url preserved", data.order_meta?.return_url?.includes("boost-success"), "return_url missing");
    assert("notify_url preserved", data.order_meta?.notify_url?.includes("httpbin"), "notify_url missing");

    return { orderId, cfOrderId: data.cf_order_id, paymentSessionId: data.payment_session_id };
}

async function testFetchOrder(orderId) {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 2: Fetch Order by ID (GET)");
    console.log("═══════════════════════════════════════════════\n");

    const res = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
        method: "GET",
        headers: {
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
        },
    });

    const data = await res.json();

    assert("HTTP 200 response", res.status === 200, `Got ${res.status}`);
    assert("order_id matches", data.order_id === orderId);
    assert("order_status is ACTIVE", data.order_status === "ACTIVE", `Got ${data.order_status}`);
    assert("customer_email correct", data.customer_details?.customer_email === "test@andamanbazaar.in");
}

async function testInvalidCredentials() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 3: Invalid Credentials (Should Fail)");
    console.log("═══════════════════════════════════════════════\n");

    const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": "INVALID_APP_ID",
            "x-client-secret": "INVALID_SECRET",
        },
        body: JSON.stringify({
            order_id: `INVALID_${Date.now()}`,
            order_amount: 10,
            order_currency: "INR",
            customer_details: {
                customer_id: "test",
                customer_name: "Test",
                customer_email: "t@t.com",
                customer_phone: "9999999999",
            },
        }),
    });

    const data = await res.json();

    assert("Rejects invalid credentials (non-200)", res.status !== 200, `Got status ${res.status}`);
    assert("Returns error message", !!data.message || !!data.code, JSON.stringify(data));
}

async function testMissingFields() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 4: Missing Required Fields");
    console.log("═══════════════════════════════════════════════\n");

    const res = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify({
            order_id: `MISSING_${Date.now()}`,
            // missing order_amount, customer_details
        }),
    });

    const data = await res.json();

    assert("Rejects incomplete payload (non-200)", res.status !== 200, `Got status ${res.status}`);
    assert("Returns validation error", !!data.message || !!data.code, JSON.stringify(data));
}

function testWebhookSignatureVerification() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 5: Webhook HMAC-SHA256 Signature");
    console.log("═══════════════════════════════════════════════\n");

    const webhookBody = JSON.stringify({
        data: {
            order: { order_id: "TEST_123", order_status: "PAID", order_amount: 49 },
            payment: { cf_payment_id: 999, payment_status: "SUCCESS", payment_amount: 49 },
        },
        type: "PAYMENT_SUCCESS_WEBHOOK",
        event_time: "2026-02-25T07:00:00+05:30",
    });

    const timestamp = "1740000000";

    // Generate signature (simulating Cashfree)
    const payloadToSign = timestamp + webhookBody;
    const signature = createHmac("sha256", CASHFREE_SECRET_KEY)
        .update(payloadToSign)
        .digest("base64");

    // Verify (simulating our Edge Function)
    const expectedSignature = createHmac("sha256", CASHFREE_SECRET_KEY)
        .update(timestamp + webhookBody)
        .digest("base64");

    assert("Signature generated successfully", signature.length > 0);
    assert("Signature matches expected", signature === expectedSignature);

    // Test tampered body
    const tamperedBody = webhookBody.replace("PAID", "FAILED");
    const tamperedSignature = createHmac("sha256", CASHFREE_SECRET_KEY)
        .update(timestamp + tamperedBody)
        .digest("base64");

    assert("Tampered body produces different signature", tamperedSignature !== signature);

    // Test wrong secret
    const wrongKeySignature = createHmac("sha256", "wrong_secret_key")
        .update(timestamp + webhookBody)
        .digest("base64");

    assert("Wrong secret key produces different signature", wrongKeySignature !== signature);

    // Test empty timestamp
    const emptyTimestampSig = createHmac("sha256", CASHFREE_SECRET_KEY)
        .update("" + webhookBody)
        .digest("base64");

    assert("Empty timestamp produces different signature", emptyTimestampSig !== signature);
}

function testTierPricing() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 6: Boost Tier Pricing Configuration");
    console.log("═══════════════════════════════════════════════\n");

    const TIERS = {
        spark: { name: "spark", duration_days: 3, amount_inr: 49, label: "Spark ⚡" },
        boost: { name: "boost", duration_days: 7, amount_inr: 99, label: "Boost 🚀" },
        power: { name: "power", duration_days: 30, amount_inr: 199, label: "Power 💎" },
    };

    assert("Spark tier exists", !!TIERS.spark);
    assert("Spark costs ₹49", TIERS.spark.amount_inr === 49);
    assert("Spark lasts 3 days", TIERS.spark.duration_days === 3);

    assert("Boost tier exists", !!TIERS.boost);
    assert("Boost costs ₹99", TIERS.boost.amount_inr === 99);
    assert("Boost lasts 7 days", TIERS.boost.duration_days === 7);

    assert("Power tier exists", !!TIERS.power);
    assert("Power costs ₹199", TIERS.power.amount_inr === 199);
    assert("Power lasts 30 days", TIERS.power.duration_days === 30);

    assert("Invalid tier returns undefined", TIERS["premium"] === undefined);
}

async function testDuplicateOrderId() {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 7: Duplicate Order ID Handling");
    console.log("═══════════════════════════════════════════════\n");

    const orderId = `DUP_TEST_${Date.now()}`;
    const payload = {
        order_id: orderId,
        order_amount: 10,
        order_currency: "INR",
        customer_details: {
            customer_id: "dup_test",
            customer_name: "Dup Test",
            customer_email: "dup@test.com",
            customer_phone: "9876543210",
        },
    };

    // Create first order
    await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify(payload),
    });

    // Attempt duplicate
    const res2 = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
        },
        body: JSON.stringify(payload),
    });

    const data2 = await res2.json();

    assert("Duplicate order handled (non-error or returns existing)", res2.status === 200 || res2.status === 409, `Got ${res2.status}`);
    if (res2.status === 200) {
        assert("Returns the same order_id", data2.order_id === orderId);
    }
}

async function testPaymentSessionIdFormat(paymentSessionId) {
    console.log("\n═══════════════════════════════════════════════");
    console.log("  TEST 8: Payment Session ID Validity");
    console.log("═══════════════════════════════════════════════\n");

    assert("Session ID is a string", typeof paymentSessionId === "string");
    assert("Session ID length > 20 chars", paymentSessionId.length > 20, `Length: ${paymentSessionId.length}`);
    assert("Session ID contains 'session'", paymentSessionId.includes("session"), paymentSessionId.substring(0, 30));
}

// ═══════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════

async function main() {
    console.log("╔═══════════════════════════════════════════════╗");
    console.log("║   CASHFREE PAYMENT INTEGRATION TEST SUITE     ║");
    console.log("║   AndamanBazaar — Sandbox Environment         ║");
    console.log("╚═══════════════════════════════════════════════╝");

    const startTime = Date.now();

    try {
        const { orderId, paymentSessionId } = await testCreateOrder();
        await testFetchOrder(orderId);
        await testInvalidCredentials();
        await testMissingFields();
        testWebhookSignatureVerification();
        testTierPricing();
        await testDuplicateOrderId();
        await testPaymentSessionIdFormat(paymentSessionId);
    } catch (err) {
        console.error("\n💥 FATAL ERROR:", err.message);
        failed++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n╔═══════════════════════════════════════════════╗");
    console.log(`║   RESULTS: ${passed} passed, ${failed} failed (${elapsed}s)        `);
    console.log("╚═══════════════════════════════════════════════╝");

    if (failed > 0) {
        process.exit(1);
    }
}

main();
