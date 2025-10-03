import type { Socket } from "socket.io";
import { ROOM_CONFIG } from "../constants/constant";
import type { BetAction, BetResult, IGameData, Info, Mults, TRoomId } from "../interfaces";
import { generateUUIDv7 } from "./v2Transactions";

export const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 11=J,12=Q,13=K,14=A
export const suits = ["H", "C", "D", "S"]; // Hearts, Clubs, Diamonds, Spades

export function generateDeck(): string[] {
    const deck: string[] = [];
    for (const suit of suits) {
        for (const val of values) {
            deck.push(`${suit}${val}`);
        }
    }
    return deck;
}

export function shuffleDeck(deck: string[]) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

export const getCardValue = (card: string): number => {
    return parseInt(card.slice(1));
};

export const getCardSuit = (card: string): string => {
    return card[0];
};

export const getCardColor = (card: string): "RED" | "BLACK" => {
    const suit = getCardSuit(card);
    return suit === "H" || suit === "D" ? "RED" : "BLACK";
};


export const toFixed = (num: number, fixed: number) => {
    fixed = fixed || 0;
    fixed = Math.pow(10, fixed);
    return Math.floor(num * fixed) / fixed;
};

// export const probMultCalculator = (mult: number, currentCard: string): Mults => {
//     const value = getCardValue(currentCard);
//     let hiProb, loProb, smProb, rbProb, hrProb, ddProb, cbProb, sdProb,
//         hiMult, loMult, smMult, rbMult, hrMult, ddMult, cbMult, sdMult;
//     const RTP = Number(process.env.RTP);
//     if (mult) {
//         hiProb = (14 - value) / 13;
//         if (value === 1) hiProb *= 0.9231;
//         hiMult = toFixed((RTP / hiProb), 2) * mult;
//         loProb = value / 13;
//         if (value === 13) loProb *= 0.9231;
//         loMult = toFixed((RTP / loProb), 2) * mult;
//         smProb = 1 / 13;
//         smMult = (RTP / smProb) * mult;
//         rbProb = 1 / 2;
//         rbMult = (RTP / rbProb) * mult;
//     } else {
//         hiProb = (14 - value) / 13;
//         if (value === 1) hiProb *= 0.9231;
//         hiMult = toFixed((1 / hiProb), 2) * RTP;
//         loProb = value / 13;
//         if (value === 13) loProb *= 0.9231;
//         loMult = toFixed((1 / loProb), 2) * RTP;
//         smProb = 1 / 13;
//         smMult = (1 / smProb) * RTP;
//         rbProb = 1 / 2;
//         rbMult = (1 / rbProb) * RTP;
//     }
//     return {
//         HI: {
//             prob: Number((hiProb * 100).toFixed(2)),
//             mult: Number(hiMult.toFixed(2)),
//         },
//         LO: {
//             prob: Number((loProb * 100).toFixed(2)),
//             mult: Number(loMult.toFixed(2)),
//         },
//         SM: {
//             prob: Number((smProb * 100).toFixed(2)),
//             mult: Number(smMult.toFixed(2)),
//         },
//         RB: {
//             prob: Number((rbProb * 100).toFixed(2)),
//             mult: Number(rbMult.toFixed(2)),
//         },
//     };
// };

export const probMultCalculator = (
    mult: number,
    currentCard: string,
    deck: string[] // remaining deck
): Mults => {
    const value = getCardValue(currentCard);
    const RTP = Number(process.env.RTP);

    let hiProb, loProb, smProb, rbProb,
        hiMult, loMult, smMult, rbMult;

    // ---------------- HI / LO / SAME / RED-BLACK ----------------
    if (mult) {
        hiProb = (14 - value) / 13;
        if (value === 1) hiProb *= 0.9231;
        hiMult = (RTP / hiProb) * mult;

        loProb = value / 13;
        if (value === 13) loProb *= 0.9231;
        loMult = (RTP / loProb) * mult;

        smProb = 1 / 13;
        smMult = (RTP / smProb) * mult;

        rbProb = 1 / 2; // (we’ll fix this below dynamically too if you want)
        rbMult = (RTP / rbProb) * mult;
    } else {
        hiProb = (14 - value) / 13;
        if (value === 1) hiProb *= 0.9231;
        hiMult = (1 / hiProb) * RTP;

        loProb = value / 13;
        if (value === 13) loProb *= 0.9231;
        loMult = (1 / loProb) * RTP;

        smProb = 1 / 13;
        smMult = (1 / smProb) * RTP;

        rbProb = 1 / 2;
        rbMult = (1 / rbProb) * RTP;
    }

    // ---------------- SUITS ----------------
    const suitCounts: Record<string, number> = { H: 0, D: 0, C: 0, S: 0 };
    for (const card of deck) {
        suitCounts[getCardSuit(card)]++;
    }

    const total = deck.length;

    const prob = {
        H: suitCounts.H / total,
        D: suitCounts.D / total,
        C: suitCounts.C / total,
        S: suitCounts.S / total,
    };

    const mults = {
        H: (RTP / prob.H) * (mult || 1),
        D: (RTP / prob.D) * (mult || 1),
        C: (RTP / prob.C) * (mult || 1),
        S: (RTP / prob.S) * (mult || 1),
    };

    // ---------------- RETURN ----------------
    return {
        HI: { prob: Number((hiProb * 100).toFixed(2)), mult: Number(hiMult.toFixed(2)) },
        LO: { prob: Number((loProb * 100).toFixed(2)), mult: Number(loMult.toFixed(2)) },
        SM: { prob: Number((smProb * 100).toFixed(2)), mult: Number(smMult.toFixed(2)) },
        RB: { prob: Number((rbProb * 100).toFixed(2)), mult: Number(rbMult.toFixed(2)) },
        H: { prob: Number((prob.H * 100).toFixed(2)), mult: Number(mults.H.toFixed(2)) },
        D: { prob: Number((prob.D * 100).toFixed(2)), mult: Number(mults.D.toFixed(2)) },
        C: { prob: Number((prob.C * 100).toFixed(2)), mult: Number(mults.C.toFixed(2)) },
        S: { prob: Number((prob.S * 100).toFixed(2)), mult: Number(mults.S.toFixed(2)) },
    };
};


export const betChecker = (
    mult: Mults,
    newCard: string,
    previousCard: string,
    action: BetAction
): BetResult => {
    let betCheck: BetResult = { win: false, chose: action, mult: 0 };

    const currentVal = getCardValue(previousCard);
    const compVal = getCardValue(newCard);
    const compColor = getCardColor(newCard);
    const compSuit = getCardSuit(newCard);

    switch (action) {
        case "HI": {
            // Tie counts as win if between 2–12 (your existing rule)
            if (compVal === currentVal && currentVal >= 2 && currentVal <= 12) {
                betCheck.mult = mult.HI.mult;
            } else if (compVal > currentVal) {
                betCheck.mult = mult.HI.mult;
            }
            break;
        }
        case "LO": {
            if (compVal === currentVal && currentVal >= 2 && currentVal <= 12) {
                betCheck.mult = mult.LO.mult;
            } else if (compVal < currentVal) {
                betCheck.mult = mult.LO.mult;
            }
            break;
        }
        case "BL": {
            if (compColor === "BLACK") {
                betCheck.mult = mult.RB?.mult ?? mult.RB.mult; // if you separate BL later
            }
            break;
        }
        case "RD": {
            if (compColor === "RED") {
                betCheck.mult = mult.RB?.mult ?? mult.RB.mult; // if you separate RD later
            }
            break;
        }
        case "SM": {
            if (currentVal === compVal) {
                betCheck.mult = mult.SM.mult;
            }
            break;
        }
        case "H": {
            if (compSuit === "H") {
                betCheck.mult = mult.H.mult;
            }
            break;
        }
        case "D": {
            if (compSuit === "D") {
                betCheck.mult = mult.D.mult;
            }
            break;
        }
        case "C": {
            if (compSuit === "C") {
                betCheck.mult = mult.C.mult;
            }
            break;
        }
        case "S": {
            if (compSuit === "S") {
                betCheck.mult = mult.S.mult;
            }
            break;
        }
    }

    if (betCheck.mult > 0) betCheck.win = true;

    return betCheck;
};


export const winCalculator = (betAmt: number, mult: number) => {
    let payout = betAmt * mult;
    return payout > 0 ? Number(Math.fround(payout).toFixed(2)) : 0;
};


export const resetGameState = (info: Info, roomId: TRoomId, betAmt: number = 0, firstEightCards: string[], shuffledDeck: string[]) => {
    const gameData: IGameData = {
        lobby_id: generateUUIDv7(),
        user_id: info.urId,
        operator_id: info.operatorId,
        mult_bank: 1,
        bet_amount: betAmt,
        room_id: roomId,
        category: "",
        cardsHistory: firstEightCards, // 8 cards , last will be the last card drawn when new card is picked will be compared with last card drawn
        deck: shuffledDeck, // all remaining cards
        revealedCount: 1,
        status: "not_started",//  "not_started" | "win" | "loss" | "running"
        txn_id: "",
        mults: probMultCalculator(1, firstEightCards[firstEightCards.length - 1], shuffledDeck),
        roomConfig: ROOM_CONFIG[roomId],
    };
    return gameData;
}

export const validateBet = (btAmt: number, roomId: keyof typeof ROOM_CONFIG, balance: number, socket: Socket): boolean => {
    if (isNaN(btAmt)) {
        socket.emit("betError", "Invalid bet amount type");
        return false;
    }

    if (btAmt > balance) {
        socket.emit("betError", "Insufficient Balance");
        return false;
    }

    const room = ROOM_CONFIG[roomId];
    if (!room) {
        socket.emit("betError", "Invalid Room ID");
        return false;
    }

    if (btAmt < room.min_bet || btAmt > room.max_bet) {
        socket.emit(
            "betError",
            `Invalid bet amount. Allowed range: ${room.min_bet} - ${room.max_bet}`
        );
        return false;
    }

    return true;
};