import asyncio
import tornado.web



class MainHandler(tornado.web.RequestHandler):
    async def get(self):
        self.write('Hello world')



def main():
    import argparse
    parser = argparse.ArgumentParser(description='Orb-it server')
    parser.add_argument('-p', '--port', type=int, default=80, help='server port')

    app = tornado.web.Application([
        (r'/', MainHandler),
    ])
    app.listen(args.port)
    asyncio.get_event_loop().run_forever()

if __name__ == '__main__':
    main()
