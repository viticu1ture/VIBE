import logging
import time
from typing import Optional, Tuple

from ..bot import Bot
from ..constants import PLAYER_ENTITY
from .action import Action

_l = logging.getLogger(__name__)

class EmergencyQuit(Action):
    """
    Monitors various emergency conditions and disconnects the bot if any are met:
    - Health <= 10
    - No food available
    - 3 consecutive failed reconnects
    - Bot is stuck (no movement for 60 seconds)
    - Player entity detected (non-whitelisted)
    """
    HEALTH_THRESHOLD = 10
    STUCK_THRESHOLD = 60

    def __init__(self, bot: Bot, player_reconnect_timer: int = None, reconnect_handler: Optional[callable] = None, check_food: bool = True):
        super().__init__("Emergency Quit", "Emergency quit action that monitors health, food, reconnects, movement, and players", bot)

        self._player_reconnect_timer = player_reconnect_timer
        self._reconnect_handler = reconnect_handler
        self._check_food = check_food


        self._last_pos: Optional[Tuple[float, float, float]] = None
        self._last_pos_time: float = 0
        self.consecutive_reconnects: int = 0
        self.last_reconnect_time: float = 0

    def run(self):
        self.bot.register_event_handler("tick", self.run_once)

    def stop(self):
        self.bot.unregister_event_handler("tick", self.run_once)
        _l.debug("EmergencyQuit stopped.")

    def run_once(self, *args, **kwargs):
        _l.debug("EmergencyQuit run.")

        # Check health
        health = self.bot.health
        if health <= self.HEALTH_THRESHOLD:
            _l.critical("Emergency quit: Health too low (%d)", health)
            self.bot.disconnect()
            return

        # Check for non-whitelisted players
        entities = self.bot.entities()
        for entity in entities:
            entity_coord = entity[0]
            entity_type = entity[1]
            entity_sub_name = entity[2]

            if entity_type == PLAYER_ENTITY and entity_sub_name not in self.bot.player_whitelist:
                _l.critical("Emergency quit: Non-whitelisted player '%s' detected at %s", entity_sub_name, entity_coord)
                if self._player_reconnect_timer is not None and self._reconnect_handler is not None:
                    self.bot.disconnect()
                    _l.info("Waiting %d seconds before reconnecting...", self._player_reconnect_timer)
                    time.sleep(self._player_reconnect_timer)
                    self._reconnect_handler()
                    return
                else:
                    self.bot.disconnect()
                    return

        # Check for food items in the inventory
        if self._check_food:
            items = self.bot.inventory.items()
            food_items = [item for item in items if self.bot.is_food_item(item)]
            if not food_items:
                _l.critical("Emergency quit: No food items in inventory")
                self.bot.disconnect()
                return

        # Check if stuck
        current_pos = self.bot.coordinates
        current_time = time.time()

        if self._last_pos is not None:
            # Only check x and z coordinates
            if (abs(current_pos[0] - self._last_pos[0]) < 1 and
                abs(current_pos[2] - self._last_pos[2]) < 1):
                if current_time - self._last_pos_time >= self.STUCK_THRESHOLD:
                    _l.critical("Emergency quit: Bot is stuck at position %s for %d seconds", current_pos, self.STUCK_THRESHOLD)
                    self.bot.disconnect()
                    return
            else:
                # Reset stuck timer if we moved
                self._last_pos_time = current_time
        self._last_pos = current_pos

        # TODO: add a way to check total reconnects
