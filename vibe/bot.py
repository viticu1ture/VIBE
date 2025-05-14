import logging

from javascript import require, Once

_l = logging.getLogger(__name__)

class Bot:
    DEFAULT_USERNAME="vibe_bot"

    def __init__(self, host="localhost", port=25565, username="vibe_bot"):
        self.mc_host = host
        self.mc_port = port
        self.username = username

        # load javascript modules we need
        self.mineflayer = require("mineflayer")
        require("canvas")
        self.mineflayer_viewer = require("prismarine-viewer").mineflayer

        self.bot: "mineflayer.Bot" = None
        self.viewer: "mineflayer_viewer.Viewer" = None

    def connect(self):
        # connect the bot
        arg_dict = {
            "host": self.mc_host,
            "port": self.mc_port,
            "username": self.username,
            "hideErrors": False,
        }
        if self.username != self.DEFAULT_USERNAME:
            arg_dict["auth"] = "microsoft"

        self.bot = self.mineflayer.createBot(arg_dict)

        # create stubs for the bot events
        @Once(self.bot, "login")
        def _on_login(*args):
            self.handle_login(*args)

    def handle_login(self, *args):
        _l.info(f"Bot %s has logged in to the server %s:%s", self.username, self.mc_host, self.mc_port)
        # create the viewer
        self.viewer = self.mineflayer_viewer(
            self.bot, {"port": 3007, "firstPerson": True}
        )
