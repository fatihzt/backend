
const errorResponse = {
    type: 'object',
    properties: {
        message: { type: 'string' }
    }
};

export const createEventSchema = {
    tags: ['Events'],
    summary: 'Create a new event',
    security: [{ bearerAuth: [] }],
    body: {
        type: 'object',
        required: ['title', 'start_time', 'city'],
        properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            city: { type: 'string' },
            category: { type: 'string' },
            image_url: { type: 'string' },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'string', format: 'uuid' },
                title: { type: 'string' },
                city: { type: 'string' }
            }
        },
        400: errorResponse,
        500: errorResponse
    }
};

export const listEventsSchema = {
    tags: ['Events'],
    summary: 'List events',
    querystring: {
        type: 'object',
        properties: {
            city: { type: 'string' },
            category: { type: 'string' },
            search: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            description: { type: 'string' },
                            location: { type: 'string' },
                            city: { type: 'string' },
                            category: { type: 'string' },
                            image_url: { type: 'string' },
                            start_time: { type: 'string' },
                            source: { type: 'string' },
                            creator_name: { type: 'string' }
                        }
                    }
                },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' }
            }
        },
        500: errorResponse
    }
};

export const getEventSchema = {
    tags: ['Events'],
    summary: 'Get single event',
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                location: { type: 'string' },
                city: { type: 'string' },
                category: { type: 'string' },
                image_url: { type: 'string' },
                start_time: { type: 'string' },
                end_time: { type: 'string' }
            }
        },
        404: errorResponse,
        500: errorResponse
    }
};

export const rsvpEventSchema = {
    tags: ['Events'],
    summary: 'RSVP to an event',
    security: [{ bearerAuth: [] }],
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string', format: 'uuid' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                message: { type: 'string' }
            }
        },
        409: errorResponse
    }
};
