const Redis = require('ioredis');
const env = require('./env');

class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async get(key) {
    const expireAt = this.ttls.get(key);
    if (expireAt && Date.now() > expireAt) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      this.ttls.set(key, Date.now() + duration * 1000);
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }
}

const inMemoryFallback = new MemoryCacheFallback();
let client = null;
let isRedisReady = false;

if (env.REDIS_URL && env.REDIS_URL.trim() !== '') {
  try {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      showFriendlyErrorStack: false,
      retryStrategy: () => null, // Don't block event loop retrying if Redis is down
      enableOfflineQueue: false
    });

    client.on('connect', () => {
      isRedisReady = true;
      console.log('[Redis] Connected successfully');
    });

    client.on('error', () => {
      isRedisReady = false;
    });

    // Unref socket so it doesn't prevent Node process from exiting
    if (client.connector && client.connector.stream) {
      client.connector.stream.unref?.();
    }
  } catch (error) {
    isRedisReady = false;
  }
}

const cache = {
  async get(key) {
    if (isRedisReady && client) {
      try {
        return await client.get(key);
      } catch (err) {
        return await inMemoryFallback.get(key);
      }
    }
    return await inMemoryFallback.get(key);
  },

  async set(key, value, mode, duration) {
    if (isRedisReady && client) {
      try {
        if (mode && duration) {
          return await client.set(key, value, mode, duration);
        }
        return await client.set(key, value);
      } catch (err) {
        return await inMemoryFallback.set(key, value, mode, duration);
      }
    }
    return await inMemoryFallback.set(key, value, mode, duration);
  },

  async del(key) {
    if (isRedisReady && client) {
      try {
        return await client.del(key);
      } catch (err) {
        return await inMemoryFallback.del(key);
      }
    }
    return await inMemoryFallback.del(key);
  },

  isRedisActive: () => isRedisReady
};

module.exports = cache;
