/**
 * Notification Service - Expo Push API entegrasyonu
 */

import axios from 'axios';
import { Pool } from 'pg';

export interface NotificationPayload {
    userId?: string;
    title: string;
    body: string;
    data?: any;
}

interface ExpoPushMessage {
    to: string;
    sound?: string;
    title: string;
    body: string;
    data?: any;
    badge?: number;
}

export class NotificationService {
    private static EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    /**
     * Tek bir kullanıcıya push notification gönder
     */
    static async sendPush(payload: NotificationPayload, pool: Pool) {
        if (!payload.userId) {
            return false;
        }

        try {
            // Kullanıcının device token'larını al
            const result = await pool.query(
                'SELECT token FROM device_tokens WHERE user_id = $1',
                [payload.userId]
            );

            if (result.rows.length === 0) {
                return false;
            }

            const tokens = result.rows.map((row) => row.token);

            // Expo Push API'ye gönder
            const messages: ExpoPushMessage[] = tokens.map((token) => ({
                to: token,
                sound: 'default',
                title: payload.title,
                body: payload.body,
                data: payload.data,
                badge: 1,
            }));

            const response = await axios.post(this.EXPO_PUSH_URL, messages, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
            });

            return response.data;
        } catch (error: any) {
            return false;
        }
    }

    /**
     * Şehir bazlı broadcast - O şehirdeki tüm kullanıcılara gönder
     */
    static async broadcast(city: string, payload: Omit<NotificationPayload, 'userId'>, pool: Pool) {
        try {
            // O şehirdeki kullanıcıların token'larını al
            // Not: Şimdilik tüm token'ları alıyoruz, ileride şehir bazlı filtreleme eklenebilir
            const result = await pool.query(
                `SELECT DISTINCT dt.token 
                 FROM device_tokens dt
                 JOIN users u ON dt.user_id = u.id
                 WHERE dt.token IS NOT NULL`
            );

            if (result.rows.length === 0) {
                return false;
            }

            const tokens = result.rows.map((row) => row.token);

            // Expo Push API'ye gönder
            const messages: ExpoPushMessage[] = tokens.map((token) => ({
                to: token,
                sound: 'default',
                title: payload.title,
                body: payload.body,
                data: payload.data,
                badge: 1,
            }));

            const response = await axios.post(this.EXPO_PUSH_URL, messages, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
            });

            return response.data;
        } catch (error: any) {
            return false;
        }
    }

    /**
     * Birden fazla token'a gönder (batch)
     */
    static async sendToTokens(tokens: string[], payload: Omit<NotificationPayload, 'userId'>) {
        if (tokens.length === 0) {
            return false;
        }

        try {
            const messages: ExpoPushMessage[] = tokens.map((token) => ({
                to: token,
                sound: 'default',
                title: payload.title,
                body: payload.body,
                data: payload.data,
                badge: 1,
            }));

            const response = await axios.post(this.EXPO_PUSH_URL, messages, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
            });

            return response.data;
        } catch (error: any) {
            return false;
        }
    }
}
