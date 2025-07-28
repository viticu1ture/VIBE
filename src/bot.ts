import mineflayer, { Bot as MineflayerBot } from "mineflayer";
import { pathfinder, Movements, goals } from "mineflayer-pathfinder";
import armorManager from "mineflayer-armor-manager";
import { plugin as autoEat } from "mineflayer-auto-eat";
import { mineflayer as viewer } from "prismarine-viewer";
import { Vec3 } from "vec3";
import mcData from "minecraft-data";

import { 
    PLAYER_ENTITY, 
    STORAGE_BLOCKS, 
    NETHER_BRICKS, 
    BLACKSTONE_BLOCKS, 
    DIM_NETHER, 
    DIM_OVERWORLD, 
    SPAWNER_BLOCK, 
    CHEST_BLOCK 
} from "./constants";
import { 
    Coordinate, 
    distanceVec3, 
    coordinateToVec3, 
    vec3ToCoordinate 
} from "./utils";

export interface BotOptions {
    host?: string;
    port?: number;
    username?: string;
    mcVersion?: string;
    noAuth?: boolean;
    viewer?: boolean;
}

export class Bot {
    public static readonly DEFAULT_USERNAME = "vibe_bot";
    public static readonly MAX_HUNGER = 20;
    public static readonly MAX_HEALTH = 20;
    public static readonly MAX_TICK_COUNT = 200; // about 10 seconds

    private mcHost: string;
    private mcPort: number;
    private mcVersion?: string;
    public username: string;
    private noAuth: boolean;
    private viewerEnabled: boolean;
    private viewerStarted: boolean = false;

    public playerWhitelist: Record<string, any> = {};
    public mfBot: MineflayerBot | null = null;
    private activateItemLock: boolean = false;
    private mcDataInstance: any;

    // Event handling
    private eventHandlers: Record<string, Array<(...args: any[]) => void>> = {};
    public doHandlers: boolean = true;
    public ticksActive: boolean = false;
    public spawnCount: number = 0;
    public tickCount: number = 0;
    public pathfindingPaused: boolean = false;
    public is2b2t: boolean;
    public gotoGoal: Coordinate | null = null;

    constructor(options: BotOptions = {}) {
        this.mcHost = options.host || "localhost";
        this.mcPort = options.port || 25565;
        this.mcVersion = options.mcVersion;
        this.username = options.username || Bot.DEFAULT_USERNAME;
        this.noAuth = options.noAuth || false;
        this.viewerEnabled = options.viewer !== false;

        this.is2b2t = this.mcHost.includes("2b2t");

        // Register default event handlers
        this.registerEventHandler("login", this.handleLogin.bind(this));
        this.registerEventHandler("spawn", this.handleSpawn.bind(this));
        this.registerEventHandler("kicked", this.handleKicked.bind(this));
        this.registerEventHandler("death", this.handleDeath.bind(this));
        this.registerEventHandler("messagestr", this.handleMessage.bind(this));
    }

    // Connection methods
    public async connect(): Promise<void> {
        console.log("Connecting to server...");
        
        this.mcDataInstance = mcData(this.mcVersion || "1.21.4");

        const botOptions: any = {
            host: this.mcHost,
            port: this.mcPort,
            username: this.username,
            hideErrors: false,
            checkTimeoutInterval: 60 * 10000,
        };

        if (!this.noAuth && this.username !== Bot.DEFAULT_USERNAME) {
            botOptions.auth = "microsoft";
        }

        if (this.mcVersion) {
            botOptions.version = this.mcVersion;
        }

        this.mfBot = mineflayer.createBot(botOptions);
        this.loadPlugins();
        this.setupEventListeners();

        this.doHandlers = true;
        console.log(`Connected to server ${this.mcHost}:${this.mcPort} as ${this.username}`);
    }

    private loadPlugins(): void {
        if (!this.mfBot) return;

        this.mfBot.loadPlugin(pathfinder);
        this.mfBot.loadPlugin(armorManager);
        this.mfBot.loadPlugin(autoEat);

        // Wait for pathfinder to load
        const startTime = Date.now();
        const maxWait = 5000;
        
        const checkPathfinder = () => {
            if (this.mfBot?.pathfinder) {
                return;
            }
            if (Date.now() - startTime > maxWait) {
                console.warn("Pathfinder plugin not loaded");
                return;
            }
            setTimeout(checkPathfinder, 100);
        };
        
        checkPathfinder();
    }

    private setupEventListeners(): void {
        if (!this.mfBot) return;

        this.mfBot.on("login", (...args) => this.handleEvent("login", ...args));
        this.mfBot.on("chat", (username, message, ...args) => this.handleEvent("chat", username, message, ...args));
        this.mfBot.on("messagestr", (...args) => this.handleEvent("messagestr", ...args));
        this.mfBot.on("spawn", (...args) => this.handleEvent("spawn", ...args));
        this.mfBot.on("kicked", (...args) => this.handleEvent("kicked", ...args));
        this.mfBot.on("error", (...args) => this.handleEvent("error", ...args));
        this.mfBot.on("death", (...args) => this.handleEvent("death", ...args));
        this.mfBot.on("end", (...args) => this.handleEvent("end", ...args));
        this.mfBot.on("health", (...args) => this.handleEvent("health", ...args));

        this.tickCount = 0;
        this.mfBot.on("physicsTick", (...args) => {
            this.tickCount += 1;
            if (this.tickCount % 20 === 0) {
                this.tickCount = 0;
            }
            this.handleEvent("tick", ...args, { tickCount: this.tickCount });
        });
    }

    public disconnect(shouldExit = false): void {
        console.log("Disconnecting from server...");
        this.doHandlers = false;
        this.ticksActive = false;
        this.spawnCount = 0;

        if (this.mfBot) {
            if (this.viewerStarted) {
                // Note: viewer.close() method may not exist in all versions
                this.viewerStarted = false;
            }
            this.mfBot.end();
            this.mfBot = null;
        }

        if (shouldExit) {
            console.log("Bot shutting down...");
            process.exit(0);
        }
    }

    public async reconnect(waitTime = 10): Promise<void> {
        this.disconnect();
        console.log(`Reconnecting to server in ${waitTime} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        await this.connect();
    }

    public async waitForActiveTicks(maxWait = 60): Promise<boolean> {
        if (this.ticksActive) {
            return true;
        }

        const startTime = Date.now();
        while (!this.ticksActive) {
            if (Date.now() - startTime > maxWait * 1000) {
                console.error("Timed out waiting for bot to be active. Shutting down...");
                this.disconnect(true);
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return true;
    }

    // Event handling
    public registerEventHandler(eventName: string, handler: (...args: any[]) => void): void {
        if (!this.eventHandlers[eventName]) {
            this.eventHandlers[eventName] = [];
        }
        this.eventHandlers[eventName].push(handler);
    }

    public unregisterEventHandler(eventName: string, handler: (...args: any[]) => void): void {
        if (this.eventHandlers[eventName]) {
            const index = this.eventHandlers[eventName].indexOf(handler);
            if (index > -1) {
                this.eventHandlers[eventName].splice(index, 1);
            }
        }
    }

    private handleEvent(eventName: string, ...args: any[]): void {
        const handlers = this.eventHandlers[eventName] || [];
        for (const handler of handlers) {
            if (!this.doHandlers || (eventName === "tick" && !this.ticksActive)) {
                console.log(`Skipping event ${eventName}, handlers disabled`);
                return;
            }

            try {
                handler(...args);
            } catch (error) {
                console.error(`Error in event handler for event ${eventName}:`, error);
            }
        }
    }

    // Default event handlers
    private handleLogin(): void {
        console.log(`Bot ${this.username} has logged in to the server ${this.mcHost}:${this.mcPort}`);
        
        if (!this.viewerEnabled) {
            console.log("Web viewer disabled, not starting");
            return;
        }

        if (!this.viewerStarted && this.mfBot) {
            viewer(this.mfBot, { port: 3007, firstPerson: true });
            this.viewerStarted = true;
        }
    }

    private handleSpawn(): void {
        console.log(`Bot ${this.username} has spawned in the world`);
        this.spawnCount += 1;
        
        if (this.is2b2t) {
            if (this.spawnCount >= 2) {
                this.ticksActive = true;
            }
        } else {
            this.ticksActive = true;
        }
    }

    private handleDeath(): void {
        const pos = this.coordinates;
        console.log(`Bot ${this.username} has died at ${pos}`);
    }

    private handleMessage(message: string): void {
        if (this.username && message.includes(this.username)) {
            console.log(`Important message: '${message}'`);
        }
    }

    private handleKicked(reason: string): void {
        console.log(`Bot ${this.username} has been kicked from the server for reason: ${reason}`);
    }

    // Properties
    public get coordinates(): Coordinate | null {
        if (!this.mfBot?.entity?.position) {
            return null;
        }
        const pos = this.mfBot.entity.position;
        return [pos.x, pos.y, pos.z];
    }

    public get dimension(): string {
        return this.mfBot?.game.dimension || "";
    }

    public get hunger(): number {
        return this.mfBot?.food || 0;
    }

    public get health(): number {
        return this.mfBot?.health || 0;
    }

    public get inventory(): Record<number, any> {
        if (!this.mfBot?.inventory?.slots) {
            return {};
        }
        
        const inventoryItems = this.mfBot.inventory.slots;
        const inventory = inventoryItems.filter(item => item !== null);
        const invDict: Record<number, any> = {};
        
        inventory.forEach((item, idx) => {
            if (item) {
                invDict[item.slot] = item;
            }
        });
        
        return invDict;
    }

    // Bot actions
    public async eat(maxWait = 5): Promise<boolean> {
        if (!this.mfBot) return false;

        if (this.gotoGoal && this.is2b2t) {
            console.log("Pausing pathfinding to eat...");
            this.mfBot.pathfinder.stop();
        }

        if (this.activateItemLock) return false;
        this.activateItemLock = true;

        try {
            this.mfBot.deactivateItem();
            this.mfBot.activateItem();

            const preEat = this.hunger;
            const startTime = Date.now();
            
            while (this.hunger <= preEat) {
                if (Date.now() - startTime > maxWait * 1000) {
                    console.log("Timed out waiting for food to be eaten");
                    return false;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (this.gotoGoal && this.is2b2t) {
                console.log("Goto goal resumed!");
                this.goto(...this.gotoGoal);
            }

            return true;
        } finally {
            this.activateItemLock = false;
        }
    }

    public itemInHand(offhand = false): any | null {
        if (!this.mfBot) {
            console.log("Not connected to server, cannot get item in hand");
            return null;
        }

        const handSlot = this.mfBot.getEquipmentDestSlot(offhand ? "off-hand" : "hand");
        if (handSlot === null) {
            console.error("Could not get hand slot");
            return null;
        }

        return this.inventory[handSlot] || null;
    }

    public equipShield(): boolean {
        const itemInOffhand = this.itemInHand(true);
        if (itemInOffhand?.name === "shield") {
            console.log("Shield already equipped in hand");
            return true;
        }

        const inventory = this.inventory;
        for (const [slot, item] of Object.entries(inventory)) {
            if (item?.name === "shield") {
                this.mfBot?.equip(item, "off-hand");
                console.log(`Equipped shield in slot ${slot}`);
                return true;
            }
        }

        return false;
    }

    public isFoodItem(item: any): any | false {
        if (!item?.type || !this.mcDataInstance) {
            return false;
        }

        const foodData = this.mcDataInstance.foods[item.type];
        return foodData || false;
    }

    public equipInventoryItem(slot: number, offhand = false): boolean {
        const inventory = this.inventory;
        if (!(slot in inventory)) {
            console.warn(`Slot ${slot} not found in inventory`);
            return false;
        }

        const item = inventory[slot];
        if (!item) {
            console.warn(`Item ${slot} not found in inventory`);
            return false;
        }

        const place = offhand ? "off-hand" : "hand";
        this.mfBot?.equip(item, place);
        return true;
    }

    public goto(x: number, y: number, z: number): void {
        if (!this.mfBot?.pathfinder) {
            console.error("Pathfinder not available");
            return;
        }

        const defaultMovement = new Movements(this.mfBot);
        defaultMovement.allowParkour = false;
        this.mfBot.pathfinder.setMovements(defaultMovement);

        const targetPos = new Vec3(x, y, z);
        this.gotoGoal = [x, y, z];

        const maxAttempts = 5;
        let attempt = 0;
        let worked = false;

        const trySetGoal = () => {
            attempt++;
            try {
                this.mfBot?.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 1));
                worked = true;
            } catch (error) {
                console.log(`Failed to set goal: ${error}`);
                if (attempt < maxAttempts) {
                    setTimeout(trySetGoal, 1000);
                } else {
                    console.error(`Failed to set goal after ${maxAttempts} attempts. Shutting down...`);
                    this.disconnect(true);
                }
            }
        };

        trySetGoal();
    }

    // Finding entities and blocks
    public entities(): Array<[Coordinate, string, string | null]> {
        const entities: Array<[Coordinate, string, string | null]> = [];
        
        if (!this.mfBot?.entities) {
            return entities;
        }

        for (const entityId of Object.keys(this.mfBot.entities)) {
            const entity = this.mfBot.entities[entityId];
            if (!entity?.position) continue;

            // Skip the bot itself
            if (entity.name === PLAYER_ENTITY && entity.username === this.username) {
                continue;
            }

            const coord = vec3ToCoordinate(entity.position);
            const name = entity.name || entity.type || "unknown";
            let specificName: string | null = null;

            if (name === "item" && entity.metadata) {
                const metadata = Array.from(entity.metadata).pop() as any;
                if (metadata?.itemId && this.mcDataInstance) {
                    specificName = this.mcDataInstance.items[metadata.itemId]?.name || null;
                }
            }
            if (name === "player") {
                specificName = entity.username || null;
            }

            entities.push([coord, name, specificName]);
        }

        return entities;
    }

    public findBlocks(blocks: string[], maxDistance = 64, point?: Coordinate): Record<string, Coordinate[]> {
        const foundBlocks: Record<string, Coordinate[]> = {};
        
        if (!this.mfBot || !this.mcDataInstance) {
            return foundBlocks;
        }

        for (const blockName of blocks) {
            try {
                const blockData = this.mcDataInstance.blocksByName[blockName];
                if (!blockData) {
                    console.warn(`Block ${blockName} not found in the registry`);
                    continue;
                }

                const findArgs: any = {
                    matching: [blockData.id],
                    maxDistance: maxDistance,
                    count: 200,
                };

                if (point) {
                    findArgs.point = coordinateToVec3(point);
                }

                const blockPositions = this.mfBot.findBlocks(findArgs);
                foundBlocks[blockName] = blockPositions.map(pos => [pos.x, pos.y, pos.z] as Coordinate);
            } catch (error) {
                console.warn(`Error finding blocks for ${blockName}:`, error);
            }
        }

        return foundBlocks;
    }

    public findValuableStorageBlocks(maxDistance = 64): Record<string, Coordinate[]> {
        const valuableStorageBlocks: Record<string, Coordinate[]> = {};
        const storageBlocks = this.findBlocks(STORAGE_BLOCKS, maxDistance);

        // Handle chests specially
        const chestCoords = storageBlocks[CHEST_BLOCK] || [];
        const invalidChestCoords: Coordinate[] = [];

        for (const chestCoord of chestCoords) {
            if (this.dimension === DIM_NETHER) {
                const belowChest = coordinateToVec3([chestCoord[0], chestCoord[1] - 1, chestCoord[2]]);
                const blockBelow = this.mfBot?.blockAt(belowChest);

                if (blockBelow && (blockBelow.name === NETHER_BRICKS || BLACKSTONE_BLOCKS.includes(blockBelow.name))) {
                    invalidChestCoords.push(chestCoord);
                    continue;
                }
            } else if (this.dimension === DIM_OVERWORLD) {
                const spawners = this.findBlocks([SPAWNER_BLOCK], 3, chestCoord);
                const spawnerBlocks = spawners[SPAWNER_BLOCK] || [];
                if (spawnerBlocks.length > 0) {
                    invalidChestCoords.push(chestCoord);
                    continue;
                }
            }
        }

        // Add valid chests
        const validChestCoords = chestCoords.filter(coord => 
            !invalidChestCoords.some(invalid => 
                invalid[0] === coord[0] && invalid[1] === coord[1] && invalid[2] === coord[2]
            )
        );
        
        if (validChestCoords.length > 0) {
            valuableStorageBlocks[CHEST_BLOCK] = validChestCoords;
        }

        // Add other storage blocks
        for (const [block, coords] of Object.entries(storageBlocks)) {
            if (block !== CHEST_BLOCK) {
                valuableStorageBlocks[block] = coords;
            }
        }

        return valuableStorageBlocks;
    }
}