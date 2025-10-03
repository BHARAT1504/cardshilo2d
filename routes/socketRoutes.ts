import type { Namespace, Socket } from "socket.io";
import type { Info } from "../interfaces";
import { delCache, getCache } from "../cache/redis";
import { Settlements } from "../models/settlements";
import { startGame, pickCard, leaveRoom, cashoutHandler, joinRoom } from "../handlers/handlers";
import { ROOM_CONFIG } from "../constants/constant";

export const socketRouter = async (io: Namespace, socket: Socket) => {
    try {
        console.log("socket connected with id:", socket.id);
        let lastWin: any;
        const info: Info = await getCache(socket.id);
        if (info) {
            lastWin = await Settlements.fetchLastWin(info.urId, info.operatorId);
            lastWin = lastWin.win_amt;
        }
        setTimeout(() => {
            socket.emit("roomConfig", ROOM_CONFIG);
            if (lastWin) socket.emit('lastWin', { lastWin: lastWin && typeof lastWin === "number" ? Number(lastWin).toFixed(2) : "0.00" });
        }, 100);

        socket.on("message", async (data: string) => {
            const [event, ...betData] = data.split(":");
            switch (event) {
                case "JN":
                    await joinRoom(socket, betData);
                    break;
                case "ST":
                    await startGame(socket, betData);
                    break;
                case "PC":
                    await pickCard(socket, betData);
                    break;
                case "CO":
                    await cashoutHandler(socket);
                    break;
                case "LV":
                    await leaveRoom(socket);
                    break;
                default:
                    socket.emit("betError", "invalid event");
                    break;
            }
        });
        return
    } catch (error) {
        console.error("error", error);
    }

    socket.on("disconnect", async (reason: string) => {
        console.log(`socket disconnected with id: ${socket.id}, reason: ${reason}`);
        const info: Info = await getCache(socket.id);
        await leaveRoom(socket);
        await delCache(`${info?.urId}:${info?.operatorId}`);
    });
}