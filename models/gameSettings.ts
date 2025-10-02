import { pool } from "../db/dbConnection"; // Import your MySQL pool
import type { IGameSettings } from "../interfaces";

export class GameSettings {
    static async create(settings: IGameSettings) {
        const query = `INSERT INTO game_settings (settings) VALUES (?)`;
        const [result] = await pool.execute(query, [JSON.stringify(settings)]);
        return result;
    }

    static async findById(id: number) {
        const [rows]: any = await pool.query(`SELECT * FROM game_settings WHERE id = ?`, [id]);
        return rows[0] || null;
    }

    static async fetchActiveSettings() {
        const [rows]: any = await pool.query(`SELECT settings FROM game_settings WHERE is_active = true`);
        return rows;
    }
}