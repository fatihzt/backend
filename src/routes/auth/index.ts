import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { signupSchema, loginSchema, updateProfileSchema } from './auth.schema';

const authRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Signup Route
    fastify.post('/signup', { schema: signupSchema, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
        try {
            const { email, password, full_name } = request.body as any;

            fastify.log.info({ email, full_name }, 'Signup Request');

            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await fastify.pg.query(
                'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
                [email, hashedPassword, full_name]
            );

            const user = result.rows[0];
            const token = fastify.jwt.sign({ id: user.id, email: user.email });

            fastify.log.info({ userId: user.id, email: user.email }, 'Signup Success');

            return { user, token };
        } catch (err: any) {
            fastify.log.error({
                message: err.message,
                code: err.code,
                detail: err.detail,
                email: (request.body as any)?.email,
            }, 'Signup Error');

            if (err.code === '23505') {
                return reply.code(409).send({ message: 'User already exists' });
            }
            throw err;
        }
    });

    // Login Route
    fastify.post('/login', { schema: loginSchema, config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
        try {
            const { email, password } = request.body as any;

            fastify.log.info({ email }, 'Login Request');

            const result = await fastify.pg.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                fastify.log.warn({ email }, 'Login Failed: Invalid credentials');
                return reply.code(401).send({ message: 'Invalid credentials' });
            }

            const token = fastify.jwt.sign({ id: user.id, email: user.email });

            fastify.log.info({ userId: user.id, email: user.email }, 'Login Success');

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name
                },
                token
            };
        } catch (err: any) {
            fastify.log.error({
                message: err.message,
                code: err.code,
                email: (request.body as any)?.email,
            }, 'Login Error');
            throw err;
        }
    });

    // Update Profile Route
    fastify.put('/profile', {
        schema: updateProfileSchema,
        preHandler: [fastify.authenticate]
    }, async (request, reply) => {
        try {
            const userId = (request.user as any).id;
            const { full_name } = request.body as any;

            fastify.log.info({ userId }, 'Profile Update Request');

            const result = await fastify.pg.query(
                'UPDATE users SET full_name = $1 WHERE id = $2 RETURNING id, email, full_name',
                [full_name, userId]
            );

            if (result.rows.length === 0) {
                return reply.code(404).send({ message: 'User not found' });
            }

            fastify.log.info({ userId }, 'Profile Updated');
            return { user: result.rows[0] };
        } catch (err: any) {
            fastify.log.error({ message: err.message, userId: (request.user as any)?.id }, 'Profile Update Error');
            throw err;
        }
    });
};

export default authRoutes;
