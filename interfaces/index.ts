import type { ROOM_CONFIG } from "../constants/constant";

export interface IUserDetailResponse {
    status: boolean;
    user: {
        user_id: string;
        name: string;
        balance: number;
        operatorId: string;
    };
}

export interface Info {
    urId: string;
    urNm: string;
    bl: number;
    sid: string;
    operatorId: string;
    gmId: string;
    token: string;
    ip: string;
}

/* TRANSACTION INTERFACES */
export interface IPlayerDetails {
    game_id: string;
    operatorId: string;
    token: string;
}

export interface IBetObject {
    id: string;
    bet_amount: number;
    winning_amount?: number;
    game_id: string;
    user_id: string;
    txn_id?: string;
    ip?: string;
}

export interface IWebhookData {
    txn_id: string;
    ip?: string;
    game_id: string;
    user_id: string;
    amount?: number;
    description?: string;
    bet_id?: string;
    txn_type?: number;
    txn_ref_id?: string;
}

// GAME_SETTINGS
export interface IGameSettings {
    min_amt: number;
    max_amt: number;
    max_co: number;
    main_mult: {
        PLAYER_A: number;
        PLAYER_B: number;
    },
    side_mult: {
        PAIR: number;
        FLUSH: number;
        STRAIGHT: number;
        STRAIGHT_FLUSH: number;
        TRIO: number;
    }
}

export type TRoomId = keyof typeof ROOM_CONFIG;

export const PlrBetActions = [
    "HI",
    "LO",
    "RD",
    "SM",
    "BL",
    "H",
    "C",
    "S",
    "D",
]

export interface MultResult {
    prob: number;
    mult: number;
}
export interface Mults {
    HI: MultResult;
    LO: MultResult;
    SM: MultResult;
    RB: MultResult;
    H: MultResult;
    C: MultResult;
    S: MultResult;
    D: MultResult;
}

export type BetAction = "HI" | "LO" | "SM" | "BL" | "RD" | "H" | "C" | "D" | "S";

export interface BetResult {
    win: boolean;
    chose: BetAction;
    mult: number;
}

// export const enum PlayerAction {
//     HI = "High",
//     LO = "Low",
//     RE = "Red",
//     BL = "Black",
//     H = "Heart",
//     C = "Club",
//     S = "Spade",
//     D = "Diamond"
// };

export interface IGameData {
    lobby_id: string;
    user_id: string;
    operator_id: string;
    mult_bank: number;
    bet_amount: number;
    room_id: string; // because rmId is array
    category: string;
    cardsHistory: string[]; // 8 cards (like "H10", "S3" etc.)
    deck: string[];
    revealedCount: number;
    status: "not_started" | "win" | "loss" | "running";
    txn_id: string;
    mults: {
        HI: { prob: number; mult: number };
        LO: { prob: number; mult: number };
        SM: { prob: number; mult: number };
        RB: { prob: number; mult: number };
        H: { prob: number; mult: number }; // suits if you added them
        C: { prob: number; mult: number };
        D: { prob: number; mult: number };
        S: { prob: number; mult: number };
    };
    roomConfig: (typeof ROOM_CONFIG)[TRoomId];
}