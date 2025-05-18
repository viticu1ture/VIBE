import logging

from vibe.actions.action import Action

_l = logging.getLogger(__name__)

class EfficientEat(Action):
    """
    Eats only enough food to keep the hunger bar full and only eats when that can be done.
    Note: you do not get the slowdown effect of eating when using this action, making it a hack.
    """
    IS_HACK = True

    def __init__(self, bot, *args, **kwargs):
        super().__init__("Efficient Eat", self.__class__.__doc__.strip(), bot, *args, **kwargs)

    def run(self, *args, **kwargs):
        # register on hunger change events
        self.bot.register_event_handler("health", self.run_once)

    def stop(self):
        # unregister on hunger change events
        self.bot.unregister_event_handler("health", self.run_once)
        _l.debug("EfficientEat stopped.")

    def run_once(self, *args, **kwargs):
        hunger = self.bot.hunger
        _l.debug("Hunger: %s", hunger)
        if hunger == self.bot.MAX_HUNGER:
            _l.debug("Hunger is full, not eating.")
            return

        inv_slot, food_points = self.find_best_food()
        if inv_slot is None:
            _l.debug("No food found in inventory, not eating.")
            return

        _l.debug("Found food in slot %d with food points %d", inv_slot, food_points)

        needed_food = self.bot.MAX_HUNGER - hunger
        if food_points <= needed_food:
            _l.info("Eating food with %s points...", food_points)
            self.bot.equip_inventory_item(inv_slot)
            with self.bot.activate_item_lock:
                self.bot.mf_bot.deactivateItem()
                self.bot.mf_bot.consume()
            _l.info("Food consumed!")
        else:
            _l.debug("Not enough food points, only %s points", food_points)

    def find_best_food(self) -> tuple[int | None, int | None]:
        # first thing, find all the food items in the inventory
        food_slots = {}
        for slot, food in self.bot.inventory.items():
            food_data = self.bot.is_food_item(food)
            if food_data:
                food_slots[slot] = food_data.foodPoints

        # if there are no food items, return
        if not food_slots:
            return None, None

        # get the highest value food item
        slot, food_points = max(food_slots.items(), key=lambda x: x[1])
        return slot, food_points
