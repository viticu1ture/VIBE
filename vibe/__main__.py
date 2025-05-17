import argparse
import time
from time import sleep

import vibe
from vibe.bot import Bot

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
    )

    args = parser.parse_args()
    # Create a bot instance
    bot = Bot(host=args.host, port=args.port, username=args.username, mc_version=args.mc_version)
    bot.connect()
    time.sleep(1)
    import IPython; IPython.embed()


if __name__ == "__main__":
    main()