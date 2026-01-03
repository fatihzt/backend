
import { Redis } from '@upstash/redis';

export interface IQueue {
    addToQueue(event: any): Promise<void>;
    popFromQueue(): Promise<any | null>;
}

export class RedisQueue implements IQueue {
    private redis: Redis;
    private queueKey = 'queue:events:real';

    constructor(redis: Redis) {
        this.redis = redis;
    }

    async addToQueue(event: any) {
        await this.redis.rpush(this.queueKey, JSON.stringify(event));
        console.log(`📥 [REDIS QUEUE] Event added: ${event.title}`);
    }

    async popFromQueue() {
        const item = await this.redis.lpop(this.queueKey);
        if (!item) return null;
        return typeof item === 'string' ? JSON.parse(item) : item;
    }
}

export class InMemoryQueue implements IQueue {
    // Static storage to persist across requests in a stateful server process
    // Note: This clears on server restart.
    private static queue: any[] = [];

    async addToQueue(event: any) {
        InMemoryQueue.queue.push(event);
        console.log(`📥 [MEMORY QUEUE] Event added: ${event.title}`);
    }

    async popFromQueue() {
        const item = InMemoryQueue.queue.shift();
        return item || null;
    }
}

// Factory Helper
export function getQueue(redis?: Redis): IQueue {
    if (redis) {
        return new RedisQueue(redis);
    }
    return new InMemoryQueue();
}
