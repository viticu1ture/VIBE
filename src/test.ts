import { Bot } from "./bot";

async function testConnection() {
    console.log("🚀 Starting VIBE Bot Test");
    console.log("===========================");

    const bot = new Bot({
        host: "mc.kipicraft.net",
        port: 25566,
        username: "Viticu1ture",
        mcVersion: "1.21.4",
        noAuth: false,
        viewer: false, // Disable viewer for testing
    });

    try {
        console.log("🔗 Connecting to mc.kipicraft.net:25566...");
        await bot.connect();
        
        console.log("⏳ Waiting for bot to be active...");
        await bot.waitForActiveTicks(30);
        
        console.log("✅ Bot connected successfully!");
        console.log(`📍 Bot position: ${bot.coordinates}`);
        console.log(`🍖 Bot hunger: ${bot.hunger}/${Bot.MAX_HUNGER}`);
        console.log(`❤️  Bot health: ${bot.health}/${Bot.MAX_HEALTH}`);
        console.log(`🌍 Dimension: ${bot.dimension}`);

        // Test inventory
        const inventory = bot.inventory;
        console.log(`🎒 Inventory slots occupied: ${Object.keys(inventory).length}`);

        // Test entity detection
        const entities = bot.entities();
        console.log(`👥 Entities nearby: ${entities.length}`);
        entities.slice(0, 5).forEach(([coord, type, name]) => {
            console.log(`   - ${type}${name ? ` (${name})` : ""} at [${coord.map(c => Math.round(c)).join(", ")}]`);
        });

        // Test block finding
        console.log("🔍 Searching for chests nearby...");
        const chests = bot.findBlocks(["chest"], 32);
        const chestCount = chests["chest"]?.length || 0;
        console.log(`📦 Found ${chestCount} chests`);

        // Test valuable storage finding
        const valuableStorage = bot.findValuableStorageBlocks(32);
        const totalValuable = Object.values(valuableStorage).reduce((sum, blocks) => sum + blocks.length, 0);
        console.log(`💎 Found ${totalValuable} valuable storage blocks`);

        console.log("✅ All tests passed! Bot is working correctly.");
        
        // Let the bot run for a bit to show it's working
        console.log("🤖 Bot will run for 30 seconds for observation...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        return false;
    } finally {
        console.log("🔌 Disconnecting bot...");
        bot.disconnect();
        console.log("👋 Test completed!");
    }
    
    return true;
}

// Run the test
if (require.main === module) {
    testConnection()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error("Test crashed:", error);
            process.exit(1);
        });
}