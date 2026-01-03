import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { signupSchema, loginSchema } from './auth.schema';

const authRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Signup Route
    fastify.post('/signup', { schema: signupSchema }, async (request, reply) => {
        const { email, password, full_name } = request.body as any;

        const hashedPassword = await bcrypt.hash(password, 10);

        try {
            const result = await fastify.pg.query(
                'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
                [email, hashedPassword, full_name]
            );

            const user = result.rows[0];
            const token = fastify.jwt.sign({ id: user.id, email: user.email });

            return { user, token };
        } catch (err: any) {
            if (err.code === '23505') {
                return reply.code(409).send({ message: 'User already exists' });
            }
            throw err;
        }
    });

    // Login Route
    fastify.post('/login', { schema: loginSchema }, async (request, reply) => {
        const { email, password } = request.body as any;

        const result = await fastify.pg.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return reply.code(401).send({ message: 'Invalid credentials' });
        }

        const token = fastify.jwt.sign({ id: user.id, email: user.email });

        return {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name
            },
            token
        };
    });
};

export default authRoutes;
