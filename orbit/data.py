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

    async def new_player(self, name, hcp=None, tee='std'):
        await self.db.players.insert_one({
            "uuid": gen_uuid(),
            "name": name,
            "current_hcp": hcp if hcp else -1,
            "tee": tee,
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
                        if 'short_hcp' in hole:
                            assert isinstance(hole['short_hcp'], int)
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
            'players': {},
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

    async def update_round_set_points(self, uuid, player_uuid, points):
        assert 'match' in points
        assert 'net' in points

        field = f'players.{player_uuid}.points'
        update = {
            '$set': {field: points}
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

    async def score_round(self, uuid, player_data={}):
        round_data = await self.db.rounds.find_one({'uuid': uuid})
        course_details = await self.get_course_details(round_data['course'])

        all_strokes_in = True
        for player_uuid in round_data['players']:
            player = round_data['players'][player_uuid]
            strokes = player['strokes']
            if len(strokes) != len(course_details):
                all_strokes_in = False
                break

        if all_strokes_in:
            logging.info(f'now scoring round {uuid}')
            #### rules
            # holes worth 1pt
            # ties are .5pt
            # low net is 4pts
            # total pts wins match
            player_points = {player_uuid: {'match': 0, 'net': 0} for player_uuid in round_data['players']}
            
            for player_uuids in round_data['matchups']:
                player_names = {player_uuid: player_data[player_uuid]['name'] for player_uuid in player_uuids}
                logging.debug('scoring matchup: %r', player_names)

                # rank holes by hcp
                course_hcp_key = 'short_hcp' if any(player_data[player_uuid]['tee'] == 'short' for player_uuid in player_uuids) else 'hcp'
                sorted_holes = sorted(course_details, key=lambda hole: hole[course_hcp_key])
                logging.debug('sorted holes: %r', sorted_holes)

                # adjust the hcps according to match play rules
                hcps = {player_uuid: round(round_data['players'][player_uuid]['hcp']*len(sorted_holes)/18) for player_uuid in player_uuids}
                min_hcp = min(hcps.values())
                adjusted_hcps = {player_uuid: hcps[player_uuid]-min_hcp for player_uuid in hcps}
                logging.debug('hcps: %r', hcps)
                logging.debug('min_hcp: %d', min_hcp)
                logging.debug('adjusted hcps: %r', adjusted_hcps)

                # apply hcps to holes in the match
                hcp_strokes = {player_uuid: round_data['players'][player_uuid]['strokes'].copy() for player_uuid in player_uuids}
                logging.debug('strokes: %r', hcp_strokes)
                sorted_hole_index = 0
                while any(v>0 for v in adjusted_hcps.values()):
                    hole_index = sorted_holes[sorted_hole_index]['num']-1
                    for player_uuid in adjusted_hcps:
                        if adjusted_hcps[player_uuid] > 0:
                            adjusted_hcps[player_uuid] -= 1
                            if hcp_strokes[player_uuid][hole_index] > 1: # min 1 shot
                                hcp_strokes[player_uuid][hole_index] -= 1

                    sorted_hole_index += 1
                    if sorted_hole_index >= len(sorted_holes):
                        sorted_hole_index = 0
                logging.debug('adj hcp strokes: %r', hcp_strokes)

                # now determine hole winners
                for hole_index in range(len(sorted_holes)):
                    min_hcp_strokes = min(hcp_strokes[player_uuid][hole_index] for player_uuid in player_uuids)
                    hole_winners = [player_uuid for player_uuid in player_uuids if hcp_strokes[player_uuid][hole_index] == min_hcp_strokes]
                    logging.debug('hole %d winners: %r', hole_index+1, hole_winners)
                    for player_uuid in hole_winners:
                        player_points[player_uuid]['match'] += 1./len(hole_winners)

                # find low net winners
                net_strokes = {player_uuid: 0 for player_uuid in player_uuids}
                for player_uuid in player_uuids:
                    strokes = sum(round_data['players'][player_uuid]['strokes'])
                    net_strokes[player_uuid] = strokes - hcps[player_uuid]
                logging.debug('net strokes: %r', net_strokes)
                min_strokes = min(net_strokes[player_uuid] for player_uuid in player_uuids)
                low_net_winners = [player_uuid for player_uuid in player_uuids if net_strokes[player_uuid] == min_strokes]
                logging.debug('low net winners: %r', low_net_winners)
                for player_uuid in low_net_winners:
                    player_points[player_uuid]['net'] = 4./len(low_net_winners)

            # update round
            for player_uuid in player_points:
                await self.update_round_set_points(uuid, player_uuid, player_points[player_uuid])
