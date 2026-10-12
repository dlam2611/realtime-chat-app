import Redis from "ioredis";

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: null,
};

const redisUri = process.env.REDIS_URI || process.env.REDIS_URL;

export const redis = redisUri
  ? new Redis(redisUri, {
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: null,
    })
  : new Redis(redisOptions);

redis.on("connect", () => {
  console.log("Redis connecting...");
});

redis.on("ready", () => {
  console.log("Kết nối Redis thành công");
});

redis.on("error", (err) => {
  console.error("Lỗi kết nối Redis:", err.message);
});

export default redis;
