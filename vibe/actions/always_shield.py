import logging
import math

from vibe.actions.action import Action
from vibe.utils import vec3_to_coor

_l = logging.getLogger(__name__)

class AlwaysShield(Action):
    """
    Always uses a shield when available and points to the nearest target.
    Note: you do not get the slowdown effect of the shield when using this action, making it a hack.
    """
    IS_HACK = True

    def __init__(self, bot, *args, **kwargs):
        super().__init__("Always Shield", self.__class__.__doc__.strip(), bot, *args, **kwargs)
        self.run_amt = 0

    def run(self, *args, **kwargs):
        # register on entity change events
        self.bot.register_event_handler("tick", self.run_once)

    def stop(self):
        # unregister on entity change events
        self.bot.unregister_event_handler("tick", self.run_once)
        _l.debug("AlwaysShield stopped.")

    def run_once(self, *args, **kwargs):
        # equip the shield if we have one available
        shield_in_offhand = self.bot.equip_shield()

        if shield_in_offhand:
            shield_activated = self.bot.mf_bot.usingHeldItem
            if not shield_activated:
                with self.bot.activate_item_lock:
                    self.bot.mf_bot.activateItem(True)
        else:
            _l.debug("No shield found in offhand, not activating.")
            return False

        # TODO: make it always look at the nearest entity (glitches when running)
        # get the nearest entity and point to it
        #entity = self.bot.mf_bot.nearestEntity()
        #if entity is None:
        #    _l.debug("No entity found, not pointing.")
        #    return False

        #ent_pos = entity.position
        #if ent_pos is None:
        #    _l.debug("Entity has no position, not pointing.")
        #    return False

        return True
