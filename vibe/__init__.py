__version__ = "0.0.0"

import logging
logging.getLogger("vibe").addHandler(logging.NullHandler())
from vibe.loggercfg import Loggers
loggers = Loggers()
del Loggers
del logging