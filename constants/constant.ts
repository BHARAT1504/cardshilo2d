import type { IGameSettings } from "../interfaces";

export const GAME_SETTINGS: IGameSettings = {
    max_amt: 250000,
    min_amt: 25,
    max_co: 500000,
    main_mult: {
        PLAYER_A: 1.98,
        PLAYER_B: 1.98,
    },
    side_mult: {
        PAIR: 2,
        FLUSH: 5,
        STRAIGHT: 7,
        STRAIGHT_FLUSH: 36,
        TRIO: 46
    }
}

export const ROOM_CONFIG = {
    "101": {
        room_name: "Friendly",
        min_bet: 10,
        max_bet: 100,
        max_co: 50000
    },
    "102": {
        room_name: "casual",
        min_bet: 50,
        max_bet: 500,
        max_co: 50000
    },
    "103": {
        room_name: "Expert",
        min_bet: 100,
        max_bet: 1000,
        max_co: 50000
    },
    "104": {
        room_name: "High Roller",
        min_bet: 500,
        max_bet: 5000,
        max_co: 50000
    },
};




