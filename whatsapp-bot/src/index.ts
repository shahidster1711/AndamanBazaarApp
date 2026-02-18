import Fastify from 'fastify';
import { WhatsAppService, ListingNotification } from './wa';
import dotenv from 'dotenv';
import qrcode from 'qrcode-terminal';

dotenv.config();

const fastify = Fastify({
    logger: true
});

const wa = new WhatsAppService();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const API_KEY = process.env.BOT_API_KEY || 'changeme';

// Auth Middleware
fastify.addHook('preHandler', async (request, reply) => {
    if (request.routerPath === '/health' || request.routerPath === '/qr') return;

    const apiKey = request.headers['x-api-key'];
    if (apiKey !== API_KEY) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
});

// Health Check
fastify.get('/health', async () => {
    const status = wa.getStatus();
    return { status: 'ok', wa_connected: status.connected };
});

// Get QR Code (if not connected)
fastify.get('/qr', async (request, reply) => {
    const status = wa.getStatus();
    if (status.connected) {
        return { message: 'Already connected to WhatsApp!' };
    }
    if (!status.qr) {
        return { message: 'QR Code not generated yet. Check logs or try again in a moment.' };
    }

    // Return HTML with QR code logic or just the raw string
    return { qr_raw: status.qr, instructions: 'Paste this into a QR generator or check terminal logs.' };
});

// Send Notification Webhook
fastify.post<{ Body: ListingNotification & { jids: string[] } }>('/notify', async (request, reply) => {
    const { jids, ...listing } = request.body;

    if (!jids || !Array.isArray(jids) || jids.length === 0) {
        return reply.code(400).send({ error: 'Missing jids array' });
    }

    const results = [];
    for (const jid of jids) {
        try {
            await wa.sendListingNotification(jid, listing);
            results.push({ jid, status: 'sent' });
        } catch (e: any) {
            request.log.error(e);
            results.push({ jid, status: 'failed', error: e.message });
        }
        // Random delay between messages to avoid bans (2-5s)
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
    }

    return { results };
});

// Get Groups (to find JIDs)
fastify.get('/groups', async () => {
    try {
        const groups = await wa.getGroups();
        return { groups };
    } catch (e: any) {
        return { error: 'Failed to fetch groups', details: e.message };
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server listening on ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
