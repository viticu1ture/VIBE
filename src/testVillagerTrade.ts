import { Bot } from "./bot";
import { VillagerExpTrade } from "./strategies";

async function testVillagerExpTrade() {
    console.log("🧙 Testing VillagerExpTrade Strategy");
    console.log("===================================");

    const bot = new Bot({
        host: "mc.kipicraft.net",
        port: 25566,
        username: "Viticu1ture",
        mcVersion: "1.21.4",
        noAuth: false,
        viewer: false,
    });

    try {
        console.log("🔗 Connecting to server...");
        await bot.connect();
        
        console.log("⏳ Waiting for bot to be active...");
        await bot.waitForActiveTicks(30);
        
        console.log("✅ Bot connected successfully!");
        console.log(`📍 Bot position: ${bot.coordinates}`);
        
        // Check initial inventory
        const inventory = bot.inventory;
        console.log(`🎒 Initial inventory slots occupied: ${Object.keys(inventory).length}`);
        
        // Check for emeralds
        let hasEmeralds = false;
        let emeraldCount = 0;
        for (const item of Object.values(inventory)) {
            if (item?.name === "emerald") {
                hasEmeralds = true;
                emeraldCount = item.count || 0;
                console.log(`💎 Found ${emeraldCount} emeralds in inventory`);
                break;
            }
        }
        
        if (!hasEmeralds) {
            console.log("⚠️ No emeralds found in inventory. The strategy will exit immediately.");
            console.log("💡 To test properly, ensure the bot has emeralds in its inventory.");
        }

        // Show nearby entities
        const entities = bot.entities();
        console.log(`👥 Entities nearby: ${entities.length}`);
        
        let villagerCount = 0;
        entities.forEach(([coord, type, name]) => {
            if (type === "villager") {
                villagerCount++;
                console.log(`🧑‍🌾 Villager${name ? ` (${name})` : ""} at [${coord.map(c => Math.round(c)).join(", ")}]`);
            }
        });
        
        console.log(`🏘️ Total villagers detected: ${villagerCount}`);

        // Create and start the strategy
        console.log("\n🚀 Starting VillagerExpTrade strategy...");
        const strategy = new VillagerExpTrade(bot);
        
        // Start the strategy (this will run indefinitely)
        strategy.start();
        
        // Let it run for a bit to see what happens
        console.log("⏱️ Strategy is now running. It will:");
        console.log("   1. Search for Cleric villagers within 64 blocks");
        console.log("   2. Check for emeralds in inventory");
        console.log("   3. Pathfind to each Cleric and attempt trading");
        console.log("   4. Sleep for 10 minutes between cycles");
        console.log("\n🔄 The strategy will run until emeralds are exhausted...");
        
        // In a real scenario, this would run indefinitely
        // For testing, we'll let it run for a while then stop
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        return false;
    }
    
    return true;
}

// Run the test
if (require.main === module) {
    testVillagerExpTrade()
        .then(success => {
            if (success) {
                console.log("✅ VillagerExpTrade strategy test started successfully");
                // The strategy will keep running
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error("💥 Test crashed:", error);
            process.exit(1);
        });
}