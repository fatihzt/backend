/**
 * Notifications Routes - Device token kaydı ve push notification yönetimi
 */

import { FastifyPluginAsync } from 'fastify';
import pool from '../../services/db';

const notificationRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Device token kaydetme endpoint'i
  fastify.post('/register', {
    schema: {
      tags: ['Notifications'],
      summary: 'Register device token for push notifications',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['token', 'platform'],
        properties: {
          token: { type: 'string' },
          platform: { type: 'string', enum: ['ios', 'android', 'web'] },
          userId: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { token, platform } = request.body as any;
    const userId = (request.user as any).id;

    try {
      // Token'ı database'e kaydet (upsert - varsa güncelle, yoksa ekle)
      await fastify.pg.query(
        `INSERT INTO device_tokens (user_id, token, platform)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, token) 
         DO UPDATE SET platform = EXCLUDED.platform, created_at = NOW()`,
        [userId, token, platform]
      );

      return {
        message: 'Device token registered successfully',
        success: true,
      };
    } catch (err: any) {
      fastify.log.error(err, 'Failed to register device token');
      return reply.code(500).send({
        error: 'Failed to register device token',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  });

  // Kullanıcının token'larını listele (test için)
  fastify.get('/tokens', {
    schema: {
      tags: ['Notifications'],
      summary: 'Get user device tokens',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            tokens: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  platform: { type: 'string' },
                  created_at: { type: 'string' },
                },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const userId = (request.user as any).id;

    try {
      const result = await fastify.pg.query(
        'SELECT token, platform, created_at FROM device_tokens WHERE user_id = $1',
        [userId]
      );

      return {
        tokens: result.rows,
      };
    } catch (err: any) {
      fastify.log.error(err, 'Failed to get device tokens');
      return reply.code(500).send({
        error: 'Failed to get device tokens',
      });
    }
  });
};

export default notificationRoutes;

