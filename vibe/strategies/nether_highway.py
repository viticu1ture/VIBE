import logging
import time

from ..actions.always_shield import AlwaysShield
from ..actions.efficient_eat import EfficientEat
from ..actions.emergency_quit import EmergencyQuit
from ..actions.loot_finder import LootFinder
from ..bot import Bot
from .strategy import Strategy

_l = logging.getLogger(__name__)

class NetherHighwayStrategy(Strategy):
    """
    The Nether Highway Strategy is designed to get you to a certain coordinate on the Nether Highway, commonly found
    on anarchy servers like 2b2t. This means a long obsidian path found at y=120. 

    Travelling on the highway will take a long time and can be very dangerous. This strategy aims to get you to your 
    desired coordiates while doing a few things:
    - keeping you safe from players (combat relogging)
    - keeping you safe from mobs
    - keeping you fed
    - pickup up loot along the way
    - saving every N blocks at a nerby portal
    """

    def __init__(self, bot: Bot, coordinate: tuple[int, int, int]):
        super().__init__(bot)
        # the coordinate is always assumed to be at y=120
        self.target_coordinate = coordinate

        self._actions = []

        assert self.target_coordinate[1] == 120, "NetherHighwayStrategy only works at y=120"

    def start(self):
        super().start()
        self._start_async_events()

    def _start_async_events(self):
        """
        All events that should be run on start (or restart) of the bot.
        This should exclude threads that are already running.
        :return:
        """
        # begin by starting the pathfinding
        self.bot.goto(*self.target_coordinate)

        # then start the actions
        self._actions = [
            EfficientEat(self.bot),
            AlwaysShield(self.bot),
            EmergencyQuit(self.bot, player_reconnect_timer=15, reconnect_handler=self.restart_handler, check_food=False),
            LootFinder(self.bot),
        ]
        for action in self._actions:
            action.run()

    def _stop_async_events(self):
        """
        All events that should be stopped on stop (or restart) of the bot.
        This should exclude threads that are already stopped.
        :return:
        """
        # stop the pathfinding
        if self.bot.mf_bot and self.bot.mf_bot.pathfinding:
            _l.debug("Stopping pathfinding...")
            self.bot.mf_bot.pathfinding.stop()

        # stop the actions
        for action in self._actions:
            action.stop()

    def restart_handler(self):
        """
        Restart the strategy. This is called when the bot is restarted.
        :return:
        """
        _l.debug("Restarting NetherHighwayStrategy...")
        self._stop_async_events()
        self.bot.connect()
        self._start_async_events()
