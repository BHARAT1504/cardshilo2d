import { logger } from "..";
import { GAME_SETTINGS } from "../constants/constant";
import type { IGameSettings } from "../interfaces"
import { GameSettings } from "../models/gameSettings"

export const GS: { GAME_SETTINGS: Partial<IGameSettings> } = { GAME_SETTINGS: {} }

export const loadConfig = async () => {
    const settingsArr: any[] = await GameSettings.fetchActiveSettings();
    const validSetting = settingsArr.find(s => s?.settings);
    if (validSetting?.settings) {
        GS.GAME_SETTINGS = validSetting.settings;
    } else {
        GS.GAME_SETTINGS = GAME_SETTINGS;
    }
    logger.info("✅ GAME_SETTINGS loaded successfully");
    return GS.GAME_SETTINGS;
}