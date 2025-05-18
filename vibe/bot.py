import logging
import threading
import time
from collections import defaultdict

from javascript import require, On

from vibe.constants import PLAYER_ENTITY, STORAGE_BLOCKS, NETHER_BRICKS, BLACKSTONE_BLOCKS, DIM_NETHER, DIM_OVERWORLD, \
    SPAWNER_BLOCK, CHEST_BLOCK
from vibe.utils import distance_vec3, coor_to_vec3, vec3_to_coor

vec3 = require('vec3').Vec3

_l = logging.getLogger(__name__)

DEBUG = True

class Bot:
    DEFAULT_USERNAME="vibe_bot"
    MAX_HUNGER=20
    MAX_HEALTH=20

    def __init__(self, host="localhost", port=25565, username="vibe_bot", mc_version=None, no_auth=False):
        self.mc_host = host
        self.mc_port = port
        self.mc_version = mc_version
        self.username = username
        self._no_auth = no_auth

        self.player_whitelist = set(["Viticulture", "JuicySword"])

        # javascript objects inited later
        self.mineflayer = require("mineflayer")
        self.mineflayer_viewer = None
        self.pathfinder =  None
        self.mc_data = None

        self.mf_bot: "mineflayer.Bot" = None
        self.activate_item_lock = threading.Lock()
        self._viewer_started = False

        # format: {event_name: [handler1, handler2, ...]}
        self.event_handlers = defaultdict(list)
        self.register_event_handler("login", self.handle_login)
        self.register_event_handler("spawn", self.handle_spawn)
        self.register_event_handler("kicked", self.handle_kicked)

    #
    # Interaction
    #

    def _init_javascript_objects(self):
        require("canvas")
        self.mineflayer_viewer = None
        self.pathfinder = require("mineflayer-pathfinder")
        self.mc_data = require("minecraft-data")(self.mc_version)

    def connect(self):
        _l.info("Connecting to server...")
        self._init_javascript_objects()
        # connect the bot
        arg_dict = {
            "host": self.mc_host,
            "port": self.mc_port,
            "username": self.username,
            "hideErrors": True,
        }
        if not self._no_auth and self.username != self.DEFAULT_USERNAME:
            arg_dict["auth"] = "microsoft"
        if self.mc_version:
            arg_dict["version"] = self.mc_version

        self.mf_bot = self.mineflayer.createBot(arg_dict)

        # load plugins
        self.mf_bot.loadPlugin(self.pathfinder.pathfinder)

        #
        # create stubs for the bot events
        #

        @On(self.mf_bot, "login")
        def _on_login(*args):
            self.handle_event("login", *args)

        @On(self.mf_bot, "chat")
        def _on_chat(username, message, *args):
            _l.info("Chat received: %s", message)
            self.handle_event("chat", username, message, *args)

        @On(self.mf_bot, "spawn")
        def _on_spawn(*args):
            self.handle_event("spawn", *args)

        @On(self.mf_bot, "kicked")
        def _on_kicked(*args):
            self.handle_event("kicked", *args)

        @On(self.mf_bot, "error")
        def _on_error(*args):
            self.handle_event("error", *args)

        @On(self.mf_bot, "death")
        def _on_death(*args):
            self.handle_event("death", *args)

        @On(self.mf_bot, "end")
        def _on_end(*args):
            self.handle_event("end", *args)

        @On(self.mf_bot, "health")
        def _on_health(*args):
            self.handle_event("health", *args)

        @On(self.mf_bot, "physicsTick")
        def _on_tick(*args):
            self.handle_event("tick", *args)

    def disconnect(self):
        """
        Disconnect the bot from the server.
        """
        _l.info("Disconnecting from server...")
        if self.mf_bot:
            if self._viewer_started:
                self.mf_bot.viewer.close()
                self._viewer_started = False

            self.mf_bot.end()
            self.mf_bot = None

    def reconnect(self, wait_time=10):
        """
        Disconnect the bot from the server and reconnect after a wait time.
        """
        self.disconnect()
        _l.info("Reconnecting to server in %s seconds...", wait_time)
        time.sleep(wait_time)
        self.connect()


    def do_nether_strategy(self, coordinate):
        """
        This function is a placeholder for the Nether strategy.
        It will be replaced with the actual strategy in the future.
        """
        from .strategies.nether_highway import NetherHighwayStrategy
        strat = NetherHighwayStrategy(self, coordinate)
        strat.start()

    #
    # Event Handlers
    #

    def register_event_handler(self, event_name, handler):
        """
        Register an event handler for a specific event.
        :param event_name: The name of the event to register the handler for.
        :param handler: The handler function to register.
        """
        if not callable(handler):
            raise ValueError("Handler must be callable")
        self.event_handlers[event_name].append(handler)

    def unregister_event_handler(self, event_name, handler):
        """
        Unregister an event handler for a specific event.
        :param event_name: The name of the event to unregister the handler for.
        :param handler: The handler function to unregister.
        """
        if not callable(handler):
            raise ValueError("Handler must be callable")
        if event_name in self.event_handlers:
            self.event_handlers[event_name].remove(handler)

    def handle_event(self, event_name, *args, **kwargs):
        handlers = self.event_handlers.get(event_name, [])
        for handler in handlers:
            if DEBUG:
                handler(*args, **kwargs)
            else:
                try:
                    handler(*args, **kwargs)
                except Exception as e:
                    _l.error(f"Error in event handler for event %s: %s", event_name, e)
                    continue

    def handle_login(self, *args):
        _l.info(f"Bot %s has logged in to the server %s:%s", self.username, self.mc_host, self.mc_port)
        # create the viewer
        self.mineflayer_viewer = require("prismarine-viewer").mineflayer
        self.mineflayer_viewer(
            self.mf_bot, {"port": 3007, "firstPerson": True}
        )
        self._viewer_started = True

    def handle_spawn(self, *args):
        _l.info(f"Bot %s has spawned in the world", self.username)

    def handle_kicked(self, this, reason, logged_in, *args):
        _l.info(f"Bot %s has been kicked from the server for reason: %s", self.username, reason)

    #
    # Properties
    #

    @property
    def coordinates(self) -> None | tuple[float, float, float]:
        """
        Get the current coordinates of the bot.
        """
        position = self.mf_bot.entity.position
        return (position["x"], position["y"], position["z"]) if position else None

    @property
    def dimension(self):
        return self.mf_bot.game.dimension

    @property
    def hunger(self):
        """
        Get the current hunger level of the bot.
        """
        return self.mf_bot.food

    @property
    def inventory(self):
        """
        Get the current inventory of the bot.
        """
        inventory_items = self.mf_bot.inventory.slots
        inventory = [i for i in inventory_items]
        inventory = inventory[::-1]
        # XXX: note I used to use idx here
        inv_dict = {item.slot: item for idx, item in enumerate(inventory) if item is not None}
        return inv_dict

    #
    # Common Actions
    #

    def item_in_hand(self, offhand=False) -> object | None:
        """
        Get the item in the hand or offhand.
        :param offhand: If True, get the item in the offhand, otherwise get the item in the hand.
        :return: The item in the hand or offhand.
        """
        if self.mf_bot is None:
            _l.info(f"Not connected to server, cannot get item in hand")
            return None

        hand_slot = self.mf_bot.getEquipmentDestSlot("off-hand" if offhand else "hand")
        if hand_slot is None:
            _l.critical("Could not get hand slot")
            return None

        item = self.inventory.get(hand_slot, None)
        return item

    def equip_shield(self) -> bool:
        """
        Equip the shield in the offhand. Returns True if successful, False otherwise.
        """
        item_in_hand = self.item_in_hand(offhand=True)
        if item_in_hand and item_in_hand.name == "shield":
            _l.debug("Shield already equipped in hand")
            return True

        inventory = self.inventory
        for slot, item in inventory.items():
            if item and item.name == "shield":
                self.mf_bot.equip(item, "off-hand")
                _l.info(f"Equipped shield in slot %d", slot)
                return True

        return False

    def is_food_item(self, item) -> bool | object:
        """
        Check if the item is a food item.
        """
        if item is None:
            return False
        e_type = item.type
        if e_type is None:
            return False

        food_data = self.mc_data.foods[e_type]
        if food_data is None:
            return False

        return food_data

    def equip_inventory_item(self, slot, offhand=False) -> bool:
        inventory = self.inventory
        if not slot in inventory:
            _l.warning(f"Slot %d not found in inventory", slot)
            return False

        item = inventory[slot]
        if not item:
            _l.warning(f"Item %d not found in inventory", slot)
            return False

        # equip the item
        place = "off-hand" if offhand else "hand"
        self.mf_bot.equip(item, place)
        return True


    def goto(self, x, y, z):
        """
        Pathfind the bot to a specific location in the world.
        """
        # set the default movement
        default_movement = self.pathfinder.Movements(self.mf_bot)
        default_movement.allowParkour = True #False

        self.mf_bot.pathfinder.setMovements(default_movement)

        # set the goal
        # create a Vec3 object for the target position
        target_pos = vec3(x, y, z)
        self.mf_bot.pathfinder.setGoal(
            self.pathfinder.goals.GoalNear(target_pos.x, target_pos.y, target_pos.z)
        )


    def print_coordinates_loop(self):
        """
        Print the coordinates of the bot every second.
        """
        def _print_coordinates():
            while True:
                coords = self.coordinates
                if coords:
                    _l.info(f"Bot %s is at coordinates: %s", self.username, coords)
                else:
                    _l.info(f"Bot %s is not in the world", self.username)
                time.sleep(1)

        # start the thread
        thread = threading.Thread(target=_print_coordinates)
        thread.start()

    def entities(self) -> list[tuple[tuple[float, float, float], str, str | None]]:
        """
        List all entities in the bot's vicinity.
        Returns a list of tuples, where each tuple contains:
        - A tuple of (x, y, z) coordinates
        - The entity name/type
        """
        entities = []
        entity_nums = list(self.mf_bot.entities)
        for entity_num in entity_nums:
            entity = self.mf_bot.entities[entity_num]
            if entity is None:
                continue

            # stip the bot itself
            if entity.name == PLAYER_ENTITY and entity.username == self.username:
                continue

            if entity.position:
                coord = vec3_to_coor(entity.position)
                name = entity.name if hasattr(entity, "name") else entity.type
                specific_name = None
                if name == "item":
                    entity_metadata = list(entity.metadata)[-1]
                    item_id = entity_metadata.itemId
                    specific_name = self.mc_data.items[item_id].name
                if name == "player":
                    specific_name = entity.username

                entities.append((coord, name, specific_name))
        return entities

    def find_blocks(self, blocks: list[str], max_distance: int = 64, point: tuple[float, float, float] = None) -> dict[str, list[tuple[float, float, float]]]:
        """
        Find blocks in the bot's vicinity that matches the given list of block names.
        Returns a list of tuples, where each tuple contains:
        - A tuple of (x, y, z) coordinates
        - The block name/type
        """
        search_blocks = set(blocks)
        found_blocks = defaultdict(list)
        for search_block in search_blocks:
            # covert the block names to block ids
            try:
                block_id = self.mc_data.blocksByName[search_block].id
            except AttributeError:
                _l.warning(f"Block %s not found in the registry", search_block)
                continue

            # find the blocks
            find_args = {
                'matching': [block_id],
                'maxDistance': max_distance,
                'count': 200
            }
            if point:
                find_args['point'] = coor_to_vec3(point)
            block_poses = self.mf_bot.findBlocks(find_args)
            for block_pos in block_poses:
                coord = (block_pos['x'], block_pos['y'], block_pos['z'])
                found_blocks[search_block].append(coord)

        return found_blocks

    def find_valuable_storage_blocks(self, max_distance=64) -> dict[str, list[tuple[float, float, float]]]:
        """
        This function finds all valuable storage blocks in the bot's vicinity.
        A valuable storage block is defined as any storage block that likely contains loot.
        This is every storage block, except the following cases:
        - a chest on top of nether_bricks in Nether (a nether fortress)
        - a chest on top of any blackstone block in Nether (a bastion)
        - a chest less than two blocks away from a spawner in Overworld (a dungeon)

        :return:
        """
        # find all storage blocks
        valuable_storage_blocks = defaultdict(list)
        storage_blocks = self.find_blocks(STORAGE_BLOCKS, max_distance=max_distance)

        # only chests require special handling
        chest_coords = storage_blocks.get(CHEST_BLOCK, [])
        invalid_chest_coords = []
        for chest_coord in chest_coords:
            # check if the chest is on top of a nether brick block
            if self.dimension == DIM_NETHER:
                below_chest = coor_to_vec3((chest_coord[0], chest_coord[1] - 1, chest_coord[2]))
                block_below = self.mf_bot.blockAt(below_chest)

                # check if the block below is a nether brick
                if block_below:
                    if block_below.name == NETHER_BRICKS or block_below.name in BLACKSTONE_BLOCKS:
                        invalid_chest_coords.append(chest_coord)
                        continue

            # check if the chest is less than two blocks away from a spawner
            elif self.dimension == DIM_OVERWORLD:
                spawners = self.find_blocks([SPAWNER_BLOCK], max_distance=3, point=chest_coord)
                spawner_blocks = spawners.get(SPAWNER_BLOCK, [])
                if spawner_blocks:
                    invalid_chest_coords.append(chest_coord)
                    continue

        # remove the invalid chests from the list of chests
        valid_chest_coords = []
        for chest_coord in chest_coords:
            if chest_coord not in invalid_chest_coords:
                valid_chest_coords.append(chest_coord)
        if valid_chest_coords:
            valuable_storage_blocks[CHEST_BLOCK] = valid_chest_coords

        for block, coords in storage_blocks.items():
            if block == CHEST_BLOCK:
                continue
            else:
                valuable_storage_blocks[block] += coords


        return valuable_storage_blocks
