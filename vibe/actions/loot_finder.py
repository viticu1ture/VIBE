import logging
import time
from typing import Set, Tuple

from ..bot import Bot
from ..constants import ITEM_ENTITY
from .action import Action

_l = logging.getLogger(__name__)

class LootFinder(Action):
    """
    Monitors for valuable items in the environment and logs their locations.
    Valuable items include:
    - Netherite items
    - Shulker boxes
    - Elytra
    """

    def __init__(self, bot: Bot):
        super().__init__("Loot Finder", "Monitors for valuable items in the environment", bot)
        self.seen_loot: Set[Tuple[int, int, int, str]] = set()

    def run(self):
        self.bot.register_event_handler("tick", self.run_once)

    def stop(self):
        self.bot.unregister_event_handler("tick", self.run_once)
        _l.debug("LootFinder stopped.")

    def run_once(self, *args, **kwargs):
        _l.debug("LootFinder run.")

        entities = self.bot.entities()
        for entity in entities:
            entity_coord = entity[0]
            entity_type = entity[1]
            entity_sub_name = entity[2]

            if entity_type == ITEM_ENTITY:
                is_netherite = "netherite" in entity_sub_name
                is_shulker = "shulker" in entity_sub_name
                is_elytra = "elytra" in entity_sub_name
                is_valuable = is_netherite or is_shulker or is_elytra

                if is_valuable:
                    item_tup = (int(entity_coord[0]), int(entity_coord[1]), int(entity_coord[2]), entity_sub_name)
                    if item_tup not in self.seen_loot:
                        self.seen_loot.add(item_tup)
                        _l.info("Found loot item '%s' at %s", entity_sub_name, item_tup[0:3])