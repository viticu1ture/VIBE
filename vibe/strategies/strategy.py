from vibe.bot import Bot


class Strategy:
    def __init__(self, bot: Bot, *args, **kwargs):
        self.bot = bot
        self.is_running = False

    def start(self):
        self.is_running = True

    def stop(self):
        self.is_running = False
