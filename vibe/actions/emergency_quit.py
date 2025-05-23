import logging
import time
from typing import Optional, Tuple

from ..bot import Bot
from ..constants import PLAYER_ENTITY
from .action import Action
from .efficient_eat import EfficientEat

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
    MAX_CONSECUTIVE_RECONNECTS = 3
    CONSECUTIVE_RECONNECT_TIME = 5 * 60  # 5 minutes

    def __init__(
        self,
        bot: Bot,
        reconnect_wait_time: int = None,
        check_food: bool = True,
        check_stuck: bool = True,
        check_players: bool = True,
    ):
        super().__init__("Emergency Quit", "Emergency quit action that monitors health, food, reconnects, movement, and players", bot, run_event="tick")

        self._reconnect_wait_time = reconnect_wait_time
        self._check_food = check_food
        self._check_stuck = check_stuck
        self._check_players = check_players

        self._last_pos: Optional[Tuple[float, float, float]] = None
        self._last_pos_time: float | None = None
        # TODO: add a way to check total reconnects

    def run_once(self, *args, **kwargs):
        # Check health
        health = self.bot.health
        if health and health <= self.HEALTH_THRESHOLD:
            _l.critical("Emergency quit: Health too low (%d)", health)
            self.bot.disconnect(should_exit=True)
            return

        # Check for non-whitelisted players
        if self._check_players:
            entities = self.bot.entities()
            for entity in entities:
                entity_coord = entity[0]
                entity_type = entity[1]
                entity_sub_name = entity[2]

                if entity_type == PLAYER_ENTITY and entity_sub_name not in self.bot.player_whitelist:
                    _l.critical("Emergency quit: Non-whitelisted player '%s' detected at %s", entity_sub_name, entity_coord)
                    if self._reconnect_wait_time is not None:
                        _l.info("Waiting %d seconds before reconnecting...", self._reconnect_wait_time)
                        self.bot.reconnect(wait_time=self._reconnect_wait_time)
                    else:
                        self.bot.disconnect(should_exit=True)
                    return

        # Check for food items in the inventory
        if self._check_food:
            items = self.bot.inventory.values()
            if items:
                food_items = [item for item in items if self.bot.is_food_item(item)]
                valid_food_items = [item for item in food_items if item.name and item.name not in EfficientEat.FOOD_BLACKLIST]
                if not valid_food_items:
                    _l.critical("Emergency quit: No valid food items in inventory")
                    self.bot.disconnect(should_exit=True)
                    return
            else:
                _l.warning("Failed to get inventory items, skipping food check...")

        # Check if stuck
        if self._check_stuck:
            current_pos = self.bot.coordinates

            if current_pos is not None:
                current_time = time.time()
                if self._last_pos_time is None:
                    self._last_pos_time = current_time
                if self._last_pos is None:
                    self._last_pos = current_pos

                if self._last_pos is not None and self._last_pos_time is not None:
                    x_dist = abs(current_pos[0] - self._last_pos[0])
                    z_dist = abs(current_pos[2] - self._last_pos[2])

                    # Only check x and z coordinates
                    if x_dist < 1 and z_dist < 1:
                        stuck_time = current_time - self._last_pos_time
                        if stuck_time >= self.STUCK_THRESHOLD:
                            _l.critical("current_pos: %s, last_pos: %s, current_time: %s, last_pos_time: %s", current_pos, self._last_pos, current_time, self._last_pos_time)
                            _l.critical("Emergency quit: Bot is stuck at position %s for %d seconds. Attempting to reconnect...", current_pos, self.STUCK_THRESHOLD)
                            self.bot.reconnect(wait_time=10)
                            # attempt to force a movement
                            self.bot.goto(*self.bot.goto_goal)
                            self._last_pos = None
                            self._last_pos_time = None
                    else:
                        self._last_pos_time = current_time
                        self._last_pos = current_pos
            else:
                _l.warning("Failed to get current position, skipping stuck check...")
