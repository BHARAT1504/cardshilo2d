import type { RedisClientType } from "@redis/client";
import redis from "redis"
import { createLogger } from "../utilities/logger";

let con: RedisClientType | null = null;
const logger = createLogger("REDIS", "plain");

export const redisConnect = async () => {
    try {
        const url = process.env.REDIS_URL || "redis://localhost:6379";
        const password = process.env.REDIS_PASSWORD;

        if (con && con.isOpen) {
            console.log("✅ Redis connection successful");
            return con;
        }

        const client = redis.createClient({ url, password });

        client.on("error", (err) => console.error("❌ Redis Client Error:", err));
        client.on("end", () => console.log("🔌 Redis connection closed"));
        client.on("reconnecting", () => console.log("♻️ Redis reconnecting..."));

        await client.connect();
        logger.info("✅ Redis connection successful");

        return client as RedisClientType;
    } catch (error) {
        console.error("❌ Redis connection failed:", error);
        process.exit(1);
    }
};

export const setCache = async (key: string, value: any, ttl = 3600) => {
    if (!con) con = await redisConnect();
    await con.set(key, JSON.stringify(value), { EX: ttl });
};

export const getCache = async (key: string) => {
    if (!con) con = await redisConnect();
    const data = await con.get(key);
    return data ? JSON.parse(data) : null;
};

export const delCache = async (key: string) => {
    if (!con) con = await redisConnect();
    return await con.del(key);
};

export const flushCache = async () => {
    if (!con) con = await redisConnect();
    return await con.flushAll();
};

