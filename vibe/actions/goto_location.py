import logging
import time

from vibe.actions.action import Action
from vibe.utils import coor_to_vec3, distance_vec3, walk_time

_l = logging.getLogger(__name__)

class GotoLocation(Action):
    """
    Moves the bot to a specific location in the world.
    """
    RUN_INTERVAL = 19

    def __init__(self, bot, coordinate: tuple[float, float, float], *args, log_interval=1000, exit_on_dst=True, **kwargs):
        super().__init__("Goto Location", self.__class__.__doc__.strip(), bot, *args, run_event="tick", **kwargs)
        self.target_coordinate = coordinate
        self.bot.goto_goal = coordinate
        self._vec3_target = coor_to_vec3(self.target_coordinate)

        self._last_log_coor = None
        self._last_log_time = None
        self.log_interval = log_interval
        self.running = False
        self.exit_on_dst = exit_on_dst

    def stop(self):
        super().stop()
        if self.bot.mf_bot:
            self.bot.mf_bot.pathfinder.stop()
        self.running = False
        self._last_log_coor = None

    def run_once(self, *args, tick_count=0, **kwargs):
        if tick_count != self.RUN_INTERVAL:
            return

        if not self.running:
            self.running = True
            time_est = walk_time(self._vec3_target, coor_to_vec3(self.bot.coordinates), stop_and_eat=True)
            time_est_str_hms = time.strftime("%H:%M:%S", time.gmtime(time_est))
            _l.info("Pathfinding to %s from %s. Estimate: %s", self.target_coordinate, self.bot.coordinates, time_est_str_hms)
            self.bot.goto(*self.target_coordinate)
            return

        current_coordinate = self.bot.coordinates
        # check if we should stop
        if (abs(current_coordinate[0] - self.target_coordinate[0]) <= 1 and
                abs(current_coordinate[1] - self.target_coordinate[1]) <= 1 and
                abs(current_coordinate[2] - self.target_coordinate[2]) <= 1):

            _l.info("Reached destination at %s", self.target_coordinate)

            if self.bot.mf_bot:
                self.bot.mf_bot.pathfinder.stop()

            self.running = False
            if self.exit_on_dst:
                self.bot.disconnect(should_exit=True)

            return

        vec3_current = coor_to_vec3(current_coordinate)
        if self._last_log_coor is None:
            self._last_log_coor = vec3_current
            self._last_log_time = time.time()

        dist_since_log = distance_vec3(self._last_log_coor, vec3_current)
        if self.log_interval and dist_since_log is not None and dist_since_log >= self.log_interval:
            time_since_log = time.time() - self._last_log_time
            move_rate_sec = dist_since_log // time_since_log
            time_walk_str_hms = time.strftime("%H:%M:%S", time.gmtime(move_rate_sec))
            _l.info("Bot %s is at %s with hunger %s and health %s. New estimated walk time %s", self.bot.username, current_coordinate, self.bot.hunger, self.bot.health, time_walk_str_hms)
            self._last_log_coor = vec3_current
            self._last_log_time = time.time()
