import type { Socket } from "socket.io";
import { PlrBetActions, type BetAction, type IBetObject, type IGameData, type Info, type TRoomId } from "../interfaces";
import { delCache, getCache, setCache } from "../cache/redis";
import { betChecker, generateDeck, probMultCalculator, resetGameState, shuffleDeck, validateBet } from "../utilities/roundResult";
import { updateBalanceFromAccount } from "../utilities/v2Transactions";
import { ROOM_CONFIG } from "../constants/constant";
import { Settlements } from "../models/settlements";

export const joinRoom = async (socket: Socket, rmId: string[]) => {
    try {
        const info: Info = await getCache(socket.id);
        if (!info) return socket.emit("betError", "User details not found.");

        let roomId = rmId.join("");
        if (!roomId || !Object.keys(ROOM_CONFIG).includes(roomId)) return socket.emit("betError", "invalid room id");
        if (socket.rooms.size > 2) return socket.emit("betError", "Cannot join multiple rooms at once.");

        const shuffledDeck = shuffleDeck(generateDeck());
        const firstEightCards = shuffledDeck.splice(0, 8);

        const gameData = resetGameState(info, roomId as TRoomId, 0, firstEightCards, shuffledDeck);
        await setCache(`GM:${info.urId}:${info.operatorId}`, gameData);
        socket.emit("gameData", { ...gameData, deck: [] })

        return;
    } catch (error: any) {
        console.error("error occured", error.message);
    }
}

export const startGame = async (socket: Socket, payload: string[]) => {
    try {
        const info: Info = await getCache(socket.id);
        if (!info) return socket.emit("betError", "User details not found.");

        let [roomId, betAmt, atn]: [TRoomId, string, string] = payload as [TRoomId, string, string];

        const isValidBetAmount = validateBet(Number(betAmt), roomId, info.bl, socket);
        if (!isValidBetAmount) return;
        if ([...socket.rooms].includes(roomId)) return socket.emit("betError", "Room not joined yet.");

        const gameDataKey = `GM:${info.urId}:${info.operatorId}`;
        const gameData: IGameData = await getCache(gameDataKey);
        if (!gameData) return socket.emit("betError", "invalid bet session");
        if (gameData.txn_id) return socket.emit("betError", "previous game not ended")

        const debitTransaction = {
            id: gameData.lobby_id,
            bet_amount: Number(betAmt),
            game_id: info.gmId,
            user_id: info.urId,
            ip: info.ip,
            txn_id: gameData.lobby_id
        };

        const playerDetailsForTxn = { game_id: info.gmId, operatorId: info.operatorId, token: info.token };

        const txnDbt: IBetObject | boolean = await updateBalanceFromAccount(debitTransaction, "DEBIT", playerDetailsForTxn);
        if (!txnDbt) return socket.emit("betError", "Bet Cancelled by Upstream");
        // @ts-ignore
        gameData.txn_id = txnDbt.txn_id;
        gameData.bet_amount = Number(betAmt);

        await setCache(`GM:${info.urId}:${info.operatorId}`, gameData);

        return await pickCard(socket, [atn]);
    } catch (error: any) {
        console.error("error occured", error.message);
    }
}

export const pickCard = async (socket: Socket, betData: string[]) => {
    try {
        console.log("pick card called", betData);
        const info: Info = await getCache(socket.id);
        if (!info) socket.emit("betError", "User details not found.");

        const gameDataKey = `GM:${info.urId}:${info.operatorId}`;
        let gameData: IGameData = await getCache(gameDataKey);
        if (!gameData) return socket.emit("betError", "Game play data not found");
        if (!gameData.txn_id) return socket.emit("betError", "Game not started, cannot pick card")

        const plAtn = betData.join("");
        if (!PlrBetActions.includes(plAtn)) return socket.emit("betError", "Invalid action");

        const pkCdIdx = Math.floor(Math.random() * gameData.deck.length);
        const pkdCd = gameData.deck.splice(pkCdIdx, 1).join("");

        const cmprCd = gameData.cardsHistory[gameData.cardsHistory.length - 1];

        const { chose, mult, win } = betChecker(gameData.mults, pkdCd, cmprCd, plAtn as BetAction)

        const cardToPushInDeck = gameData.cardsHistory.shift();
        gameData.cardsHistory.push(pkdCd);
        gameData.deck.push(cardToPushInDeck as string);
        gameData.category = plAtn;
        gameData.revealedCount++;
        gameData.mult_bank += mult;
        gameData.status = win ? "win" : "loss";
        gameData.category = plAtn;
        gameData.mults = probMultCalculator(gameData.mult_bank, pkdCd, gameData.deck);
        console.log("post pick card game data", gameData);

        if (!win) {
            socket.emit("pickCardResult", { message: "you loss", mult, chose, win, pickedCard: pkdCd, previousCard: cmprCd });
            socket.emit("gameData", { ...gameData, deck: [] });
            gameData = resetGameState(info, gameData.room_id as TRoomId, 0, gameData.cardsHistory, gameData.deck);
        }
        await setCache(gameDataKey, gameData);

        if (win) socket.emit("pickCardResult", { message: "card picked successfully", mult, chose, win });
        setTimeout(() => {
            socket.emit("gameData", { ...gameData, deck: [] });
        }, 1000);


        return;

    } catch (error: any) {
        console.error("error occured", error.message);
    }
}

export const cashoutHandler = async (socket: Socket) => {
    try {
        console.log("cashout called");
        const info: Info = await getCache(socket.id);
        if (!info) socket.emit("betError", "User details not found.");

        const gameDataKey = `GM:${info.urId}:${info.operatorId}`;
        let gameData: IGameData = await getCache(gameDataKey);
        if (!gameData || !gameData.mult_bank) return socket.emit("betError", "Game session data not found");

        const payout = Math.min(gameData.bet_amount * gameData.mult_bank, gameData.roomConfig.max_co);
        if (!payout) return socket.emit("betError", "No payout for current game session.")

        let cdtObj = {
            id: gameData.lobby_id,
            user_id: info.urId,
            game_id: info.gmId,
            bet_amount: Number(gameData.bet_amount.toFixed(2)),
            winning_amount: Number(payout.toFixed(2)),
            txn_id: gameData.txn_id,
            ip: info.ip
        };

        let cdtTxn = await updateBalanceFromAccount(cdtObj, "CREDIT", {
            game_id: info.gmId,
            operatorId: info.operatorId,
            token: info.token,
        });

        if (!cdtTxn) console.info("Credit failed for user");
        info.bl += Number(payout.toFixed(2));
        await setCache(socket.id, info);
        socket.emit("info", info);
        socket.emit("cashout", "Cashout done successfully, cashout amount:" + payout.toFixed(2));

        await Settlements.create({
            user_id: info.urId,
            round_id: gameData.txn_id,  // using txn_id as round identifier
            operator_id: info.operatorId,
            bet_amt: Number(gameData.bet_amount.toFixed(2)),
            win_amt: Number(payout.toFixed(2)),

            // settlement details
            settled_bets: {
                payout,
                mult_bank: gameData.mult_bank,
                category: gameData.category,
                room_id: gameData.room_id,
            },

            // final round result (cards + status + revealed count)
            round_result: {
                cardsHistory: gameData.cardsHistory,
                revealedCount: gameData.revealedCount,
                status: gameData.status,
                deck: gameData.deck.length, // just store count, not full deck for DB optimization
            },

            status: payout > 0 ? "WIN" : "LOSS",
        });


        const shuffledDeck = shuffleDeck(generateDeck());
        const firstEightCards = shuffledDeck.splice(0, 8);
        gameData = resetGameState(info, gameData.room_id as TRoomId, 0, firstEightCards, shuffledDeck)
        await setCache(gameDataKey, gameData);
        socket.emit("gameData", { ...gameData, deck: [] });

        return;
    } catch (error: any) {
        console.error("error occured", error.message);
    }
}

export const leaveRoom = async (socket: Socket,) => {
    try {
        const info: Info = await getCache(socket.id);
        if (!info) socket.emit("betError", "User details not found.");

        const gameDataKey = `GM:${info.urId}:${info.operatorId}`;
        let gameData: IGameData = await getCache(gameDataKey);
        if (gameData && gameData.mult_bank && gameData.status == "running") {
            await cashoutHandler(socket);
        }
        await delCache(gameDataKey);

        socket.emit("leave", "room left successfully")
        return
    } catch (error: any) {
        console.error("error occured", error.message);
    }
}


// const gameData = {
//     lobby_id: generateUUIDv7(),
//     user_id: playerDetails.user_id,
//     operator_id: playerDetails.operatorId,
//     mult_bank: 0,
//     bet_amount: betData.btAmt,
//     room_id: 101,
//     category: betData.category,
//     cardsHistory: [], // 8 cards , last will be the last card drawn when new card is picked will be compared with last card drawn
//     deck: [], // all remaining cards
//     revealedCount: 1,
//     status: "running",// "win"|"loss"|"running",
//     txn_id: "txnid",
//     mults : {
//     hi: 0,
//     lo: 0,
//     rd: 0,
//     bl: 0,
//     h: 0,
//     c: 0,
//     s: 0,
//     d: 0
//     }
// };

// const GAME_CATEGORY = {
//     HI: "High",
//     LO: "Low",
//     RE: "Red",
//     BL: "Black",
//     H: "Heart",
//     C: "Club",
//     S: "Spade",
//     D: "Diamond"
// };