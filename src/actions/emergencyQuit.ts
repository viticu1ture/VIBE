import { Action } from "./action";
import { Bot } from "../bot";
import { PLAYER_ENTITY } from "../constants";
import { EfficientEat } from "./efficientEat";
import { Coordinate } from "../utils";

export class EmergencyQuit extends Action {
    private static readonly HEALTH_THRESHOLD = 10;
    private static readonly STUCK_THRESHOLD = 60;
    private static readonly MAX_CONSECUTIVE_RECONNECTS = 3;
    private static readonly CONSECUTIVE_RECONNECT_TIME = 5 * 60; // 5 minutes

    private reconnectWaitTime?: number;
    private checkFood: boolean;
    private checkStuck: boolean;
    private checkPlayers: boolean;

    private lastPos?: Coordinate;
    private lastPosTime?: number;

    constructor(
        bot: Bot,
        reconnectWaitTime?: number,
        checkFood = true,
        checkStuck = true,
        checkPlayers = true
    ) {
        super("Emergency Quit", "Emergency quit action that monitors health, food, reconnects, movement, and players", bot, "tick");

        this.reconnectWaitTime = reconnectWaitTime;
        this.checkFood = checkFood;
        this.checkStuck = checkStuck;
        this.checkPlayers = checkPlayers;
    }

    public runOnce(): void {
        // Check health
        const health = this.bot.health;
        if (health && health <= EmergencyQuit.HEALTH_THRESHOLD) {
            console.error(`Emergency quit: Health too low (${health})`);
            this.bot.disconnect(true);
            return;
        }

        // Check for non-whitelisted players
        if (this.checkPlayers) {
            const entities = this.bot.entities();
            for (const entity of entities) {
                const [entityCoord, entityType, entitySubName] = entity;

                if (entityType === PLAYER_ENTITY && entitySubName && !(entitySubName in this.bot.playerWhitelist)) {
                    console.error(`Emergency quit: Non-whitelisted player '${entitySubName}' detected at ${entityCoord}`);
                    if (this.reconnectWaitTime !== undefined) {
                        console.log(`Waiting ${this.reconnectWaitTime} seconds before reconnecting...`);
                        this.bot.reconnect(this.reconnectWaitTime);
                    } else {
                        this.bot.disconnect(true);
                    }
                    return;
                }
            }
        }

        // Check for food items in the inventory
        if (this.checkFood) {
            const items = Object.values(this.bot.inventory);
            if (items.length > 0) {
                const foodItems = items.filter(item => this.bot.isFoodItem(item));
                const validFoodItems = foodItems.filter(item => 
                    item.name && !EfficientEat.FOOD_BLACKLIST.has(item.name)
                );
                if (validFoodItems.length === 0) {
                    console.error("Emergency quit: No valid food items in inventory");
                    this.bot.disconnect(true);
                    return;
                }
            } else {
                console.warn("Failed to get inventory items, skipping food check...");
            }
        }

        // Check if stuck
        if (this.checkStuck) {
            const currentPos = this.bot.coordinates;

            if (currentPos !== null) {
                const currentTime = Date.now() / 1000;
                if (this.lastPosTime === undefined) {
                    this.lastPosTime = currentTime;
                }
                if (this.lastPos === undefined) {
                    this.lastPos = currentPos;
                }

                if (this.lastPos !== undefined && this.lastPosTime !== undefined) {
                    const xDist = Math.abs(currentPos[0] - this.lastPos[0]);
                    const zDist = Math.abs(currentPos[2] - this.lastPos[2]);

                    // Only check x and z coordinates
                    if (xDist < 1 && zDist < 1) {
                        const stuckTime = currentTime - this.lastPosTime;
                        if (stuckTime >= EmergencyQuit.STUCK_THRESHOLD) {
                            console.error(`current_pos: ${currentPos}, last_pos: ${this.lastPos}, current_time: ${currentTime}, last_pos_time: ${this.lastPosTime}`);
                            console.error(`Emergency quit: Bot is stuck at position ${currentPos} for ${EmergencyQuit.STUCK_THRESHOLD} seconds. Attempting to reconnect...`);
                            this.bot.reconnect(10);
                            // Attempt to force a movement
                            if (this.bot.gotoGoal) {
                                this.bot.goto(...this.bot.gotoGoal);
                            }
                            this.lastPos = undefined;
                            this.lastPosTime = undefined;
                        }
                    } else {
                        this.lastPosTime = currentTime;
                        this.lastPos = currentPos;
                    }
                }
            } else {
                console.warn("Failed to get current position, skipping stuck check...");
            }
        }
    }
}