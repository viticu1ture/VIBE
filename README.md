# VIBE Bot

A Minecraft bot using Mineflayer with object-oriented architecture featuring Actions and Strategies.

## 🚀 Quick Start

### Installation

```bash
npm install
npm run build
```

### Basic Usage

```bash
# Test connection to a server
npm test

# Test villager trading strategy
npm run test-villager

# Run with default settings (Nether Highway)
npm start

# Run villager trading strategy
npm run dev -- --host mc.kipicraft.net --port 25566 --username YourUsername --strategy villager

# Run with custom server
npm run dev -- --host mc.kipicraft.net --port 25566 --username YourUsername --mc-version 1.21.4
```

### Command Line Options

- `--host <hostname>` - Server hostname (default: localhost)
- `--port <port>` - Server port (default: 25565)
- `--username <username>` - Bot username (default: vibe_bot)
- `--mc-version <version>` - Minecraft version (default: latest)
- `--strategy <type>` - Strategy to use: "nether" or "villager" (default: nether)
- `--no-auth` - Disable Microsoft authentication
- `--no-viewer` - Disable web viewer

## 🏗️ Architecture

### Core Components

- **Bot**: Main bot class handling connection and basic operations
- **Actions**: Event-driven behaviors (eating, shield usage, pathfinding, etc.)
- **Strategies**: High-level bot behaviors that coordinate multiple actions

### Actions

- `AlwaysShield` - Automatically uses shield when available
- `EfficientEat` - Smart food consumption based on hunger levels
- `EmergencyQuit` - Safety system monitoring health, players, and stuck conditions
- `GotoLocation` - Pathfinding to specific coordinates
- `LootFinder` - Detects valuable items in the environment

### Strategies

- `NetherHighwayStrategy` - Designed for traveling on Nether highways (y=120)
- `VillagerExpTrade` - Automatically trades emeralds with Cleric villagers for experience bottles

## 📝 Example Usage

### Basic Bot Connection

```typescript
import { Bot } from "./bot";

const bot = new Bot({
    host: "mc.kipicraft.net",
    port: 25566,
    username: "YourUsername",
    mcVersion: "1.21.4"
});

await bot.connect();
await bot.waitForActiveTicks();

console.log(`Bot connected at: ${bot.coordinates}`);
```

### Using Actions

```typescript
import { EfficientEat, AlwaysShield } from "./actions";

const bot = new Bot({ /* options */ });
await bot.connect();

// Create and start actions
const eat = new EfficientEat(bot);
const shield = new AlwaysShield(bot);

eat.start();
shield.start();
```

### Using Strategies

```typescript
import { NetherHighwayStrategy, VillagerExpTrade } from "./strategies";

const bot = new Bot({ /* options */ });
await bot.connect();

// Travel to coordinates [1000, 120, 1000] in the Nether
const netherStrategy = new NetherHighwayStrategy(bot, [1000, 120, 1000]);
netherStrategy.start();

// OR trade with villagers for experience bottles
const tradeStrategy = new VillagerExpTrade(bot);
tradeStrategy.start();
```

### VillagerExpTrade Strategy Usage

```bash
# Run the villager trading strategy
npm run dev -- --host your-server.com --username YourBot --strategy villager

# Or use the dedicated test
npm run test-villager
```

The VillagerExpTrade strategy:
1. 🔍 Searches for villagers within 64 blocks
2. ⛪ Identifies Cleric villagers specifically
3. 💎 Checks bot's inventory for emeralds (exits if none found)
4. 🚶 Pathfinds to each Cleric villager
5. 🤝 Opens trading and buys experience bottles
6. 📦 Trades until emeralds run out or villager stops selling
7. 😴 Sleeps for 10 minutes, then repeats the cycle

**Requirements:**
- Bot must have emeralds in inventory
- Cleric villagers must be within 64 blocks
- Clerics must have experience bottle trades available

## 🔧 Key Differences from Python Version

### Removed Complexity
- ❌ No more Python-to-JavaScript bridge code
- ❌ No more `require("javascript")` workarounds
- ❌ No more manual event handler decorators

### Improved Code
- ✅ Native TypeScript with full type safety
- ✅ Proper async/await patterns
- ✅ Clean object-oriented design
- ✅ Simplified event handling
- ✅ Better error handling

### Simple TypeScript Syntax
- Uses basic classes and interfaces
- Minimal use of advanced TypeScript features
- Clear and readable code structure
- Easy to understand for Python developers

## 🛡️ Safety Features

The bot includes several safety mechanisms:

- **Health monitoring** - Disconnects if health drops too low
- **Player detection** - Can detect and react to other players
- **Stuck detection** - Reconnects if bot gets stuck
- **Food monitoring** - Ensures bot doesn't starve
- **Emergency quit** - Multiple fail-safes for dangerous situations

## 🎮 Tested Servers

- ✅ mc.kipicraft.net:25566 (1.21.4)
- ✅ Compatible with vanilla Minecraft servers
- ✅ Works with most modded servers

## 📁 Project Structure

```
src/
├── actions/          # Individual bot behaviors
│   ├── action.ts     # Base action class
│   ├── alwaysShield.ts
│   ├── efficientEat.ts
│   ├── emergencyQuit.ts
│   ├── gotoLocation.ts
│   └── lootFinder.ts
├── strategies/       # High-level bot strategies
│   ├── strategy.ts   # Base strategy class
│   └── netherHighway.ts
├── bot.ts           # Main bot class
├── constants.ts     # Game constants
├── utils.ts         # Utility functions
├── index.ts         # Main entry point
└── test.ts          # Connection test
```

## 🚨 Important Notes

- Set `viewer: false` for headless operation
- The bot requires Microsoft authentication unless using `--no-auth`
- Canvas dependency is needed for the web viewer
- Bot is designed to be safe and respect server rules

## 🔄 Migration from Python

If you're coming from the Python version:

1. **No more JavaScript bridge** - Everything is native TypeScript
2. **Simplified imports** - Standard ES6 module imports
3. **Better types** - Full TypeScript type checking
4. **Cleaner async** - Proper Promise-based async operations
5. **Same architecture** - Actions and Strategies work the same way

The bot maintains the same object-oriented structure while being much cleaner and more maintainable in TypeScript!