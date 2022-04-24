import os
import logging
import motor.motor_asyncio
from orbit.data import Player, ScoreCard

def get_db():
    mongodb_url = os.environ.get('MONGODB_URL', 'localhost/orbit')
    logging.info(f'DB: {mongodb_url}')
    db_url, db_name = mongodb_url.rsplit('/', 1)
    db = motor.motor_asyncio.AsyncIOMotorClient(db_url)
    logging.info(f'DB name: {db_name}')
    mongodb = db[db_name]
    return mongodb

async def clear_db(mongodb):
    await mongodb.players.delete_many({})
    await mongodb.rounds.delete_many({})

async def process(players, rounds):
    logging.basicConfig(level=logging.DEBUG)
    mongodb = get_db()
    await clear_db(mongodb)

    pl = Player(mongodb)
    for player, values in players.items():
        logging.info(f'importing player {player}')
        await pl.new_player(player, **values)
    player_data = await pl.get_players()
    player_uuids = {}
    for uuid, player in player_data.items():
        player_uuids[player['name']] = uuid

    sc = ScoreCard(mongodb)
    for round in rounds:
        logging.info(f'importing round {round["season"]} {round["date"]} {round["course"]}')
        uuid = await sc.new_round(round['season'], round['date'], round['course'])
        matchups = [(player_uuids[a], player_uuids[b]) for a,b in round['matchups']]
        scores = {player_uuids[name]: {'hcp': players[name]['hcp'], 'strokes': value} for name,value in round['players'].items()}
        await sc.update_round_all(uuid, players=scores, matchups=matchups)
        await sc.score_round(uuid, player_data=player_data)
