import { createPool } from "mysql2/promise";
import { createLogger } from "../utilities/logger";
import { betResult, gameSettings, lobby, settlement } from "./tables";
import { config } from "dotenv";
config({ path: ".env" })

const logger = createLogger("DB", "plain")

export const pool = createPool({
    port: Number(process.env.DB_PORT ?? "3306"),
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export const createTables = async () => {
    try {
        let dbMaxRetries: number = Number(process.env.DB_MAX_RETRIES) || 5;
        for (let i = 0; i < dbMaxRetries; i++) {
            if (await pool.getConnection()) {
                logger.info(`db connection successful in ${i || 0} tries.`);
                break;
            } else {
                logger.error(`db connection unsuccessful in ${i} tries`);
                await new Promise(resolve => setTimeout(resolve, 1000 * i));
            }
        }
        await pool.execute(gameSettings);
        await pool.execute(lobby);
        await pool.execute(betResult);
        await pool.execute(settlement);
    } catch (error: any) {
        logger.error(error.message);
    }
};

