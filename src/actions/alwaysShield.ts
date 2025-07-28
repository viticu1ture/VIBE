import { Action } from "./action";
import { Bot } from "../bot";

export class AlwaysShield extends Action {
    public static readonly IS_HACK = true;
    private static readonly RUN_INTERVAL = 19;

    constructor(bot: Bot) {
        super("Always Shield", "Always uses a shield when available and points to the nearest target.", bot, "tick");
    }

    public runOnce(...args: any[]): boolean {
        const tickData = args[args.length - 1];
        const tickCount = tickData?.tickCount || 0;
        
        if (tickCount !== AlwaysShield.RUN_INTERVAL) {
            return false;
        }

        // Equip the shield if we have one available
        const shieldInOffhand = this.bot.equipShield();
        if (shieldInOffhand) {
            if (!this.bot.mfBot) return false;
            
            const shieldActivated = this.bot.mfBot.usingHeldItem;
            if (!shieldActivated) {
                this.bot.mfBot.activateItem(true);
            }
        } else {
            console.log("No shield found in offhand, not activating.");
            return false;
        }

        // TODO: make it always look at the nearest entity (glitches when running)
        // const entity = this.bot.mfBot?.nearestEntity();
        // if (!entity?.position) {
        //     console.log("No entity found or entity has no position, not pointing.");
        //     return false;
        // }

        return true;
    }
}