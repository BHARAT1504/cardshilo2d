import { createServer } from "http";
import { Server, type Socket } from "socket.io"
import express from "express";
import cors from "cors";

import { createTables } from "./db/dbConnection"
import { createLogger } from "./utilities/logger";
import { checkAuth } from "./middlewares/socketAuth";
import { socketRouter } from "./routes/socketRoutes";
import { config } from "dotenv";
import { initQueue } from "./utilities/amqp";
import { loadConfig } from "./utilities/loadConfig";
import { apiRouter } from "./routes/apiRoutes";

config({ path: ".env" });
export const logger = createLogger("SERVER", "plain");

(async () => {
    await initQueue();
    await createTables();
    await loadConfig();
})()

const PORT = process.env.PORT || 3300;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

export const serverIo = io.of("/")
    .use((socket: Socket, next: Function) => checkAuth(socket, next))
    .on("connection", (socket: Socket) => socketRouter(serverIo, socket));

app.use(cors({ origin: "*" }));
app.get("/", (req: any, res: any) => res.status(200).send({ message: `${process.env.GAME_NAME} game backend says HI...✋`, statusCode: 200 }))
app.use("/api/v1", apiRouter)

httpServer.listen(PORT, () => logger.info(`${process.env.GAME_NAME} game backend running on port ${PORT}`));
