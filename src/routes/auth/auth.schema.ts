const errorResponse = {
    type: 'object',
    properties: {
        message: { type: 'string' }
    }
};

export const signupSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            full_name: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        full_name: { type: 'string' }
                    }
                },
                token: { type: 'string' }
            }
        },
        400: errorResponse,
        409: errorResponse
    }
};

export const loginSchema = {
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        full_name: { type: 'string' }
                    }
                },
                token: { type: 'string' }
            }
        },
        401: errorResponse
    }
};
