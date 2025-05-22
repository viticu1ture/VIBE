import asyncio
import logging
import time

from vibe.actions.action import Action

_l = logging.getLogger(__name__)

class EfficientEat(Action):
    """
    Eats only enough food to keep the hunger bar full and only eats when that can be done.
    Note: you do not get the slowdown effect of eating when using this action, making it a hack.
    """
    IS_HACK = True
    PANIC_THRESHOLD = 6
    FOOD_BLACKLIST = {
        "enchanted_golden_apple", "rotten_flesh", "pufferfish", "poisonous_potato", "spider_eye",
        "suspicious_stew"
    }
    RUN_INTERVAL = 18

    def __init__(self, bot, *args, **kwargs):
        super().__init__("Efficient Eat", self.__class__.__doc__.strip(), bot, *args, run_event="tick",**kwargs)

    #def start(self):
    #    _l.info("Enabling autoeat...")
    #    # register the autoeat action
    #    self.bot.mf_bot.autoEat.setOpts({
    #        "bannedFood": list(self.FOOD_BLACKLIST),
    #        "minFood": 12,
    #        "eatingTimeout": 3000
    #    })
    #    self.bot.mf_bot.autoEat.enableAuto()

    #    self.bot.mf_bot.autoEat.on("eatStart", self._on_eat)
    #    self.bot.mf_bot.autoEat.on("eatFinish", self._on_eat_finish)
    #    self.bot.mf_bot.autoEat.on("eatFail", self._on_eat_fail)

    #def _on_eat(self, *args, **kwargs):
    #    _l.info("Eating...")

    #def _on_eat_finish(self, *args, **kwargs):
    #    _l.info("Finished eating.")

    #def _on_eat_fail(self, error, *args, **kwargs):
    #    _l.warning("Failed to eat food: %s", error)

    #def stop(self):
    #    self.bot.mf_bot.autoEat.disableAuto()

    def run_once(self, *args, tick_count=0, **kwargs):
        if tick_count != self.RUN_INTERVAL:
            return

        _l.debug("Doing efficient eat check...")

        hunger = self.bot.hunger
        _l.debug("Hunger: %s", hunger)
        if hunger == self.bot.MAX_HUNGER:
            _l.debug("Hunger is full, not eating.")
            return

        inv_slot, potential_food_points = self.find_best_food()
        if inv_slot is None:
            _l.info("No food found in inventory, not eating.")
            return
        if potential_food_points is None:
            _l.info("Food points is None, not eating.")
            return

        _l.debug("Found food in slot %d with food points %d", inv_slot, potential_food_points)
        needed_food = self.bot.MAX_HUNGER - hunger
        # check if we are in panic mode
        if hunger <= self.PANIC_THRESHOLD:
            _l.warning("Hunger somehow got too low, eating food...")
            max_attempts = 5
            attempt = 0
            while self.bot.hunger < self.bot.MAX_HUNGER:
                self.bot.equip_inventory_item(inv_slot)
                self.bot.eat()
                attempt += 1
                if attempt >= max_attempts:
                    _l.warning("Failed to eat food after %d attempts, giving up.", max_attempts)
                    break
        elif potential_food_points <= needed_food:
            _l.info("Eating food with %s points...", potential_food_points)
            self.bot.equip_inventory_item(inv_slot)
            eaten = self.bot.eat()
            if eaten:
                _l.info("Bot successfully ate.", self.bot.username)
        else:
            _l.debug("Not enough food points, only %s points", potential_food_points)

    def find_best_food(self) -> tuple[int | None, int | None]:
        # first thing, find all the food items in the inventory
        food_slots = {}
        for slot, food in self.bot.inventory.items():
            food_data = self.bot.is_food_item(food)
            if food_data and food_data.name not in self.FOOD_BLACKLIST:
                food_slots[slot] = food_data.foodPoints

        # if there are no food items, return
        if not food_slots:
            return None, None

        # get the highest value food item
        slot, food_points = max(food_slots.items(), key=lambda x: x[1])
        return slot, food_points
