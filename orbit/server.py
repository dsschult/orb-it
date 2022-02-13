import asyncio
import binascii
import base64
from functools import wraps
import logging
import os
import time

import jwt
import tornado.web
import tornado.websocket
import tornado.escape
import tornado.httpclient
import motor.motor_asyncio

from . import data

class Auth:
    def __init__(self, secret, issuer='Orbit', aud='Orbit'):
        self.secret = secret
        self.issuer = issuer
        self.aud = aud

    def create_token(self, sub, data=None):
        now = time.time()
        payload = {
            'iss': self.issuer,
            'aud': self.aud,
            'sub': sub,
            'exp': now+3600*24*365,
            'nbf': now,
            'iat': now,
            'type': 'user',
        }
        if data:
            payload.update(data)
        return jwt.encode(payload, self.secret, algorithm='HS512')

    def validate(self, token):
        return jwt.decode(token, self.secret, issuer=self.issuer, algorithms=['HS512'], audience=[self.aud])

def basic_auth(method):
    @wraps(method)
    async def wrapper(self, *args, **kwargs):
        if not self.current_user:
            header = self.request.headers.get('Authorization')
            if header is None or not header.lower().startswith('basic '):
                self.set_header('WWW-Authenticate', 'Basic realm=Orb-It')
                self.set_status(401)
                self.finish()
                return
            raise HTTPError(403, reason="authentication failed")
        return await method(self, *args, **kwargs)
    return wrapper

def catch_error(method):
    """Decorator to catch and handle errors on handlers.
    All failures caught here
    """
    @wraps(method)
    async def wrapper(self, *args, **kwargs):
        try:
            return await method(self, *args, **kwargs)
        except tornado.web.HTTPError:
            raise # tornado can handle this
        except tornado.httpclient.HTTPError:
            raise # tornado can handle this
        except Exception as e:
            logging.warning('Error in website handler', exc_info=True)
            message = 'Error in '+self.__class__.__name__
            self.send_error(500, reason=message)
    return wrapper

class MainHandler(tornado.web.RequestHandler):
    def initialize(self, auth, basic_auth, websocket_address, debug, **kwargs):
        self.auth = auth
        self.basic_auth = basic_auth
        self.websocket_address = websocket_address
        self.debug = debug

    def get_current_user(self):
        """basic auth"""
        try:
            type, data = self.request.headers['Authorization'].split(' ', 1)
            if type.lower() != 'basic':
                raise Exception('bad header type')
            logging.debug(f'auth data: {data}')
            auth_decoded = base64.b64decode(data).decode('ascii')
            username, password = str(auth_decoded).split(':', 1)
            if self.basic_auth.get(username, None) == password:
                # set WS token
                if not self.get_secure_cookie('token'):
                    self.set_secure_cookie('token', self.auth.create_token(username))
                return username
        except Exception:
            if self.debug and 'Authorization' in self.request.headers:
                logging.info('Authorization: %r', self.request.headers['Authorization'])
            logging.info('failed auth', exc_info=True)
        return None

    @catch_error
    @basic_auth
    async def get(self, path):
        kwargs = {
            'websocket_address': self.websocket_address,
        }
        self.render("main.html", **kwargs)


class WSHandler(tornado.websocket.WebSocketHandler):
    def initialize(self, auth, livescores, **kwargs):
        self.auth = auth
        self.auth_data = None
        self.auth_key = None
        self.livescores = livescores

    def write_error(self, status_code=500, **kwargs):
        """Write out custom error json."""
        data = {
            'code': status_code,
            'error': self._reason,
        }
        self.write(data)
        self.finish()

    def open(self):
        try:
            token = self.get_secure_cookie("token")
            data = self.auth.validate(token)
            self.auth_data = data
            self.auth_key = token
        except Exception:
            logging.info('failed auth', exc_info=True)
            self.close()

        self.livescores.register(self.auth_key, {
            'call': self.write_message,
            'auth_data': self.auth_data,
        })

    async def on_message(self, message):
        await self.livescores.process(message, self.write_message)

    def on_close(self):
        if self.auth_key:
            self.livescores.deregister(self.auth_key)

class LiveScores:
    def __init__(self, scorecards=None, players=None, *args, **kwargs):
        self.connections = {}
        self.scorecards = scorecards
        self.players = players

    def register(self, key, data):
        self.connections[key] = data

    def deregister(self, key):
        if key in self.connections:
            del self.connections[key]

    def send_all(self, message):
        for con in self.connections.values():
            con['call'](message)

    async def process(self, message, writer):
        logging.debug(f'process message: {message}')
        # decode message
        data = tornado.escape.json_decode(message)
        update = None
        update_all = None

        assert 'fn' in data
        if data['fn'] == 'echo':
            update = data
        elif data['fn'] == 'get_players':
            ret = await self.players.get_players()
            update = {
                'fn': 'get_players',
                'data': ret,
            }
        elif data['fn'] == 'get_course_list':
            ret = await self.scorecards.get_course_list()
            update = {
                'fn': 'get_course_list',
                'data': ret,
            }
        elif data['fn'] == 'get_course_details':
            assert 'course' in data
            ret = await self.scorecards.get_course_details(data['course'])
            update = {
                'fn': 'get_course_details',
                'course': data['course'],
                'data': ret,
            }
        elif data['fn'] == 'get_seasons':
            ret = await self.scorecards.list_seasons()
            update = {
                'fn': 'get_seasons',
                'data': ret,
            }
        elif data['fn'] == 'get_rounds':
            kwargs = {}
            if 'season' in data:
                kwargs['season'] = data['season']
            if 'date' in data:
                kwargs['date'] = data['date']
            if 'course' in data:
                kwargs['course'] = data['course']
            ret = await self.scorecards.find_rounds(**kwargs)
            update = {
                'fn': 'get_rounds',
                'data': ret,
            }
        elif data['fn'] == 'new_round':
            assert 'season' in data
            assert 'date' in data
            assert 'course' in data
            await self.scorecards.new_round(season=data['season'], date=data['date'], course=data['course'])
            ret = await self.scorecards.find_rounds(season=data['season'], date=data['date'], course=data['course'])
            update_all = {
                'fn': 'new_round',
                'data': ret,
            }

        if update:
            writer(tornado.escape.json_encode(update))
        elif update_all:
            self.send_all(tornado.escape.json_encode(update))

def getconf():
    port = int(os.environ.get('PORT', '80'))
    return {
        'port': port,
        'cookie_secret': binascii.hexlify(os.environ.get('COOKIE_SECRET', 'secret').encode('utf-8')).decode('utf-8'),
        'auth_secret': os.environ.get('AUTH_SECRET', 'secret'),
        'basic_auth': os.environ.get('BASIC_AUTH', 'orbit:golf'),
        'mongodb_url': os.environ.get('MONGODB_URL', 'localhost/orbit'),
        'websocket_address': os.environ.get('WEBSOCKET_ADDRESS', f'ws://localhost:{port}'),
        'debug': os.environ.get('DEBUG', 'false').lower() in ('true','t','yes','y','1'),
    }

def main():
    config = getconf()

    users = {v.split(':')[0]: v.split(':')[1] for v in config['basic_auth'].split(',') if v}
    logging.info(f'BASIC_AUTH users: {list(users.keys())}')

    logging.info(f'DB: {config["mongodb_url"]}')
    db_url, db_name = config['mongodb_url'].rsplit('/', 1)
    db = motor.motor_asyncio.AsyncIOMotorClient(db_url)
    logging.info(f'DB name: {db_name}')
    mongodb = db[db_name]

    players = data.Player(mongodb)
    scorecards = data.ScoreCard(mongodb)

    livescores = LiveScores(players=players, scorecards=scorecards)

    kwargs = {
        'auth': Auth(config['auth_secret']),
        'basic_auth': users,
        'websocket_address': config['websocket_address'],
        'livescores': livescores,
        'debug': config['debug'],
    }

    static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
    template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

    app = tornado.web.Application([
            (r'/websocket', WSHandler, kwargs),
            (r'/(.*)', MainHandler, kwargs),
        ],
        static_path=static_path, template_path=template_path,
        cookie_secret=config['cookie_secret'], xsrf_cookies=True,
        debug=config['debug']
    )
    app.listen(config['port'], xheaders=True)
    asyncio.get_event_loop().run_forever()

if __name__ == '__main__':
    main()