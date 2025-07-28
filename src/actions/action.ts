import { Bot } from "../bot";

export abstract class Action {
    public static readonly IS_HACK: boolean = false;
    
    public name: string;
    public description: string;
    protected bot: Bot;
    private runEvent?: string;

    constructor(name: string, description: string, bot: Bot, runEvent?: string) {
        this.name = name;
        this.description = description;
        this.bot = bot;
        this.runEvent = runEvent;
    }

    public start(): void {
        if (this.runEvent) {
            this.bot.registerEventHandler(this.runEvent, this.runOnce.bind(this));
        }
    }

    public stop(): void {
        if (this.runEvent) {
            this.bot.unregisterEventHandler(this.runEvent, this.runOnce.bind(this));
        }
    }

    public abstract runOnce(...args: any[]): void | boolean | Promise<void | boolean>;
}