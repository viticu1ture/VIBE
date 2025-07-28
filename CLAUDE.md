# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Start bot with default Nether Highway strategy
npm start

# Start bot in development mode with custom parameters
npm run dev -- --host mc.kipicraft.net --port 25566 --username YourBot --strategy villager

# Test basic connection and bot functionality
npm test

# Test villager trading strategy specifically
npm run test-villager
```

### Command Line Arguments
- `--host <hostname>` - Server hostname (default: localhost)
- `--port <port>` - Server port (default: 25565) 
- `--username <username>` - Bot username (default: vibe_bot)
- `--mc-version <version>` - Minecraft version (default: latest)
- `--strategy <type>` - Strategy to use: "nether" or "villager" (default: nether)
- `--no-auth` - Disable Microsoft authentication
- `--no-viewer` - Disable web viewer (recommended for headless operation)

## Architecture Overview

This is a TypeScript Minecraft bot built on Mineflayer with a clean object-oriented architecture. The codebase follows a hierarchical pattern where **Strategies** coordinate multiple **Actions**, and **Actions** respond to bot events.

### Three-Layer Architecture

1. **Bot Layer (`src/bot.ts`)**: Core Mineflayer wrapper handling connection, events, inventory, pathfinding, and basic Minecraft operations
2. **Action Layer (`src/actions/`)**: Event-driven behaviors that run on specific bot events (like "tick", "health", etc.)
3. **Strategy Layer (`src/strategies/`)**: High-level coordination classes that combine multiple Actions to achieve complex goals

### Key Design Patterns

**Actions are Event-Driven**: Actions register for bot events (usually "tick") and execute logic periodically:
```typescript
// Actions run on bot events and have IS_HACK flag for server compatibility
export abstract class Action {
    public static readonly IS_HACK: boolean = false;
    public abstract runOnce(...args: any[]): void | boolean | Promise<void | boolean>;
}
```

**Strategies Coordinate Actions**: Strategies instantiate and manage multiple Actions:
```typescript
// Strategies manage the bot's overall behavior by coordinating Actions
export abstract class Strategy {
    protected bot: Bot;
    public isRunning: boolean = false;
    public start(): void { this.isRunning = true; }
}
```

**Bot Event System**: The Bot class wraps Mineflayer events into a simpler event system that Actions can subscribe to. Events include "tick", "spawn", "death", "health", etc.

### Current Implementations

**Actions**:
- `EfficientEat` - Smart food management (IS_HACK=true, no eating slowdown)
- `AlwaysShield` - Automatic shield usage (IS_HACK=true, no shield slowdown) 
- `EmergencyQuit` - Safety monitoring (health, players, stuck detection)
- `GotoLocation` - Pathfinding to coordinates with progress logging
- `LootFinder` - Detects valuable items (netherite, shulkers, elytra)

**Strategies**:
- `NetherHighwayStrategy` - Travels Nether highways at y=120 with safety Actions
- `VillagerExpTrade` - Finds Cleric villagers, trades emeralds for XP bottles, cycles every 10 minutes

### Bot Capabilities

The Bot class provides high-level abstractions over Mineflayer:
- **Connection management**: `connect()`, `disconnect()`, `reconnect()`
- **Safety checks**: `waitForActiveTicks()`, emergency disconnection
- **Inventory access**: `inventory`, `itemInHand()`, `equipInventoryItem()`
- **World interaction**: `goto()`, `findBlocks()`, `findValuableStorageBlocks()`
- **Entity detection**: `entities()` with filtering and distance calculations
- **Game state**: `coordinates`, `health`, `hunger`, `dimension`

### Trading System (VillagerExpTrade)

The villager trading implementation handles multiple detection methods for Cleric identification across different server versions and includes robust error handling for the complex trading interface:

```typescript
// Multiple methods to identify Clerics across server versions
private isCleric(villagerEntity: any): boolean {
    return villagerEntity.profession === "cleric" || 
           villagerEntity.profession === 2 ||
           villagerEntity.metadata?.[18] === 2 ||
           villagerEntity.villagerData?.profession === "minecraft:cleric";
}
```

### Important Implementation Notes

- **TypeScript Casting**: Mineflayer trading APIs require `(bot.mfBot as any)` casting due to incomplete type definitions
- **Authentication**: Bot requires Microsoft auth unless `--no-auth` is used
- **Canvas Dependency**: Required for web viewer functionality  
- **Safety First**: EmergencyQuit Action provides multiple fail-safes (health, player detection, stuck detection)
- **Server Compatibility**: Actions marked with `IS_HACK=true` provide advantages that may be considered cheating on some servers

### Development Patterns

When creating new Actions:
1. Extend the Action base class
2. Implement `runOnce()` method
3. Register for appropriate bot events (usually "tick")
4. Set `IS_HACK` flag appropriately
5. Add safety checks and error handling

When creating new Strategies:  
1. Extend the Strategy base class
2. Instantiate required Actions in `start()`
3. Call `action.start()` for each Action
4. Implement proper cleanup in `stop()`