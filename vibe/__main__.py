import argparse
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

    args = parser.parse_args()
    # Create a bot instance
    bot = Bot(host=args.host, port=args.port, username=args.username)
    bot.connect()
    sleep(10000)


if __name__ == "__main__":
    main()