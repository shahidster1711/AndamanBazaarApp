import { createHmac } from "node:crypto";

export const CASHFREE_CONFIG = {
  appId: Deno.env.get("CASHFREE_APP_ID"),
  secretKey: Deno.env.get("CASHFREE_SECRET_KEY"),
  baseUrl:
    Deno.env.get("NODE_ENV") === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg",
  apiVersion: "2023-08-01",
};

if (!CASHFREE_CONFIG.appId || !CASHFREE_CONFIG.secretKey) {
  throw new Error("Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY env vars");
}

export function getCashfreeHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-version": CASHFREE_CONFIG.apiVersion,
    "x-client-id": CASHFREE_CONFIG.appId,
    "x-client-secret": CASHFREE_CONFIG.secretKey,
  };
}

interface CreateOrderParams {
    orderId: string;
    amount: number;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    listingId: string;
    boostTier: string;
}

export async function createOrder(params: CreateOrderParams) {
  const payload = {
    order_id: params.orderId,
    order_amount: params.amount,
    order_currency: "INR",
    customer_details: {
      customer_id: params.customerId,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
    },
    order_meta: {
      return_url: `https://www.andamanbazaar.in/boost-success?order_id=${params.orderId}`,
      notify_url: `https://${Deno.env.get("SUPABASE_PROJECT_ID")}.supabase.co/functions/v1/cashfree-webhook`,
      payment_methods: "upi,cc,dc,nb,wallet",
    },
    order_note: `Boost payment for listing ${params.listingId}`,
    order_tags: {
      listing_id: params.listingId,
      boost_tier: params.boostTier,
    },
  };

  const res = await fetch(`${CASHFREE_CONFIG.baseUrl}/orders`, {
    method: "POST",
    headers: getCashfreeHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(
      `Cashfree order creation failed [${res.status}]: ${data.message || JSON.stringify(data)}`
    );
  }

  return {
    payment_session_id: data.payment_session_id,
    cf_order_id: data.cf_order_id,
    order_status: data.order_status,
  };
}

export function verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
  if (!rawBody || !signature || !timestamp) return false;

  const webhookAge = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (webhookAge > 300) {
    console.warn("Webhook timestamp too old:", webhookAge, "seconds");
    return false;
  }

  const expectedSignature = createHmac("sha256", CASHFREE_CONFIG.secretKey!)
    .update(timestamp + rawBody)
    .digest("base64");

  return timingSafeEqual(expectedSignature, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
