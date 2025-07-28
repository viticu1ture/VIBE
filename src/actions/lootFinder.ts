import { Action } from "./action";
import { Bot } from "../bot";
import { ITEM_ENTITY } from "../constants";

type LootItem = [number, number, number, string];

export class LootFinder extends Action {
    private seenLoot: Set<string> = new Set();

    constructor(bot: Bot) {
        super("Loot Finder", "Monitors for valuable items in the environment", bot, "tick");
    }

    public runOnce(): void {
        const entities = this.bot.entities();
        for (const entity of entities) {
            const [entityCoord, entityType, entitySubName] = entity;

            if (entityType === ITEM_ENTITY && entitySubName) {
                const isNetherite = entitySubName.includes("netherite");
                const isShulker = entitySubName.includes("shulker");
                const isElytra = entitySubName.includes("elytra");
                const isValuable = isNetherite || isShulker || isElytra;

                if (isValuable) {
                    const itemKey = `${Math.floor(entityCoord[0])},${Math.floor(entityCoord[1])},${Math.floor(entityCoord[2])},${entitySubName}`;
                    if (!this.seenLoot.has(itemKey)) {
                        this.seenLoot.add(itemKey);
                        const coords = [Math.floor(entityCoord[0]), Math.floor(entityCoord[1]), Math.floor(entityCoord[2])];
                        console.log(`Found loot item '${entitySubName}' at ${coords}`);
                    }
                }
            }
        }
    }
}