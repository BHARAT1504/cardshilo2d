import { createLogger } from "./logger.js";
import { Socket } from "socket.io";

export const failedBetLogger = createLogger("failedBets", "jsonl");
export const failedSettlementLogger = createLogger("failedSettlement", "jsonl")
interface RequestData {
  [key: string]: any; // Adjust this based on your actual request structure
}

type EventType = "bet" | "settlement"

export const logEventAndEmitResponse = (
  socket: Socket,
  event: EventType,
  req: RequestData,
  res: string
): void => {
  const logData = JSON.stringify({ req, res });

  switch (event) {
    case "bet":
      failedBetLogger.error(logData);
      break;
      break;
    case "settlement":
      failedSettlementLogger.error(logData);
      break;
  }

  socket.emit("betError", res);
};
