import { Strategy } from "./strategy";
import { Bot } from "../bot";
import { Coordinate } from "../utils";
import { 
    AlwaysShield, 
    EfficientEat, 
    EmergencyQuit, 
    GotoLocation, 
    LootFinder,
    Action 
} from "../actions";

export class NetherHighwayStrategy extends Strategy {
    private targetCoordinate: Coordinate;
    private reconnectWaitTime: number;
    private actions: Action[] = [];

    constructor(bot: Bot, coordinate: Coordinate, debug = false) {
        super(bot);
        
        // The coordinate is always assumed to be at y=120
        this.targetCoordinate = coordinate;
        this.reconnectWaitTime = debug ? 5 : 60;

        if (this.targetCoordinate[1] !== 120) {
            throw new Error("NetherHighwayStrategy only works at y=120");
        }
    }

    public start(): void {
        super.start();
        
        this.actions = [
            // Should log every 30 minutes at running speed
            new GotoLocation(this.bot, this.targetCoordinate, 10000),
            new EmergencyQuit(this.bot, this.reconnectWaitTime),
            new EfficientEat(this.bot),
            new LootFinder(this.bot),
            // new AlwaysShield(this.bot), // Commented out in original
        ];

        for (const action of this.actions) {
            action.start();
        }
    }

    public stop(): void {
        super.stop();
        
        for (const action of this.actions) {
            action.stop();
        }
        this.actions = [];
    }
}