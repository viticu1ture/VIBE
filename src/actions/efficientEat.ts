import { Action } from "./action";
import { Bot } from "../bot";

export class EfficientEat extends Action {
    public static readonly IS_HACK = true;
    private static readonly PANIC_THRESHOLD = 6;
    public static readonly FOOD_BLACKLIST = new Set([
        "enchanted_golden_apple", 
        "rotten_flesh", 
        "pufferfish", 
        "poisonous_potato", 
        "spider_eye",
        "suspicious_stew"
    ]);
    private static readonly RUN_INTERVAL = 18;

    constructor(bot: Bot) {
        super("Efficient Eat", "Eats only enough food to keep the hunger bar full and only eats when that can be done.", bot, "tick");
    }

    public async runOnce(...args: any[]): Promise<void> {
        const tickData = args[args.length - 1];
        const tickCount = tickData?.tickCount || 0;
        
        if (tickCount !== EfficientEat.RUN_INTERVAL) {
            return;
        }

        console.log("Doing efficient eat check...");

        const hunger = this.bot.hunger;
        console.log(`Hunger: ${hunger}`);
        
        if (hunger === Bot.MAX_HUNGER) {
            console.log("Hunger is full, not eating.");
            return;
        }

        const [invSlot, potentialFoodPoints] = this.findBestFood();
        if (invSlot === null || potentialFoodPoints === null) {
            console.log("No food found in inventory, not eating.");
            return;
        }

        console.log(`Found food in slot ${invSlot} with food points ${potentialFoodPoints}`);
        const neededFood = Bot.MAX_HUNGER - hunger;

        // Check if we are in panic mode
        if (hunger <= EfficientEat.PANIC_THRESHOLD) {
            console.warn("Hunger somehow got too low, eating food...");
            const maxAttempts = 5;
            let attempt = 0;
            
            while (this.bot.hunger < Bot.MAX_HUNGER && attempt < maxAttempts) {
                this.bot.equipInventoryItem(invSlot);
                await this.bot.eat();
                attempt++;
            }
            
            if (attempt >= maxAttempts) {
                console.warn(`Failed to eat food after ${maxAttempts} attempts, giving up.`);
            }
        } else if (potentialFoodPoints <= neededFood) {
            console.log(`Eating food with ${potentialFoodPoints} points...`);
            this.bot.equipInventoryItem(invSlot);
            const eaten = await this.bot.eat();
            if (eaten) {
                console.log(`Bot successfully ate food with ${potentialFoodPoints} points`);
            }
        } else {
            console.log(`Not enough food points, only ${potentialFoodPoints} points`);
        }
    }

    private findBestFood(): [number | null, number | null] {
        // Find all the food items in the inventory
        const foodSlots: Record<number, number> = {};
        
        for (const [slot, item] of Object.entries(this.bot.inventory)) {
            const foodData = this.bot.isFoodItem(item);
            if (foodData && !EfficientEat.FOOD_BLACKLIST.has(foodData.name)) {
                foodSlots[parseInt(slot)] = foodData.foodPoints;
            }
        }

        // If there are no food items, return null
        if (Object.keys(foodSlots).length === 0) {
            return [null, null];
        }

        // Get the highest value food item
        const entries = Object.entries(foodSlots).map(([slot, points]) => [parseInt(slot), points] as [number, number]);
        const [slot, foodPoints] = entries.reduce((max, current) => current[1] > max[1] ? current : max);
        
        return [slot, foodPoints];
    }
}