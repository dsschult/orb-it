import logging
import os
from uuid import uuid4
import yaml
from pymongo import ReturnDocument


def gen_uuid():
    return str(uuid4())

class _Base:
    def __init__(self, mongodb):
        self.db = mongodb

class Player(_Base):
    """Defining a player"""
    async def indexes(self):
        pass

    async def new_player(self, name, hcp=None):
        await self.db.players.insert_one({
            "uuid": gen_uuid(),
            "name": name,
            "current_hcp": hcp if hcp else -1,
        })

    async def get_players(self):
        ret = {}
        async for row in self.db.players.find({}, {'_id': False}):
            ret[row['uuid']] = row
        return ret


class ScoreCard(_Base):
    """A scorecard for a single round at a course"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.load_courses()

    def load_courses(self):
        course_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'courses')
        self.courses = {}
        for filename in os.listdir(course_dir):
            with open(os.path.join(course_dir, filename)) as f:
                for data in yaml.safe_load_all(f):
                    # do some validation
                    name = data['name']
                    assert name not in self.courses
                    logging.debug(f'loading course "{name}"')
                    holes = data['holes']
                    for i,hole in enumerate(holes):
                        assert 'par' in hole
                        assert isinstance(hole['par'], int)
                        assert 'hcp' in hole
                        assert isinstance(hole['hcp'], int)
                        if 'yardages' in hole:
                            assert isinstance(hole['yardages'], dict)
                            for n,yards in hole['yardages'].items():
                                assert isinstance(yards, int)
                        hole['num'] = i+1
                    # add to course list
                    self.courses[name] = holes

    async def get_course_list(self):
        return list(self.courses.keys())

    async def get_course_details(self, course):
        assert course in self.courses
        return self.courses[course]

    async def new_round(self, season, date, course):
        """Add a round to the DB"""
        assert isinstance(season, str)
        assert isinstance(date, str)
        assert course in self.courses
        uuid = gen_uuid()
        await self.db.rounds.insert_one({
            'uuid': uuid,
            'season': season,
            'date': date,
            'course': course,
            'players': [],
            'matchups': []
        })
        return uuid

    async def list_seasons(self):
        pipeline = [
            {'$group': {"_id": '$season'}},
        ]
        ret = []
        async for row in self.db.rounds.aggregate(pipeline):
            ret.append(row['_id'])
        return ret

    async def find_rounds(self, season=None, date=None, course=None):
        filter = {}
        if season:
            filter['season'] = season
        if date:
            filter['date'] = date
        if course:
            filter['course'] = course

        ret = {}
        async for row in self.db.rounds.find(filter, {'_id': False}):
            ret[row['uuid']] = row
        return ret

    async def update_round_add_player(self, uuid, player_uuid, player_hcp):
        round = await self.db.rounds.find_one({'uuid': uuid})
        round_details = await self.get_course_details(round['course'])

        field = f'players.{uuid}'
        update = {
            '$set': {field: {'hcp': player_hcp, 'strokes': [0 for _ in round_details['holes']]}}
        }
        ret = await self.db.rounds.find_one_and_update({'uuid': uuid}, update, projection={'_id': False},
                                                       return_document=ReturnDocument.AFTER)
        return {uuid: ret}

    async def update_round_set_strokes(self, uuid, player_uuid, strokes):
        round = await self.db.rounds.find_one({'uuid': uuid})
        round_details = await self.get_course_details(round['course'])
        assert len(strokes) == len(round_details)
        for s in strokes:
            assert isinstance(s, int)
            assert 0 <= s < 100

        field = f'players.{player_uuid}.strokes'
        update = {
            '$set': {field: strokes}
        }
        ret = await self.db.rounds.find_one_and_update({'uuid': uuid}, update, projection={'_id': False},
                                                       return_document=ReturnDocument.AFTER)
        return {uuid: ret}

    async def update_round_all(self, uuid, players=None, matchups=None):
        round = await self.db.rounds.find_one({'uuid': uuid})
        round_details = await self.get_course_details(round['course'])
        update = {}
        if players:
            for player in players.values():
                assert len(player['strokes']) == len(round_details)
            update['players'] = players
        if matchups:
            update['matchups'] = matchups
        await self.db.rounds.update_one({'uuid': uuid}, {'$set': update})

    #### rules
    # holes worth 1pt
    # ties are .5pt
    # low net is 4pts
    # total pts wins match

