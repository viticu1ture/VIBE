import logging
import threading
import time

from pygments.lexers import q

from ..actions.always_shield import AlwaysShield
from ..actions.efficient_eat import EfficientEat
from ..bot import Bot
from .strategy import Strategy
from ..constants import FAST_WAIT_SPEED, PLAYER_ENTITY, ITEM_ENTITY

_l = logging.getLogger(__name__)

class NetherHighwayStrategy(Strategy):
    def __init__(self, bot: Bot, coordinate: tuple[int, int, int]):
        super().__init__(bot)
        # the coordinate is always assumed to be at y=120
        self.target_coordinate = coordinate

        self.seen_loot = set()

        # actions
        self.efficient_eat = None

        assert self.target_coordinate[1] == 120, "NetherHighwayStrategy only works at y=120"

    def start(self):
        super().start()
        # start the bot
        self._start_events()

        # then start the entity check loop
        _l.info("Starting entity check loop...")
        t = threading.Thread(target=self.entity_check_loop, daemon=True)
        t.start()
        _l.info("Entity check loop started.")

    def _start_events(self):
        """
        All events that should be run on start (or restart) of the bot.
        This should exclude threads that are already running.
        :return:
        """
        # begin by starting the pathfinding
        self.bot.goto(*self.target_coordinate)

        # efficient eat
        self.efficient_eat = EfficientEat(self.bot)
        self.efficient_eat.run()

        # always shield
        self.always_shield = AlwaysShield(self.bot)
        self.always_shield.run()

    def entity_check_loop(self):
        _l.info("Entering loop.")
        while self.is_running:
            time.sleep(FAST_WAIT_SPEED)
            try:
                entities = self.bot.entities()
            except Exception as e:
                _l.error("Error getting entities: %s", e)
                time.sleep(1)
                continue

            for entity in entities:
                entity_coord = entity[0]
                entity_type = entity[1]
                entity_sub_name = entity[2]

                if entity_type == PLAYER_ENTITY and entity_sub_name not in self.bot.player_whitelist:
                    _l.info("Bad entity '%s' detected at %s", entity_sub_name, entity_coord)
                    self.bot.reconnect(wait_time=10)
                    # TODO: add a on_reconnect event
                    self._start_events()
                if entity_type == ITEM_ENTITY:
                    is_netherite = "netherite" in entity_sub_name
                    is_shulker = "shulker" in entity_sub_name
                    is_eleytra = "eleytra" in entity_sub_name
                    is_valuable = is_netherite or is_shulker or is_eleytra
                    # TODO: go to the item and pick it up if it is within a radium and if
                    #     you can make it to the item in time of despawning (5 minutes)
                    if is_valuable:
                        item_tup = (int(entity_coord[0]), int(entity_coord[1]), int(entity_coord[2]), entity_sub_name)
                        if item_tup not in self.seen_loot:
                            self.seen_loot.add(item_tup)
                            _l.info("Found loot item '%s' at %s", entity_sub_name, entity_coord)
