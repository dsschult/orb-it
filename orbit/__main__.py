import os
import logging

from .server import main

# handle logging
setlevel = {
    'CRITICAL': logging.CRITICAL,  # execution cannot continue
    'FATAL': logging.CRITICAL,
    'ERROR': logging.ERROR,  # something is wrong, but try to continue
    'WARNING': logging.WARNING,  # non-ideal behavior, important event
    'WARN': logging.WARNING,
    'INFO': logging.INFO,  # initial debug information
    'DEBUG': logging.DEBUG  # the things no one wants to see
}

level = os.environ.get('LOG_LEVEL', 'info').upper()
if level not in setlevel:
    raise Exception('LOG_LEVEL is not a proper log level')
logformat = '%(asctime)s %(levelname)s %(name)s %(module)s:%(lineno)s - %(message)s'

logging.basicConfig(format=logformat, level=setlevel[level])

main()
