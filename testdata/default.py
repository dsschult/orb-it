import asyncio
from . import process

players = {
  'Player1': {
    'hcp': 10*2,
    'tee': 'std',
  },
  'Player2': {
    'hcp': 12*2,
    'tee': 'std',
  },
  'Player3': {
    'hcp': 16*2,
    'tee': 'short',
  },
  'Player4': {
    'hcp': 20*2,
    'tee': 'std',
  },
}

rounds = [
    {
        'season': '2021',
        'date': '2021-01-01',
        'course': 'Yahara East (front)',
        'players': {
            'Player1': [4,6,4,5,6,4,5,4,5],
            'Player2': [6,6,4,6,6,6,6,6,5],
            'Player3': [8,9,5,7,7,9,6,5,7],
            'Player4': [6,8,4,7,8,7,6,5,6],
        },
        'matchups': [
            ('Player1', 'Player2'),
            ('Player3', 'Player4'),
        ]
    }
]

asyncio.run(process(players, rounds))
