import asyncio
from functools import wraps
import logging
import os
import time

import jwt
import tornado.web


class Auth:
    def __init__(self, secret, issuer='Orbit', aud='Orbit'):
        self.secret = secret
        self.issuer = issuer
        self.aud = aud

    def create_token(self, sub):
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
        return jwt.encode(payload, self.secret, algorithm='HS512')

    def validate(self, token):
        return jwt.decode(token, self.secret, issuer=self.issuer, algorithms=['HS512'], audience=[self.aud])


class MainHandler(tornado.web.RequestHandler):
    def initialize(self, auth):
        self.auth = auth

    async def get(self):
        self.write('Hello world\n')
        self.write('Token: '+self.auth.create_token('user'))

def authenticated(method):
    @wraps(method)
    async def wrapper(self, *args, **kwargs):
        if not self.current_user:
            raise tornado.web.HTTPError(403, reason="authentication failed")
        return await method(self, *args, **kwargs)
    return wrapper

class APIHandler(tornado.web.RequestHandler):
    def initialize(self, auth):
        self.auth = auth

    def write_error(self, status_code=500, **kwargs):
        """Write out custom error json."""
        data = {
            'code': status_code,
            'error': self._reason,
        }
        self.write(data)
        self.finish()

    def get_current_user(self):
        try:
            type,token = self.request.headers['Authorization'].split(' ', 1)
            if type.lower() != 'bearer':
                raise Exception('bad header type')
            logging.debug('token: %r', token)
            data = self.auth.validate(token)
            self.auth_data = data
            self.auth_key = token
            return data['sub']
        except Exception:
            if self.debug and 'Authorization' in self.request.headers:
                logging.info('Authorization: %r', self.request.headers['Authorization'])
            logging.info('failed auth', exc_info=True)
        return None

    @authenticated
    async def get(self):
        self.write('Hello world')


def getconf():
    return {
        'port': int(os.environ.get('PORT', '80')),
        'secret': os.environ.get('SECRET', 'secret'),
    }

def main():
    conf = getconf()

    kwargs = {
        'auth': Auth(conf['secret']),
    }

    app = tornado.web.Application([
        (r'/', MainHandler, kwargs),
    ])
    app.listen(conf['port'], xheaders=True)
    asyncio.get_event_loop().run_forever()

if __name__ == '__main__':
    main()
