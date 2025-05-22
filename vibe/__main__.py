import argparse
import time
from time import sleep

import vibe
from vibe import DEBUG
from vibe.bot import Bot

# set the logging to debug for all vibe modules
import logging
if DEBUG:
    logging.getLogger("vibe").setLevel(logging.DEBUG)
else:
    logging.getLogger("vibe").setLevel(logging.INFO)

_l = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="VIBE CLI")
    parser.add_argument(
        "--version",
        action="version",
        version=f"VIBE {vibe.__version__}",
        help="Show the version of VIBE",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="localhost",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=25565,
    )
    parser.add_argument(
        "--username",
        type=str,
        default="vibe_bot",
    )
    parser.add_argument(
        "--mc-version",
        type=str,
        default="1.21.1",
        help="Minecraft version to use. Note: this must be 1.20 in 2b2t.",
    )
    parser.add_argument(
        "--no-auth",
        action="store_true",
        help="Disable authentication",
        default=False,
    )
    parser.add_argument(
        "--nether-strategy",
        type=str,
        help="Use nether strategy. Takes a coordinate in the format x,z",
        default=None,
    )
    parser.add_argument(
        "--no-view",
        action="store_true",
        help="Disable web viewer",
        default=False,
    )

    args = parser.parse_args()
    # Create a bot instance
    bot = Bot(host=args.host, port=args.port, username=args.username, mc_version=args.mc_version, no_auth=args.no_auth, viewer=not args.no_view)
    bot.connect()
    time.sleep(2)
    if args.nether_strategy:
        # Parse the coordinate
        try:
            x, z = map(int, args.nether_strategy.split(","))
        except ValueError:
            print("Invalid coordinate format. Use x,z")
            return

        _l.info("Starting nether strategy for target %s", (x, z))
        bot.do_nether_strategy((x, 120, z))
    else:
        import IPython; IPython.embed()


if __name__ == "__main__":
    main()