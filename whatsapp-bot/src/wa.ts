import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    FetchMessageHistoryQuery,
    proto,
    WAPresence
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';

// Types
export interface ListingNotification {
    id: string;
    title: string;
    price: number;
    description: string;
    city: string;
    category_id: string;
    condition: string;
    image_url?: string;
    site_url: string;
}

export class WhatsAppService {
    private sock: any;
    private logger = pino({ level: 'info' });
    private isConnected = false;
    private qrCode: string | null = null;

    constructor() {
        this.connectToWhatsApp();
    }

    async connectToWhatsApp() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

        this.sock = makeWASocket({
            logger: this.logger,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, this.logger),
            },
            generateHighQualityLinkPreview: true,
        });

        this.sock.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qrCode = qr;
                this.logger.info('QR Code received. Please scan!');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                this.logger.info(`Connection closed due to ${lastDisconnect?.error}, reconnecting: ${shouldReconnect}`);
                if (shouldReconnect) {
                    this.connectToWhatsApp();
                } else {
                    this.logger.error('Connection closed. You are logged out. Delete auth_info_baileys and restart to scan QR again.');
                }
                this.isConnected = false;
            } else if (connection === 'open') {
                this.logger.info('Opened connection to WhatsApp!');
                this.isConnected = true;
                this.qrCode = null;
            }
        });

        this.sock.ev.on('creds.update', saveCreds);
    }

    getQrCode() {
        return this.qrCode;
    }

    getStatus() {
        return {
            connected: this.isConnected,
            qr: this.qrCode
        };
    }

    async sendListingNotification(jid: string, listing: ListingNotification) {
        if (!this.isConnected) {
            throw new Error('WhatsApp client not connected');
        }

        const { title, price, description, city, condition, image_url, site_url } = listing;

        const caption = `🏝️ *New on AndamanBazaar!*
    
*${title}*
💰 ₹${price.toLocaleString('en-IN')}
📍 ${city}
📦 Condition: ${condition.replace(/_/g, ' ')}

${description ? description.substring(0, 150) + (description.length > 150 ? '...' : '') : ''}

🔗 *View Listing:* ${site_url}/listings/${listing.id}`;

        try {
            if (image_url) {
                await this.sock.sendMessage(jid, {
                    image: { url: image_url },
                    caption: caption
                });
            } else {
                await this.sock.sendMessage(jid, { text: caption });
            }
            return { success: true };
        } catch (error) {
            this.logger.error(error, 'Failed to send message');
            throw error;
        }
    }

    // Helper to find groups
    async getGroups() {
        if (!this.isConnected) return [];
        const groups = await this.sock.groupFetchAllParticipating();
        return Object.values(groups).map((g: any) => ({
            id: g.id,
            subject: g.subject
        }));
    }
}
