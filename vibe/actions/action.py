from vibe.bot import Bot


class Action:
    """
    Base class for all actions. IS_HACK is a flag that indicates if the action would be considered a hack on a
    traditional Minecraft server.
    """
    IS_HACK = False

    def __init__(self, name: str, description: str, bot: Bot, *args, run_event: str = None, **kwargs):
        self.name = name
        self.description = description
        self.bot = bot
        self.run_event = run_event

    def start(self, *args, **kwargs):
        if self.run_event is not None:
            self.bot.register_event_handler(self.run_event, self.run_once)

    def stop(self):
        if self.run_event is not None:
            self.bot.unregister_event_handler(self.run_event, self.run_once)

    def run_once(self, *args, **kwargs):
        """
        Run the action once. This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement this method.")
