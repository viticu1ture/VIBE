import { Bot } from "./bot";
import { NetherHighwayStrategy, VillagerExpTrade } from "./strategies";

export { Bot } from "./bot";
export * from "./actions";
export * from "./strategies";
export * from "./constants";
export * from "./utils";

// Main function for CLI usage
export async function main() {
    const args = process.argv.slice(2);
    
    // Parse command line arguments
    const host = getArgValue(args, "--host") || "localhost";
    const port = parseInt(getArgValue(args, "--port") || "25565");
    const username = getArgValue(args, "--username") || "vibe_bot";
    const mcVersion = getArgValue(args, "--mc-version");
    const noAuth = args.includes("--no-auth");
    const viewer = !args.includes("--no-viewer");
    const strategyType = getArgValue(args, "--strategy") || "nether";

    console.log(`Starting VIBE bot with:`);
    console.log(`  Host: ${host}:${port}`);
    console.log(`  Username: ${username}`);
    console.log(`  MC Version: ${mcVersion || "latest"}`);
    console.log(`  Auth: ${noAuth ? "disabled" : "enabled"}`);
    console.log(`  Viewer: ${viewer ? "enabled" : "disabled"}`);
    console.log(`  Strategy: ${strategyType}`);

    const bot = new Bot({
        host,
        port,
        username,
        mcVersion,
        noAuth,
        viewer,
    });

    try {
        await bot.connect();
        
        console.log("Waiting for bot to spawn...");
        const neededCount = bot.is2b2t ? 2 : 1;
        while (bot.spawnCount < neededCount) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Choose strategy based on command line argument
        if (strategyType === "villager" || strategyType === "trade") {
            console.log("🧙 Starting VillagerExpTrade strategy");
            const strategy = new VillagerExpTrade(bot);
            strategy.start();
        } else {
            // Default to Nether Highway Strategy
            const targetCoordinate: [number, number, number] = [1000, 120, 1000];
            console.log("🛣️ Starting NetherHighway strategy");
            const strategy = new NetherHighwayStrategy(bot, targetCoordinate);
            strategy.start();
        }
        
    } catch (error) {
        console.error("Error starting bot:", error);
        process.exit(1);
    }
}

function getArgValue(args: string[], argName: string): string | undefined {
    const index = args.indexOf(argName);
    return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Run main if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}