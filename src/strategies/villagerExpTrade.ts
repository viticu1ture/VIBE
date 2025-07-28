import { Strategy } from "./strategy";
import { Bot } from "../bot";
import { Coordinate, coordinateToVec3, distanceVec3 } from "../utils";

interface VillagerInfo {
    id: string;
    position: Coordinate;
    profession?: string;
    entity: any;
}

export class VillagerExpTrade extends Strategy {
    private static readonly SEARCH_RADIUS = 64;
    private static readonly SLEEP_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
    private static readonly TRADE_TIMEOUT = 30 * 1000; // 30 seconds
    private static readonly MAX_TRADE_ATTEMPTS = 10;

    private startPosition: Coordinate;
    private clerics: VillagerInfo[] = [];
    private isTrading = false;

    constructor(bot: Bot) {
        super(bot);
        // Record starting position when strategy is created
        this.startPosition = bot.coordinates || [0, 0, 0];
    }

    public async start(): Promise<void> {
        super.start();
        console.log("🧙 Starting VillagerExpTrade strategy");
        console.log(`📍 Starting position: ${this.startPosition}`);

        try {
            await this.mainLoop();
        } catch (error) {
            console.error("❌ Error in VillagerExpTrade strategy:", error);
            this.stop();
        }
    }

    private async mainLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                // Step 1: Find villagers and identify clerics
                console.log("🔍 Searching for villagers...");
                await this.findVillagers();

                if (this.clerics.length === 0) {
                    console.log("❌ No Cleric villagers found within 64 blocks. Stopping strategy.");
                    break;
                }

                // Step 2: Check for emeralds
                if (!this.hasEmeralds()) {
                    console.log("❌ No emeralds found in inventory. Stopping strategy.");
                    break;
                }

                // Step 3: Trade with each cleric
                let tradedWithAny = false;
                for (const cleric of this.clerics) {
                    if (!this.isRunning) break;

                    const traded = await this.tradeWithCleric(cleric);
                    if (traded) {
                        tradedWithAny = true;
                    }

                    // Check if we still have emeralds
                    if (!this.hasEmeralds()) {
                        console.log("💎 Ran out of emeralds!");
                        return;
                    }
                }

                if (!tradedWithAny) {
                    console.log("⚠️ Could not trade with any clerics this cycle.");
                }

                // Step 4: Sleep for 10 minutes before next cycle
                if (this.isRunning && this.hasEmeralds()) {
                    console.log(`😴 Sleeping for 10 minutes before next cycle...`);
                    await this.sleep(VillagerExpTrade.SLEEP_DURATION);
                }

            } catch (error) {
                console.error("❌ Error in main loop:", error);
                await this.sleep(5000); // Wait 5 seconds before retrying
            }
        }

        console.log("🏁 VillagerExpTrade strategy completed");
    }

    private async findVillagers(): Promise<void> {
        this.clerics = [];
        
        const entities = this.bot.entities();
        console.log(`👥 Found ${entities.length} entities total`);

        for (const [coord, entityType, entityName] of entities) {
            // Check if entity is a villager
            if (entityType === "villager") {
                // Check if within search radius
                const distance = distanceVec3(
                    coordinateToVec3(this.startPosition),
                    coordinateToVec3(coord)
                );

                if (distance !== null && distance <= VillagerExpTrade.SEARCH_RADIUS) {
                    // Try to get the actual entity to check profession
                    const villagerEntity = this.findEntityAtPosition(coord);
                    
                    if (villagerEntity) {
                        const villagerInfo: VillagerInfo = {
                            id: villagerEntity.id?.toString() || `${coord[0]}_${coord[1]}_${coord[2]}`,
                            position: coord,
                            entity: villagerEntity
                        };

                        // Check if it's a cleric (profession variant 2)
                        if (this.isCleric(villagerEntity)) {
                            villagerInfo.profession = "cleric";
                            this.clerics.push(villagerInfo);
                            console.log(`⛪ Found Cleric at ${coord} (distance: ${distance.toFixed(1)})`);
                        } else {
                            console.log(`👤 Found villager at ${coord} but not a Cleric`);
                        }
                    }
                }
            }
        }

        console.log(`⛪ Total Clerics found: ${this.clerics.length}`);
    }

    private findEntityAtPosition(coord: Coordinate): any {
        if (!this.bot.mfBot?.entities) return null;

        for (const entityId of Object.keys(this.bot.mfBot.entities)) {
            const entity = this.bot.mfBot.entities[entityId];
            if (entity?.position) {
                const entityCoord: Coordinate = [entity.position.x, entity.position.y, entity.position.z];
                const distance = distanceVec3(coordinateToVec3(coord), coordinateToVec3(entityCoord));
                
                if (distance !== null && distance < 1) { // Within 1 block
                    return entity;
                }
            }
        }
        return null;
    }

    private isCleric(villagerEntity: any): boolean {
        // In Minecraft, Cleric villagers have profession "cleric"
        // The exact way to check this depends on the server/version
        // This is a common way to identify clerics
        
        // Method 1: Check metadata/profession field
        if (villagerEntity.profession === "cleric" || villagerEntity.profession === 2) {
            return true;
        }

        // Method 2: Check metadata variant (varies by version)
        if (villagerEntity.metadata && villagerEntity.metadata[18]) {
            const profession = villagerEntity.metadata[18];
            return profession === 2 || profession === "cleric";
        }

        // Method 3: Check if entity has villager data with profession
        if (villagerEntity.villagerData?.profession === "minecraft:cleric") {
            return true;
        }

        return false;
    }

    private hasEmeralds(): boolean {
        const inventory = this.bot.inventory;
        for (const item of Object.values(inventory)) {
            if (item?.name === "emerald" && item.count > 0) {
                console.log(`💎 Found ${item.count} emeralds in inventory`);
                return true;
            }
        }
        return false;
    }

    private getEmeraldCount(): number {
        const inventory = this.bot.inventory;
        for (const item of Object.values(inventory)) {
            if (item?.name === "emerald") {
                return item.count || 0;
            }
        }
        return 0;
    }

    private async tradeWithCleric(cleric: VillagerInfo): Promise<boolean> {
        try {
            console.log(`🚶 Pathfinding to Cleric at ${cleric.position}...`);
            
            // Pathfind to the cleric
            const success = await this.pathfindToVillager(cleric);
            if (!success) {
                console.log(`❌ Failed to pathfind to Cleric at ${cleric.position}`);
                return false;
            }

            console.log(`🤝 Attempting to trade with Cleric at ${cleric.position}...`);
            
            // Attempt trading
            return await this.attemptTrade(cleric);

        } catch (error) {
            console.error(`❌ Error trading with cleric at ${cleric.position}:`, error);
            return false;
        }
    }

    private async pathfindToVillager(villager: VillagerInfo): Promise<boolean> {
        return new Promise((resolve) => {
            const [x, y, z] = villager.position;
            
            // Set a timeout for pathfinding
            const timeout = setTimeout(() => {
                console.log(`⏰ Pathfinding timeout to ${villager.position}`);
                resolve(false);
            }, 30000); // 30 second timeout

            try {
                // Start pathfinding
                this.bot.goto(x, y, z);

                // Check periodically if we've arrived
                const checkArrival = () => {
                    const currentPos = this.bot.coordinates;
                    if (!currentPos) {
                        setTimeout(checkArrival, 1000);
                        return;
                    }

                    const distance = distanceVec3(
                        coordinateToVec3(currentPos),
                        coordinateToVec3(villager.position)
                    );

                    if (distance !== null && distance <= 3) { // Within 3 blocks
                        clearTimeout(timeout);
                        console.log(`✅ Reached Cleric (distance: ${distance.toFixed(1)})`);
                        resolve(true);
                    } else {
                        setTimeout(checkArrival, 1000);
                    }
                };

                setTimeout(checkArrival, 1000);

            } catch (error) {
                clearTimeout(timeout);
                console.error("Error in pathfinding:", error);
                resolve(false);
            }
        });
    }

    private async attemptTrade(cleric: VillagerInfo): Promise<boolean> {
        if (!this.bot.mfBot) return false;

        this.isTrading = true;
        let totalTrades = 0;

        try {
            // Get the villager entity
            const villagerEntity = this.findEntityAtPosition(cleric.position);
            if (!villagerEntity) {
                console.log("❌ Could not find villager entity for trading");
                return false;
            }

            const initialEmeralds = this.getEmeraldCount();
            console.log(`💎 Starting trade with ${initialEmeralds} emeralds`);

            // Open trading window
            await (this.bot.mfBot as any).openVillager(villagerEntity);
            console.log("📋 Opened villager trading window");

            // Get available trades
            const villager = (this.bot.mfBot as any).villager;
            if (!villager?.trades) {
                console.log("❌ No trades available from this villager");
                return false;
            }

            // Find experience bottle trades
            let expBottleTrade = null;
            for (let i = 0; i < villager.trades.length; i++) {
                const trade = villager.trades[i];
                if (trade.outputItem?.name === "experience_bottle") {
                    expBottleTrade = trade;
                    console.log(`🧪 Found experience bottle trade: ${trade.inputItem1?.count || 0} ${trade.inputItem1?.name} → ${trade.outputItem.count} experience bottles`);
                    break;
                }
            }

            if (!expBottleTrade) {
                console.log("❌ This Cleric doesn't sell experience bottles");
                return false;
            }

            // Trade until we can't anymore
            let attempts = 0;
            while (attempts < VillagerExpTrade.MAX_TRADE_ATTEMPTS && this.hasEmeralds()) {
                try {
                    // Check if trade is still available
                    if (expBottleTrade.disabled || expBottleTrade.tradeDisabled) {
                        console.log("⚠️ Trade is disabled/maxed out");
                        break;
                    }

                    // Perform the trade
                    await (this.bot.mfBot as any).trade(expBottleTrade, 1);
                    totalTrades++;
                    console.log(`✅ Completed trade ${totalTrades}`);

                    // Small delay between trades
                    await this.sleep(1000);

                } catch (tradeError) {
                    console.log("❌ Trade failed:", tradeError);
                    break;
                }

                attempts++;
            }

            // Close trading window
            (this.bot.mfBot as any).closeWindow();

            const finalEmeralds = this.getEmeraldCount();
            const emeraldsSpent = initialEmeralds - finalEmeralds;
            
            console.log(`🎯 Trading summary: ${totalTrades} trades completed, ${emeraldsSpent} emeralds spent`);
            return totalTrades > 0;

        } catch (error) {
            console.error("❌ Error during trading:", error);
            
            // Try to close any open windows
            try {
                (this.bot.mfBot as any)?.closeWindow();
            } catch (closeError) {
                // Ignore close errors
            }
            
            return false;
        } finally {
            this.isTrading = false;
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public stop(): void {
        super.stop();
        
        // Stop any ongoing pathfinding
        if (this.bot.mfBot?.pathfinder) {
            this.bot.mfBot.pathfinder.stop();
        }

        // Close any open trading windows
        if (this.isTrading && this.bot.mfBot) {
            try {
                (this.bot.mfBot as any).closeWindow();
            } catch (error) {
                // Ignore close errors
            }
        }

        console.log("🛑 VillagerExpTrade strategy stopped");
    }
}