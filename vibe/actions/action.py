from vibe.bot import Bot


class Action:
    """
    Base class for all actions. IS_HACK is a flag that indicates if the action would be considered a hack on a
    traditional Minecraft server.
    """
    IS_HACK = False

    def __init__(self, name: str, description: str, bot: Bot, *args, **kwargs):
        self.name = name
        self.description = description
        self.bot = bot

    def run(self, *args, **kwargs):
        """
        Run the action. This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement this method.")

    def run_once(self, *args, **kwargs):
        """
        Run the action once. This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement this method.")

    def stop(self):
        """
        Stop the action. This method should be overridden by subclasses.
        """
        raise NotImplementedError("Subclasses must implement this method.")