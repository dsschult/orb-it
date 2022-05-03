import asyncio
import os
import motor.motor_asyncio
import pytest

from orbit import data
from testdata import data_test
from testdata import process as process_testdata

@pytest.fixture
async def load_testdata():
    await process_testdata(data_test.players, data_test.rounds)

@pytest.fixture
async def db():
    mongodb_url = os.environ.get('MONGODB_URL', 'localhost/orbit')
    db_url, db_name = mongodb_url.rsplit('/', 1)
    return motor.motor_asyncio.AsyncIOMotorClient(db_url)[db_name]

async def test_get_players(db, load_testdata):
    player_obj = data.Player(db)

    ret = await player_obj.get_players()
    assert any(p['name'] == 'Player1' for p in ret.values())


async def test_new_player(db):
    player_obj = data.Player(db)

    await player_obj.new_player('foo')
    ret = await player_obj.get_players()
    assert any(p['name'] == 'foo' for p in ret.values())

    await player_obj.new_player('bar', hcp=12, tee='short')
    ret = await player_obj.get_players()
    assert any(p['name'] == 'bar' and p['current_hcp'] == 12 and p['tee'] == 'short' for p in ret.values())

async def test_update_player(db, load_testdata):
    player_obj = data.Player(db)
    
    ret = await player_obj.get_players()
    uuid = list(ret.keys())[0]

    await player_obj.update_player(uuid, hcp=50, tee='short')
    ret = await player_obj.get_players()

    assert ret[uuid]['current_hcp'] == 50
    assert ret[uuid]['tee'] == 'short'

async def test_get_course_list(db):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.get_course_list()

    assert isinstance(ret, list)
    assert 'Default' in ret

async def test_get_course_details(db):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.get_course_details('Default')

    assert isinstance(ret, dict)
    assert 'holes' in ret
    holes = ret['holes']
    assert len(holes) == 9
    assert 'par' in holes[0]
    assert 'hcp' in holes[0]
    assert 'yardages' in holes[0]

async def test_new_round(db):
    scorecard = data.ScoreCard(db)

    uuid = await scorecard.new_round('s', '2002-01-03', 'Default')

    ret = await scorecard.get_round(uuid)
    assert uuid in ret
    assert ret[uuid]['season'] == 's'
    assert ret[uuid]['date'] == '2002-01-03'
    assert ret[uuid]['course'] == 'Default'

async def test_list_seasons(db, load_testdata):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.list_seasons()

    assert ret == ['2021', '2022']

async def test_find_rounds(db, load_testdata):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.find_rounds(season='2021')
    assert len(ret) == 2

    ret = await scorecard.find_rounds(date='2021-01-01')
    assert len(ret) == 1
    assert list(ret.values())[0]['course'] == 'Yahara East (front)'

    ret = await scorecard.find_rounds(season='2021', course='Default')
    assert len(ret) == 1
    assert list(ret.values())[0]['date'] == '2021-01-02T01:01'

async def test_update_round_add_player(db, load_testdata):
    player_obj = data.Player(db)
    scorecard = data.ScoreCard(db)

    ret = await scorecard.find_rounds(date='2021-01-01')
    uuid = list(ret.keys())[0]

    player_uuid = await player_obj.new_player('foo', hcp=12, tee='short')
    ret = await scorecard.update_round_add_player(uuid, player_uuid, 14)

    assert uuid in ret
    assert player_uuid in ret[uuid]['players']
    assert ret[uuid]['players'][player_uuid]['hcp'] == 14

async def test_update_round_set_strokes(db, load_testdata):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.find_rounds(date='2021-01-01')
    uuid = list(ret.keys())[0]

    player_uuid = list(ret[uuid]['players'].keys())[0]

    strokes = [1,2,3,4,5,6,7,8,9]
    ret = await scorecard.update_round_set_strokes(uuid, player_uuid, strokes)

    assert uuid in ret
    assert player_uuid in ret[uuid]['players']
    assert ret[uuid]['players'][player_uuid]['strokes'] == strokes

async def test_update_round_set_points(db, load_testdata):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.find_rounds(date='2021-01-01')
    uuid = list(ret.keys())[0]

    player_uuid = list(ret[uuid]['players'].keys())[0]

    points = {'net': 4, 'match': 6}
    ret = await scorecard.update_round_set_points(uuid, player_uuid, points)

    assert uuid in ret
    assert player_uuid in ret[uuid]['players']
    assert ret[uuid]['players'][player_uuid]['points'] == points

async def test_update_round_all(db, load_testdata):
    scorecard = data.ScoreCard(db)

    ret = await scorecard.find_rounds(date='2021-01-01')
    uuid = list(ret.keys())[0]

    ret = await scorecard.update_round_all(uuid, date='2021-01-05')
    assert uuid in ret
    assert ret[uuid]['date'] == '2021-01-05'

    ret = await scorecard.update_round_all(uuid, course='Default')
    assert uuid in ret
    assert ret[uuid]['course'] == 'Default'

    player_uuids = list(ret[uuid]['players'].keys())[:2]
    players = {k:v for k,v in ret[uuid]['players'].items() if k in player_uuids}
    matchups = ret[uuid]['matchups'][:1]
    ret = await scorecard.update_round_all(uuid, players=players, matchups=matchups)
    assert uuid in ret
    assert ret[uuid]['players'] == players
    assert ret[uuid]['matchups'] == matchups

async def test_score_round(db, load_testdata):
    player_obj = data.Player(db)
    scorecard = data.ScoreCard(db)

    players = await player_obj.get_players()
    player_uuid = [k for k,v in players.items() if v['name'] == 'Player1'][0]

    ret = await scorecard.find_rounds(date='2022-01-10')
    uuid = list(ret.keys())[0]

    strokes = [4,6,4,5,6,4,5,4,5]
    await scorecard.update_round_set_strokes(uuid, player_uuid, strokes)

    ret = await scorecard.score_round(uuid, player_data=players)
    assert ret == True
    
    ret = await scorecard.get_round(uuid)
    points = {'net': 4, 'match': 6.5}
    assert ret[uuid]['players'][player_uuid]['points'] == points
