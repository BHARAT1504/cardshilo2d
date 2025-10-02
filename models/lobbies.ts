import { pool } from "../db/dbConnection";

export class Lobbies {
    static async create(round_id: number, result: any) {
        const query = "insert into lobbies (round_id, result) values (?,?)";
        const [insertId]: any = await pool.execute(query, [round_id, JSON.stringify(result)]);
        return insertId;
    }
    static async loadPrevThree(limit: number) {
        const query = `select result from lobbies order by created_at desc limit ${limit}`;
        const [data]: any[] = await pool.query(query);
        return data.map((e: any) => e.result);
    }
}