from vibe.bot import Bot


class Action:
    def __init__(self, name: str, description: str, bot: Bot, *args, **kwargs):
        self.name = name
        self.description = description
        self.bot = bot