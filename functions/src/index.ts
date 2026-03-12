import * as functions from 'firebase-functions';

// Import all function modules
import { createPayment, verifyPayment, cashfreeWebhook, refundPayment, getPaymentHistory } from './payment';
import { verifyLocation, getLocationHistory, getNearbyListings } from './location';
import { moderateContent, batchModerateContent, getModerationHistory, getModerationStats } from './moderation';

// Import new payment functions
import { createOrder, cleanupExpiredReservations } from './payments/createOrder';
import { cashfreeWebhook as newCashfreeWebhook, webhookHealthCheck } from './payments/cashfreeWebhook';
import { checkPaymentStatus, getPaymentHistory as getPaymentHistoryNew, getPaymentDetails } from './payments/checkPaymentStatus';

// Export payment functions
export {
  createPayment,
  verifyPayment,
  cashfreeWebhook,
  refundPayment,
  getPaymentHistory,
};

// Export location functions
export {
  verifyLocation,
  getLocationHistory,
  getNearbyListings,
};

// Export moderation functions
export {
  moderateContent,
  batchModerateContent,
  getModerationHistory,
  getModerationStats,
};

// Export new payment functions
export {
  createOrder,
  cleanupExpiredReservations,
  newCashfreeWebhook as cashfreeWebhookV2,
  webhookHealthCheck,
  checkPaymentStatus,
  getPaymentHistoryNew,
  getPaymentDetails,
};

// Health check function
export const healthCheck = functions.https.onRequest(async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// General webhook handler
export const handleWebhook = functions.https.onRequest(async (req, res) => {
  const webhookType = req.headers['x-webhook-type'] as string;
  const payload = req.body;

  try {
    switch (webhookType) {
      case 'cashfree':
        return await cashfreeWebhook(req, res);
      default:
        console.error('Unknown webhook type:', webhookType);
        return res.status(400).send('Unknown webhook type');
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Scheduled tasks
export const cleanupOldData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    // This function will be implemented by individual modules
    // Each module exports its own cleanup functions
    console.log('Running scheduled cleanup tasks');
  });
