import axios from "axios";
import crypto from "crypto";
import { sendToQueue } from "./amqp.js";
import { createLogger } from "./logger.js";
import type { IBetObject, IPlayerDetails, IWebhookData } from "../interfaces/index";

const thirdPartyLogger = createLogger("ThirdPartyRequest", "jsonl");
const failedThirdPartyLogger = createLogger("FailedThirdPartyRequest", "jsonl");

export const generateUUIDv7 = (): string => {
  const timestamp = Date.now();
  const timeHex = timestamp.toString(16).padStart(12, "0");
  const randomBits = crypto.randomBytes(8).toString("hex").slice(2);
  const uuid = [
    timeHex.slice(0, 8),
    timeHex.slice(8) + randomBits.slice(0, 4),
    "7" + randomBits.slice(4, 7),
    ((parseInt(randomBits.slice(7, 8), 16) & 0x3f) | 0x80).toString(16) +
    randomBits.slice(8, 12),
    randomBits.slice(12),
  ];

  return uuid.join("-");
};

export const updateBalanceFromAccount = async (
  data: IBetObject,
  key: "CREDIT" | "DEBIT",
  playerDetails: IPlayerDetails
): Promise<boolean | IBetObject> => {
  try {
    const webhookData = await prepareDataForWebhook(
      { ...data, game_id: playerDetails.game_id },
      key
    );
    if (!webhookData) return false;

    if (key === "CREDIT") {
      thirdPartyLogger.info(
        JSON.stringify({ logId: generateUUIDv7(), webhookData, playerDetails })
      );
      await sendToQueue(
        "",
        "games_cashout",
        JSON.stringify({
          ...webhookData,
          operatorId: playerDetails.operatorId,
          token: playerDetails.token,
        })
      );
      return true;
    }

    data.txn_id = webhookData.txn_id;
    const sendRequest = await sendRequestToAccounts(
      webhookData,
      playerDetails.token
    );
    if (!sendRequest) return false;
    return data;
  } catch (err) {
    console.error(`Err while updating Player's balance:`, err);
    return false;
  }
};

export const sendRequestToAccounts = async (
  webhookData: IWebhookData,
  token: string
): Promise<boolean> => {
  try {
    const url = process.env.service_base_url;
    if (!url) throw new Error("Service base URL is not defined");

    const clientServerOptions = {
      method: "POST",
      url: `${url}/service/operator/user/balance/v2`,
      headers: { token },
      data: webhookData,
      timeout: 5000,
    };

    const response = await axios(clientServerOptions);
    const responseData = response?.data;

    thirdPartyLogger.info(
      JSON.stringify({
        logId: generateUUIDv7(),
        req: clientServerOptions,
        res: responseData,
      })
    );
    return responseData?.status ?? false;
  } catch (err: any) {
    console.error(`Err while sending request to accounts:`, err?.message);
    failedThirdPartyLogger.error(
      JSON.stringify({
        logId: generateUUIDv7(),
        req: { webhookData, token },
        res: err?.response?.status,
      })
    );
    return false;
  }
};

export const prepareDataForWebhook = async (
  betObj: IBetObject,
  key: "CREDIT" | "DEBIT"
): Promise<IWebhookData | false> => {
  try {
    const { id, bet_amount, winning_amount, game_id, user_id, txn_id, ip } = betObj;
    const obj: IWebhookData = {
      txn_id: generateUUIDv7(),
      ip,
      game_id,
      user_id: decodeURIComponent(user_id),
    };

    switch (key) {
      case "DEBIT":
        obj.amount = bet_amount;
        obj.description = `${bet_amount.toFixed(2)} debited for ${process.env.GAME_NAME} game for Round ${id}`;
        obj.bet_id = id;
        obj.txn_type = 0;
        break;
      case "CREDIT":
        obj.amount = winning_amount;
        obj.txn_ref_id = txn_id;
        obj.description = `${winning_amount?.toFixed(2)} credited for ${process.env.GAME_NAME} game for Round ${id}`;
        obj.txn_type = 1;
        break;
    }
    return obj;
  } catch (err) {
    console.error(`[ERR] while preparing data for webhook:`, err);
    return false;
  }
};
