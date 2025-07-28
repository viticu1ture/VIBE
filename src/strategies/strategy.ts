import { Bot } from "../bot";

export abstract class Strategy {
    protected bot: Bot;
    public isRunning: boolean = false;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    public start(): void {
        this.isRunning = true;
    }

    public stop(): void {
        this.isRunning = false;
    }
}