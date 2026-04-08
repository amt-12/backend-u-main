const Redis = require("ioredis");

const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL) 
  : new Redis({
      host: "127.0.0.1",
      port: process.env.REDIS_PORT || 6379,
    });

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

module.exports = redis;
