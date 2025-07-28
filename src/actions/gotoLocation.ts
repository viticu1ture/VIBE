import { Action } from "./action";
import { Bot } from "../bot";
import { Coordinate, coordinateToVec3, distanceVec3, walkTime } from "../utils";
import { Vec3 } from "vec3";

export class GotoLocation extends Action {
    private static readonly RUN_INTERVAL = 19;

    private targetCoordinate: Coordinate;
    private vec3Target: Vec3;
    private lastLogCoordinate?: Vec3;
    private lastLogTime?: number;
    private logInterval: number;
    private running: boolean = false;
    private exitOnDestination: boolean;

    constructor(
        bot: Bot, 
        coordinate: Coordinate, 
        logInterval = 1000, 
        exitOnDestination = true
    ) {
        super("Goto Location", "Moves the bot to a specific location in the world.", bot, "tick");
        
        this.targetCoordinate = coordinate;
        this.bot.gotoGoal = coordinate;
        this.vec3Target = coordinateToVec3(this.targetCoordinate);
        this.logInterval = logInterval;
        this.exitOnDestination = exitOnDestination;
    }

    public stop(): void {
        super.stop();
        if (this.bot.mfBot?.pathfinder) {
            this.bot.mfBot.pathfinder.stop();
        }
        this.running = false;
        this.lastLogCoordinate = undefined;
    }

    public runOnce(...args: any[]): void {
        const tickData = args[args.length - 1];
        const tickCount = tickData?.tickCount || 0;
        
        if (tickCount !== GotoLocation.RUN_INTERVAL) {
            return;
        }

        if (!this.running) {
            this.running = true;
            const currentCoords = this.bot.coordinates;
            if (currentCoords) {
                const timeEst = walkTime(this.vec3Target, coordinateToVec3(currentCoords), true);
                const timeEstStr = timeEst ? this.formatTime(timeEst) : "unknown";
                console.log(`Pathfinding to ${this.targetCoordinate} from ${currentCoords} with ${this.bot.hunger} hunger and ${this.bot.health} health. Estimate: ${timeEstStr}`);
            }
            this.bot.goto(...this.targetCoordinate);
            return;
        }

        const currentCoordinate = this.bot.coordinates;
        if (!currentCoordinate) return;

        // Check if we should stop
        if (
            Math.abs(currentCoordinate[0] - this.targetCoordinate[0]) <= 1 &&
            Math.abs(currentCoordinate[1] - this.targetCoordinate[1]) <= 1 &&
            Math.abs(currentCoordinate[2] - this.targetCoordinate[2]) <= 1
        ) {
            console.log(`Reached destination at ${this.targetCoordinate}`);

            if (this.bot.mfBot?.pathfinder) {
                this.bot.mfBot.pathfinder.stop();
            }

            this.running = false;
            if (this.exitOnDestination) {
                this.bot.disconnect(true);
            }
            return;
        }

        const vec3Current = coordinateToVec3(currentCoordinate);
        if (!this.lastLogCoordinate) {
            this.lastLogCoordinate = vec3Current;
            this.lastLogTime = Date.now() / 1000;
        }

        const distSinceLog = distanceVec3(this.lastLogCoordinate, vec3Current);
        if (this.logInterval && distSinceLog !== null && distSinceLog >= this.logInterval) {
            const timeSinceLog = (Date.now() / 1000) - (this.lastLogTime || 0);
            const moveRateSec = distSinceLog / timeSinceLog;
            const distToGoal = distanceVec3(vec3Current, this.vec3Target) || 0;
            const timeToGoal = distToGoal / moveRateSec;
            const timeWalkStr = this.formatTime(timeToGoal);
            
            console.log(`Bot ${this.bot.username} is at ${currentCoordinate} with hunger ${this.bot.hunger} and health ${this.bot.health}. New estimated walk time ${timeWalkStr}`);
            this.lastLogCoordinate = vec3Current;
            this.lastLogTime = Date.now() / 1000;
        }
    }

    private formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}