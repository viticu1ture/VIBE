import logging
import time

from ..actions.always_shield import AlwaysShield
from ..actions.efficient_eat import EfficientEat
from ..actions.emergency_quit import EmergencyQuit
from ..actions.loot_finder import LootFinder
from ..actions.goto_location import GotoLocation
from ..bot import Bot
from .strategy import Strategy
from vibe import DEBUG

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
        self.reconnect_wait_time = 60 if not DEBUG else 5

        self._actions = []

        assert self.target_coordinate[1] == 120, "NetherHighwayStrategy only works at y=120"

    def start(self):
        super().start()
        self._actions = [
            GotoLocation(self.bot, self.target_coordinate, log_interval=1000),
            EmergencyQuit(self.bot, reconnect_wait_time=self.reconnect_wait_time),
            EfficientEat(self.bot),
            LootFinder(self.bot),
            #AlwaysShield(self.bot),
        ]
        for action in self._actions:
            action.start()
