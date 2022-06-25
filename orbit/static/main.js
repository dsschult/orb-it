var debug = false
var logger = function(...args) {
  if (debug) {
    console.log(...args)
  }
}

const Home = {
  data: function(){
    return {
    }
  },
  props: ['data'],
  created: function() {
    this.fetchData()
  },
  watch: {
    '$route': 'fetchData'
  },
  methods: {
    fetchData: function() {
      console.log('fetchData()')
      this.data.send_msg({fn: 'get_rounds'})
    }
  },
  computed: {
    next_round: function() {
      let ret = {date: '', season: '', name: '', uuid: ''}
      const today = new Date().toISOString()
      for (const r in this.data.rounds) {
        const round = this.data.rounds[r];
        console.log('next_round', round)
        if (round.date > today && (ret.date == '' || ret.date > round.date)) {
          ret = Object.assign(ret, round)
        }
      }
      return ret
    },
    seasons: function() {
      let ret = ''
      for (const s of this.data.seasons) {
        ret += s+' '
      }
      return ret
    },
    rounds: function() {
      let ret = ''
      for (const r in this.data.rounds) {
        const round = this.data.rounds[r];
        ret += round.date+' '+round.course+' '
      }
      return ret
    }
  },
  template: `
<article class="home">
  <h2>Home</h2>
  <div class="indent next_round">
    <h4>Next round:</h4>
    <div class="season">Season: {{ next_round.season }}</div>
    <div class="date">Date: <router-link :to="{ name: 'rounds', query: { season: next_round.season, round: next_round.uuid }}">{{ next_round.date.split('T')[0] }}</router-link></div>
    <div class="course">Course: {{ next_round.course }}</div>
  </div>
</article>`
}

const Rounds = {
  data: function(){
    return {
      'season': '',
      'round': '',
      'updateTimeout': null,
      'lastUpdate': 0,
    }
  },
  props: ['data'],
  created: function() {
    // get all rounds once
    this.data.send_msg({fn: 'get_rounds'})
    this.fetchData()
    // periodically update selected round
    document.addEventListener('visibilitychange', this.visibilitychange)
    this.updateTimeout = setTimeout(() => this.timerfire(), 5000)
  },
  destroyed: function() {
    document.removeEventListener('visibilitychange', this.visibilitychange)
    clearTimeout(this.updateTimeout)
  },
  watch: {
    '$route': 'fetchData',
    'season': 'updateHistory',
    'round': 'updateHistory',
  },
  methods: {
    visibilitychange: function() {
      console.log('visibility change', document.hidden)
      if (!document.hidden) {
        this.fetchData()
      }
    },
    timerfire: function() {
      if ((!document.hidden) && Date.now() - this.lastUpdate > 60000) {
        this.fetchData()
      }
      clearTimeout(this.updateTimeout)
      this.updateTimeout = setTimeout(() => this.timerfire(), 5000)
    },
    fetchData: function() {
      console.log('fetchData()')
      this.lastUpdate = Date.now()
      if (this.$route.query.season) {
        this.season = this.$route.query.season
      }
      if (this.$route.query.round) {
        this.round = this.$route.query.round
      }
      let args = {fn: 'get_rounds'}
      if (this.round != '') {
        args = {fn: 'get_round', round: this.round}
      } else if (this.season != '') {
        args['season'] = this.season
      }
      this.data.send_msg(args)
    },
    updateHistory() {
      if (this.season && this.round) {
        if (this.$route.query.season != this.season || this.$route.query.round != this.round) {
          this.$router.push({ path: '/rounds', query: { season: this.season, round: this.round } })
        }
      }
    }
  },
  computed: {
    seasons: function() {
      return this.data.seasons;
    },
    rounds: function() {
      let ret = {};
      for (const r in this.data.rounds) {
        const round = this.data.rounds[r];
        if (round.season == this.season) {
          ret[round.uuid] = round.date.split('T')[0]+' '+round.course;
        }
      }
      return ret
    },
    round_info: function() {
      if (this.round in this.data.rounds) {
        return this.data.rounds[this.round]
      }
      return {}
    },
    course_name: function() {
      if (this.round in this.data.rounds) {
        return this.data.rounds[this.round].course;
      }
      return ''
    },
    course_info: function() {
      if (this.round in this.data.rounds) {
        const r = this.data.rounds[this.round]
        if (r.course in this.data.courses && this.data.courses[r.course].holes.length) {
          return this.data.courses[r.course].holes
        } else {
          this.data.send_msg({fn: 'get_course_details', course: r.course})
        }
      }
      return []
    }
  },
  template: `
<article class="rounds">
  <div class="selection">
    <select v-model="season" data-test="select-season">
      <option disabled value="">Select a season</option>
      <option v-for="s in seasons">{{ s }}<option>
    </select>
    <select v-model="round" data-test="select-round">
      <option disabled value="">Select a round</option>
      <option v-for="(r,uuid) in rounds" v-bind:value="uuid">{{ r }}<option>
    </select>
  </div>
  <div v-if="round">
    <div v-if="round_info && course_info.length">
      <scorecard :round="round_info" :course_name="course_name" :course="course_info" :data="data"></scorecard>
      <div class="matchups">
        <matchup v-for="match in round_info['matchups']" :round="round_info" :matchup="match" :course="course_info" :data="data"></matchup>
      </div>
    </div>
    <div v-else>Loading...</div>
  </div>
  <div v-else data-test="select-season-round">Select season and round</div>
</article>`
}

const Seasons = {
  data: function(){
    return {
      'season': ''
    }
  },
  props: ['data'],
  created: function() {
    this.fetchData()
  },
  watch: {
    '$route': 'fetchData',
    'season': 'updateHistory',
    'seasons': 'seasonsIsUpdated',
  },
  methods: {
    fetchData: function() {
      console.log('fetchData()')
      this.data.send_msg({fn: 'get_rounds'})
      if (this.$route.query.season) {
        this.season = this.$route.query.season
      }
    },
    seasonsIsUpdated: function() {
      if (!(this.season)) {
        for (const s of this.seasons) {
          this.season = s
          break
        }
      }
    },
    updateHistory() {
      if (this.season) {
        if (this.$route.query.season != this.season) {
          this.$router.push({ path: '/seasons', query: { season: this.season } })
        }
      }
    },
    get_points(round, player_uuid) {
      let ret = '---'
      if (player_uuid in round.players) {
        const player_round = round.players[player_uuid]
        if ('points' in player_round) {
          const pts = player_round.points
          ret = pts.match + ' + ' + pts.net
        }
      }
      return ret
    },
    delete_round: function(uuid) {
      this.data.send_msg({fn: 'delete_round', round: uuid})
    }
  },
  computed: {
    seasons: function() {
      return this.data.seasons;
    },
    rounds: function() {
      let ret = {}
      for (const uuid in this.data.rounds) {
        const round = this.data.rounds[uuid]
        if (round.season == this.season) {
          ret[uuid] = round
        }
      }
      return ret
    },
    players: function() {
      let ret = {}
      for (const uuid in this.rounds) {
        for (const player_uuid in this.rounds[uuid].players) {
          if (!(player_uuid in ret)) {
            ret[player_uuid] = this.data.players[player_uuid]
          }
        }
      }
      return ret
    },
    player_scores: function() {
      let scores = {}
      for (const player_uuid in this.players) {
        let match = 0
        let net = 0
        for (const uuid in this.rounds) {
          const round = this.rounds[uuid]
          if (player_uuid in round.players) {
            const player_round = round.players[player_uuid]
            if ('points' in player_round) {
              const pts = player_round.points
              match += pts.match
              net += pts.net
            }
          }
        }
        scores[player_uuid] = {
          total: match + net,
          match: match,
          net: net
        }
      }
      logger('player_scores', scores)
      return scores
    },
    player_ordering: function() {
      const scores = this.player_scores
      return Object.keys(scores).sort(function(a,b){
        let ret = scores[b].total-scores[a].total
        if (ret == 0) {
          ret = scores[b].match-scores[a].match
        }
        return ret
      })
    }
  },
  template: `
<article class="seasons">
  <div class="selection">
    <select v-model="season" data-test="select-season">
      <option disabled value="">Select a season</option>
      <option v-for="s in seasons" >{{ s }}</option>
    </select>
  </div>
  <div v-if="season">
    <div class="round_cols" data-test="season">
      <div class="col">
        <div class="cell header"></div>
        <div class="cell" v-for="player_uuid in player_ordering" data-test="player-name">{{ players[player_uuid].name }}</div>
      </div>
      <div class="col" v-for="round, uuid in rounds" :data-test="round.date">
        <div class="cell header">
          <router-link :to="{ name: 'rounds', query: { season: season, round: uuid }}">
            <span class="name">{{ round.name }}</span>
            <span class="date">{{ round.date.split('T')[0] }}</span>
          </router-link>
          <router-link :to="{ name: 'edit_round', query: { round: uuid }}" class="edit-link"><span class="material-symbols-outlined">edit_note</span></router-link>
          <span class="material-symbols-outlined" @click="delete_round(uuid)">delete_forever</span>
        </div>
        <div class="cell" v-for="player_uuid in player_ordering">
          {{ get_points(round, player_uuid) }}
        </div>
      </div>
      <div class="col hcp">
        <div class="cell header">Current HCP</div>
        <div class="cell" v-for="player_uuid in player_ordering">
          {{ Math.round(data.players[player_uuid].current_hcp/2) }}
        </div>
      </div>
      <div class="col match">
        <div class="cell header">Match</div>
        <div class="cell" v-for="player_uuid in player_ordering">
          {{ player_scores[player_uuid].match }}
        </div>
      </div>
      <div class="col net">
        <div class="cell header">Net</div>
        <div class="cell" v-for="player_uuid in player_ordering">
          {{ player_scores[player_uuid].net }}
        </div>
      </div>
      <div class="col total">
        <div class="cell header">Total Points</div>
        <div class="cell" v-for="player_uuid in player_ordering">
          {{ player_scores[player_uuid].total }}
        </div>
      </div>
    </div>
    <new_round :season="season" :data="data" :courses="data.courses"></new_round>
  </div>
  <div v-else>Select season</div>
</article>`
}

const EditRound = {
  data: function(){
    return {
      'round_uuid': '',
      'round_date': '',
      'round_course': '',
      'round_players': [],
      'round_player_hcps': {},
      'round_matchups': [],
    }
  },
  props: ['data'],
  created: function() {
    this.fetchData()
  },
  watch: {
    '$route': 'fetchData',
    'round': function() {
      if (this.round_course == '') {
        logger('watch round', this.round)
        this.round_date = this.round.date
        this.round_course = this.round.course
        let player_uuids = []
        for (const uuid in this.round.players) {
          player_uuids.push(uuid)
        }
        this.round_players = player_uuids
        let player_hcps = {}
        for (const uuid of player_uuids) {
          player_hcps[uuid] = Math.round(this.round.players[uuid].hcp/2)
        }
        this.round_player_hcps = player_hcps
        let matchups = []
        for (const m of this.round.matchups) {
          matchups.push(m)
        }
        this.round_matchups = matchups
      }
    },
    'round_course': function() {
      if (!(this.round_course in this.data.courses && this.data.courses[this.round_course].holes.length > 0)) {
        this.data.send_msg({fn: 'get_course_details', course: this.round_course})
      }
    },
    'round_players': function() {
      logger('round_players', this.round_players)
      let player_hcps = {}
      for (const uuid of this.round_players) {
        if (uuid in this.round_player_hcps) {
          player_hcps[uuid] = this.round_player_hcps[uuid]
        } else if (uuid in this.round.players) {
          player_hcps[uuid] = Math.round(this.round.players[uuid].hcp/2)
        } else {
          player_hcps[uuid] = Math.round(this.data.players[uuid].current_hcp/2)
        }
      }
      this.round_player_hcps = player_hcps
    },
    'round_matchups': function() {
      logger('round_matchups', this.round_matchups)
    }
  },
  computed: {
    round: function() {
      logger('computed round()')
      for (const uuid in this.data.rounds) {
        if (uuid == this.round_uuid) {
          return this.data.rounds[uuid]
        }
      }
      logger('computed round() not found')
      return {}
    },
    players: function() {
      let ret = {}
      for (const player_uuid of this.round_players) {
        ret[player_uuid] = this.data.players[player_uuid]
      }
      return ret
    },
    available_matchup_players: function() {
      let existing_matchup_players = {}
      for (const m of this.round_matchups) {
        for (const u of m) {
          existing_matchup_players[u] = u
        }
      }
      let ret = []
      for (const player_uuid of this.round_players) {
        if (!(player_uuid in existing_matchup_players)) {
          ret.push(player_uuid)
        }
      }
      return ret
    }
  },
  methods: {
    fetchData: function() {
      console.log('fetchData()', this.$route.query)
      if (this.$route.query.round) {
        this.round_uuid = this.$route.query.round
      } else {
        console.log('no round uuid, redirect to /seasons')
        this.$router.push({name: 'seasons'})
      }
      this.data.send_msg({fn: 'get_round', round: this.round_uuid})
    },
    update_hcps: function() {
      let ret = {}
      for (const uuid of this.round_players) {
        ret[uuid] = Math.round(this.players[uuid].current_hcp/2)
      }
      this.round_player_hcps = ret
    },
    add_matchup: function() {
      for (const m of this.round_matchups) {
        if (m.length == 0) {
          return
        }
      }
      this.round_matchups.push([])
    },
    update_matchup: function(old_matchup, new_matchup) {
      let ret = []
      for (const m of this.round_matchups) {
        if (m == old_matchup) {
          ret.push(new_matchup)
        } else {
          ret.push(m)
        }
      }
      this.round_matchups = ret
    },
    remove_matchup: function(matchup) {
      let ret = []
      for (const m of this.round_matchups) {
        if (m != matchup) {
          ret.push(m)
        }
      }
      this.round_matchups = ret
    },
    submit: function() {
      logger('submit', this)
      if (this.round_date != '' && this.round_course != '') {
        logger(this.round)
        let players = {}
        for (const uuid of this.round_players) {
          let hcp = 0
          if (uuid in this.round_player_hcps) {
            hcp = this.round_player_hcps[uuid]*2
            logger('local hcp', hcp)
          } else if ('current_hcp' in this.data.players[uuid]) {
            hcp = this.data.players[uuid].current_hcp
            logger('global hcp', hcp)
          } else {
            logger('cannot find hcp for player '+uuid)
          }
          let strokes = []
          if (uuid in this.round.players && 'strokes' in this.round.players[uuid]) {
            strokes = this.round.players[uuid].strokes
            logger('round strokes for player '+uuid+':', strokes)
          }
          if (this.round_course in this.data.courses && this.data.courses[this.round_course].holes.length > 0) {
            const num_holes = this.data.courses[this.round_course].holes.length;
            if (num_holes < strokes.length) {
              strokes = []
            }
            const add_strokes = num_holes - strokes.length
            for (let i=0;i<add_strokes;i++) {
              strokes.push(0)
            }
          } else {
            logger('course info not available for '+this.round_course)
            return
          }
          players[uuid] = {
            'hcp': hcp,
            'strokes': strokes
          }
        }
        const msg = {
          fn: 'update_round_all',
          round: this.round_uuid,
          date: this.round_date,
          course: this.round_course,
          players: players,
          matchups: this.round_matchups
        }
        logger('submit round update', msg)
        this.data.send_msg(msg)
      }
    }
  },
  template: `
<article class="edit_round">
  <h2>Edit Round</h2>
  <input name="uuid" type="hidden" :value="round_uuid" />
  <div>
    <label for="season">Season:</label>
    <input name="season" type="text" disabled :value="round.season" />
  </div>
  <div>
    <label for="date">Date:</label>
    <input name="date" type="datetime-local" v-model="round_date" />
  </div>
  <div>
    <label for="course">Course:</label>
    <select name="course" v-model="round_course">
      <option disabled value="">Select a course</option>
      <option v-for="val, name in data.courses" :value="name">{{ name }}</option>
    </select>
  </div>
  <div>
    <label for="players">Players:</label>
    <div class="players">
      <div class="player" v-for="val, uuid in data.players" :data-test="val.name">
        <input :name="uuid" :value="uuid" type="checkbox" v-model="round_players">
        <label :for="uuid">{{ val.name }}</label>
        <div class="player_hcp" v-if="uuid in players">
          HCP (9 holes): <input type="number" v-model.number="round_player_hcps[uuid]">
        </div>
      </div>
      <button @click="update_hcps" data-test="update_hcps">Update all HCPs to current</button>
    </div>
  </div>
  <div>
    <label>Matchups:</label>
    <div class="matchups">
      <div v-for="matchup in round_matchups" class="matchup">
        <edit_matchup :matchup="matchup" :update="update_matchup" :avail_players="available_matchup_players" :players="players"></edit_matchup>
        <span class="material-symbols-outlined" @click="remove_matchup(matchup)">delete_forever</span>
      </div>
      <button @click="add_matchup" data-test="add_matchup">Add New Matchup</button>
    </div>
  </div>
  <button @click="submit" data-test="submit">Update</button>
</article>`
}

const NewPlayer = {
  data: function(){
    return {
      'name': '',
      'hcp': 0,
      'tee': 'std',
      'tee_options': ['std', 'short']
    }
  },
  props: ['data'],
  computed: {
    hcp9: {
      get: function() {
        return Math.round(this.hcp / 2)
      },
      set: function(val) {
        this.hcp = val*2
      }
    }
  },
  methods: {
    submit: function() {
      if (this.name != '') {
        const msg = {
          fn: 'new_player',
          name: this.name,
          hcp: this.hcp,
          tee: this.tee
        }
        logger('submit new player', msg)
        this.data.send_msg(msg)
      }
    }
  },
  template: `
<article class="new_player">
  <h2>New Player</h2>
  <div>
    <label for="name">Name:</label>
    <input name="name" type="text" v-model="name" />
  </div>
  <div>
    <label for="hcp">Current handicap<br>(18 holes):</label>
    <input name="hcp" type="number" v-model.number="hcp" />
  </div>
  <div>
    <label for="hcp9">Current handicap<br>(9 holes):</label>
    <input name="hcp9" type="number" v-model.number="hcp9" />
  </div>
  <div>
    <label for="tee">Tee selection:</label>
    <select name="tee" v-model="tee">
      <option v-for="opt in tee_options" :value="opt">{{ opt }}</option>
    </select>
  </div>
  <button @click="submit" data-test="submit">Create</button>
</article>`
}

Vue.component('edit_matchup', {
  data: function(){
    return {
      matchup: [],
      update: null,
      avail_players: [],
      players: {},
      model_matchup: [],
    }
  },
  props: ['matchup', 'update', 'avail_players', 'players'],
  created: function() {
    for (const m of this.matchup) {
      this.model_matchup.push(m)
    }
  },
  watch: {
    model_matchup: function(newVal, oldVal) {
      if (newVal != this.matchup) {
        this.update(this.matchup, newVal)
      } 
    }
  },
  computed: {
    name: function() {
      let ret = 'matchup'
      for (const m of this.matchup) {
        ret += '-'+m
      }
      return ret
    }
  },
  template: `
<select :name="name" autocomplete="off" v-model="model_matchup" @change multiple>
  <option v-if="matchup.length == 0 && avail_players.length == 0" disabled value="">Select match players</option>
  <option v-for="uuid in matchup" :value="uuid" :data-test="players[uuid].name">{{ players[uuid].name }}</option>
  <option v-for="uuid in avail_players" :value="uuid" :data-test="players[uuid].name">{{ players[uuid].name }}</option>
</select>`
})
  

Vue.component('new_round', {
  data: function(){
    return {
      date: '',
      course: '',
      data: null,
    }
  },
  props: ['season', 'data', 'courses'],
  methods: {
    submit: function(){
      logger('submit', this.date, this.course)
      if (this.date != '' && this.course != '') {
        const msg = {fn: 'new_round', season: this.season, date: this.date, course: this.course}
        logger('submit new round', msg)
        this.data.send_msg(msg)
      }
    }
  },
  template: `
<div class="new_round">
  <h4>New Round</h4>
  <div>
    <label for="new_round_date">Date:</label>
    <input type="datetime-local" name="new_round_date" v-model="date" />
  </div>
  <div>
    <label for="new_round_select">Course:</label>
    <select name="new_round_select" data-test="new_round_select" v-model="course">
      <option disabled value="">Select a course</option>
      <option v-for="val, name in courses" :value="name">{{ name }}</option>
    </select>
  </div>
  <button data-test="new_round_submit" @click="submit">Add Round</button>
</div>
`
})

Vue.component('scorecard', {
  data: function(){
    return {
      edit: false
    }
  },
  created: function() {
    if (this.$route.query.edit) {
      this.edit = this.$route.query.edit == 'true'
    }
  },
  props: ['round', 'course_name', 'course', 'data'],
  computed: {
    yardages: function() {
      let ret = {}
      for (const hole of this.course) {
        for (const color in hole.yardages) {
          if (!(color in ret)) {
            ret[color] = hole.yardages[color]
          } else {
            ret[color] += hole.yardages[color]
          }
        }
      }
      return ret
    },
    short_hcp: function() {
      let ret = []
      for (const hole of this.course) {
        if ('short_hcp' in hole) {
          ret.push(hole['short_hcp'])
        } else {
          return false
        }
      }
      return ret
    },
    total_par: function() {
      let ret = 0
      for (const hole of this.course) {
        ret += hole.par
      }
      return ret
    },
    players: function() {
      let ret = {}
      for (const p in this.round.players) {
        const player = this.round.players[p]
        let s = 0
        for (const v of player.strokes) {
          s += v
        }
        let hcp = Math.round(player.hcp * this.course.length / 18)
        ret[p] = {
          name: this.data.players[p].name,
          hcp: hcp,
          tee: this.data.players[p].tee,
          strokes: player.strokes,
          total_score: s
        }
      }
      return ret
    },
    can_score_round: function() {
      for (const p in this.players) {
        for (const s of this.players[p].strokes) {
          if (s <= 0) {
            return false
          }
        }
      }
      return true
    }
  },
  watch: {
    player: function(newVal, oldVal) {
      logger('player updated', newVal)
    }
  },
  methods: {
    stroke: function(event) {
      const player = event.target.attributes.player.value
      const holenum = parseInt(event.target.attributes.hole.value)
      const val = event.target.valueAsNumber
      let strokes = []
      for (const hole of this.course) {
        if (hole.num == holenum) {
          strokes.push(val)
        } else {
          strokes.push(this.players[player].strokes[hole.num-1])
        }
      }
      logger('player takes stroke', player, holenum, val, strokes)
      this.data.send_msg({
        fn: 'update_round_set_strokes',
        round: this.round.uuid,
        player: player,
        strokes: strokes
      })
    },
    edit_button: function(event) {
      this.edit = !this.edit
      let query = Object.assign({}, this.$route.query)
      query['edit'] = this.edit
      logger('edit option in query:', query)
      this.$router.push({ query: query })
    },
    bogey_score: function(player_uuid) {
      let strokes = []
      let player = this.players[player_uuid]
      // first score par on each hole
      for (const hole of this.course) {
        let val = hole.par
        strokes.push(val)
      }

      // now score net bogey (hcp + num holes)
      const hcp_key = player.tee == 'short' && this.short_hcp ? 'short_hcp' : 'hcp'
      let sorted_holes = []
      for (const hole of this.course) {
        sorted_holes.push(hole.num)
      }
      sorted_holes.sort((a,b) => {
        const a_hcp = this.course[a-1][hcp_key]
        const b_hcp = this.course[b-1][hcp_key]
        return a_hcp-b_hcp
      })
      logger('holes_by_hcp', sorted_holes)
      let extra_strokes = player.hcp + this.course.length
      let sorted_hole_index = 0
      while (extra_strokes > 0) {
        let hole_index = sorted_holes[sorted_hole_index]-1
        strokes[hole_index] += 1
        extra_strokes -= 1
        sorted_hole_index += 1
        if (sorted_hole_index >= sorted_holes.length) {
          sorted_hole_index = 0
        }
      }

      logger('player scores all net bogeys', player_uuid, strokes)
      this.data.send_msg({
        fn: 'update_round_set_strokes',
        round: this.round.uuid,
        player: player_uuid,
        strokes: strokes
      })
    },
    score_round: function() {
      this.data.send_msg({
        fn: 'score_round',
        round: this.round.uuid,
      })
    }
  },
  template: `
<div class="scorecard" data-test="scorecard">
  <div class="edit"><button v-on:click="edit_button">{{ edit ? "View" : "Edit"}} Mode</button></div>
  <div class="edit_players">
    <router-link :to="{ name: 'edit_round', query: { round: round.uuid }}" class="edit-link">Edit Players/Course</router-link>
  </div>
  <div class="score_round" v-if="can_score_round"><button @click="score_round">Score Round</button></div>
  <h3>{{ course_name }}</h3>
  <table>
    <tr class="hole">
      <th>Hole</th>
      <th v-for="hole in course">{{ hole.num }}</th>
      <th>Total</th>
      <th>Net</th>
      <th v-if="edit"></th>
    </tr>
    <tr class="yardage" v-for="(v,name) in yardages">
      <td>{{ name }}</td>
      <td v-for="hole in course">{{ hole.yardages[name] }}</th>
      <td>{{ v }}</td>
      <td></td>
      <td v-if="edit"></td>
    </tr>
    <tr class="hcp">
      <td>Handicap</td>
      <td v-for="hole in course">{{ hole.hcp }}</th>
      <td></td>
      <td></td>
      <td v-if="edit"></td>
    </tr>
    <tr v-if="short_hcp" class="short_hcp">
      <td>Forward Hcp</td>
      <td v-for="h in short_hcp">{{ h }}</th>
      <td></td>
      <td></td>
      <td v-if="edit"></td>
    </tr>
    <tr class="par">
      <td>Par</td>
      <td v-for="hole in course">{{ hole.par }}</th>
      <td>{{ total_par }}</td>
      <td>{{ total_par }}</td>
      <td v-if="edit"></td>
    </tr>
    <tr class="player" v-for="(v, uuid) in players" :data-test="v.name">
      <td>{{ v.name }} <span class="hcp">+{{ v.hcp }}</span></td>
      <td v-for="hole in course"><input v-if="edit" type="number" :player="uuid" :hole="hole.num" :value="v.strokes[hole.num-1]" v-on:change="stroke" /><span v-else>{{ v.strokes[hole.num-1] }}</span></td>
      <td>{{ v.total_score }}</td>
      <td>{{ v.total_score - v.hcp }}</td>
      <td v-if="edit"><button data-test="score_bogey" @click="bogey_score(uuid)">Net Bogey</button></td>
    </tr>
  </table>
</div>`
});

Vue.component('matchup', {
  data: function(){
    return {}
  },
  props: ['round', 'matchup', 'course', 'data'],
  computed: {
    total_par: function() {
      let ret = 0
      for (const hole of this.course) {
        ret += hole.par
      }
      return ret
    },
    tee: function() {
      let ret = 'std'
      for (const uuid of this.matchup) {
        const player_tee = this.data.players[uuid].tee
        if (player_tee == 'short') {
          ret = 'short'
          break
        }
      }
      logger('match tee: '+ret)
      return ret
    },
    holes_by_hcp: function() {
      const hcp_key = this.tee == 'short' && 'short_hcp' in this.course[0] ? 'short_hcp' : 'hcp'
      let ret = []
      for (const hole of this.course) {
        ret.push(hole.num)
      }
      ret.sort((a,b) => {
        const a_hcp = this.course[a-1][hcp_key]
        const b_hcp = this.course[b-1][hcp_key]
        return a_hcp-b_hcp
      })
      logger('holes_by_hcp', ret)
      return ret
    },
    match_players: function() {
      let ret = {}
      for (const p of this.matchup) {
        ret[p] = p
      }
      return ret
    },
    players: function() {
      let ret = {}
      for (const p in this.round.players) {
        if (p in this.match_players) {
          const player = this.round.players[p]
          let s = 0
          for (const v of player.strokes) {
            s += v
          }
          const hcp = Math.round(player.hcp * this.course.length / 18)
          ret[p] = {
            name: this.data.players[p].name,
            hcp: hcp,
            strokes: player.strokes,
            total_score: s
          }
        }
      }
      return ret
    },
    min_hcp: function() {
      let min_hcp = 10000
      for (const uuid in this.players) {
        const player = this.players[uuid]
        if (player.hcp < min_hcp) {
          min_hcp = player.hcp
        }
      }
      logger('min_hcp: ', min_hcp)
      return min_hcp
    },
    adjusted_hcps: function() {
      ret = {}
      for (const uuid in this.players) {
        const player = this.players[uuid]
        ret[uuid] = player.hcp - this.min_hcp
      }
      logger('adjusted_hcps:', ret)
      return ret
    },
    adjusted_hcp_strokes: function() {
      let hcps = Object.assign({}, this.adjusted_hcps)
      let strokes = {}
      let dots = {}
      for (const uuid in this.players) {
        strokes[uuid] = [...this.players[uuid].strokes]
        dots[uuid] = new Array(strokes[uuid].length).fill(0)
      }

      const sorted_holes = this.holes_by_hcp
      let sorted_hole_index = 0
      while (Object.values(hcps).some((e) => e > 0)) {
        let hole_index = sorted_holes[sorted_hole_index]-1
        logger('dot on hole_index', hole_index)
        for (const uuid in hcps) {
          logger('eval', uuid, dots[uuid], hcps[uuid], strokes[uuid])
          if (hcps[uuid] > 0) {
            hcps[uuid] -= 1
            dots[uuid][hole_index] += 1
            if (strokes[uuid][hole_index] > 1) { // min 1 shot
              strokes[uuid][hole_index] -= 1
            }
          }
        }
        sorted_hole_index += 1
        if (sorted_hole_index >= sorted_holes.length) {
          sorted_hole_index = 0
        }
      }
      for (const uuid in strokes) {
        ret[uuid] = {
          'dots': dots[uuid],
          'by_hole': strokes[uuid],
          'total': this.players[uuid].hcp - this.min_hcp
        }
      }
      logger('adjusted_hcp_strokes:', ret)
      return ret
    },
    hole_winners: function() {
      let ret = []
      let hcp_strokes = this.adjusted_hcp_strokes
      for (const hole of this.course) {
        const index = hole.num-1
        let all_strokes = []
        let scores_valid = true;
        for (const uuid in hcp_strokes) {
          const s = hcp_strokes[uuid].by_hole[index]
          if (s <= 0) {
            scores_valid = false
            break
          }
          all_strokes.push(s)
        }
        if (!scores_valid) {
          ret.push(null)
        } else {
          const min_strokes = Math.min(...all_strokes)
          let hole_winners = []
          for (const uuid in hcp_strokes) {
            if (hcp_strokes[uuid].by_hole[index] == min_strokes) {
              hole_winners.push(uuid)
            }
          }
          ret.push(hole_winners)
        }
      }
      logger('hole_winners():', ret)
      return ret
    },
    hole_points: function() {
      let total_points = {}
      for (const players of this.hole_winners) {
        if (players == null) {
          return {}
        }
        const pts = 1./players.length;
        logger('hole_points players', players, pts)
        for (const uuid of players) {
          if (uuid in total_points) {
            total_points[uuid] += pts
          } else {
            total_points[uuid] = pts
          }
        }
      }
      logger('hole_points:', total_points)
      return total_points
    },
    low_net: function() {
      for (const players of this.hole_winners) {
        if (players == null) {
          return {}
        }
      }
      let low_net = 10000
      let low_net_players = {}
      for (const uuid in this.players) {
        const v = this.players[uuid]
        const net = v.total_score - v.hcp
        if (net < low_net) {
          low_net = net
          low_net_players = {}
          low_net_players[uuid] = uuid
        } else if (net == low_net) {
          low_net_players[uuid] = uuid
        }
      }
      logger('low_net:', low_net_players)
      return low_net_players
    },
    total_points: function() {
      for (const players of this.hole_winners) {
        if (players == null) {
          return {}
        }
      }
      let ret = {}
      for (const uuid in this.hole_points) {
        let pts = this.hole_points[uuid]
        if (uuid in this.low_net) {
          pts += 4/Object.keys(this.low_net).length
        }
        ret[uuid] = pts
      }
      logger('total_points:', ret)
      return ret
    }
  },
  methods: {
    hole_class: function(player, hole) {
      const v = this.hole_winners[hole]
      logger('hole_class('+player+', '+hole+'): ', v)
      if (v == null) {
        return ''
      } else if (v.length == 1 && v[0] == player) {
        return 'win'
      }
      for (const p of v) {
        if (p == player) {
          return 'tie'
        }
      }
      return ''
    },
    net_class: function(player) {
      if (player in this.low_net) {
        if (Object.keys(this.low_net).length > 1) {
          return 'tie'
        }
        return 'win'
      }
      return ''
    },
    total_class: function(player) {
      const pts = this.total_points[player]
      if (pts == 6.5) {
        return 'tie'
      } else if (pts > 6.5) {
        return 'win'
      }
      return ''
    },
    dot: function(player_uuid, hole) {
      const num = this.adjusted_hcp_strokes[player_uuid].dots[hole-1]
      return '•'.repeat(num)
    },
    hcp_normalized: function(player_uuid) {
      const hcp = this.adjusted_hcp_strokes[player_uuid].total
      if (hcp > 0) {
        return '+'+hcp
      }
      return ''
    }
  },
  template: `
<div class="scorecard matchup" data-test="matchup">
  <h3>Matchup: {{ players[matchup[0]].name }} vs {{ players[matchup[1]].name }}</h3>
  <table>
    <tr class="hole">
      <th>Hole</th>
      <th v-for="hole in course">{{ hole.num }}</th>
      <th>Total</th>
      <th>Net</th>
      <th>Points</th>
    </tr>
    <tr class="par">
      <td>Par</td>
      <td v-for="hole in course">{{ hole.par }}</th>
      <td>{{ total_par }}</td>
      <td>{{ total_par }}</td>
      <td></td>
    </tr>
    <tr class="player" v-for="(v, uuid) in players" :data-test="v.name">
      <td>{{ v.name }} <span class="hcp">{{ hcp_normalized(uuid) }}</span></td>
      <td v-for="hole in course" class="score" :class="hole_class(uuid, hole.num-1)"><div class="hcp_dots_wrapper">{{ v.strokes[hole.num-1] }}<span class="hcp_dots">{{ dot(uuid, hole.num) }}</span></div></td>
      <td>{{ v.total_score }}</td>
      <td :class="net_class(uuid)">{{ v.total_score - v.hcp }}</td>
      <td :class="total_class(uuid)" v-if="uuid in hole_points">{{ hole_points[uuid] }}<span v-if="net_class(uuid) == 'win'"> + 4</span><span v-else-if="net_class(uuid) == 'tie'"> + 2</span> = <span class="total_points">{{ total_points[uuid] }}</span></td>
    </tr>
  </table>
</div>`
});

const Error404 = {
    computed: {
      pathMatch: function() {
        return this.$route.params[0];
      }
    },
    template: `
<article class="error">
  <h2>Error: page not found</h2>
  <p><span class="code">{{ pathMatch }}</span> does not exist</p>
</article>`
}

Vue.component('navpage', {
  data: function(){
    return {
      path: '',
      name: '',
      current: ''
    }
  },
  props: ['path', 'name', 'current'],
  computed: {
    classObj: function() {
      return {
        active: this.name == this.current
      }
    },
    cleanedName: function() {
      return this.name.replace('_', ' ')
    }
  },
  beforeRouteEnter(to, from, next) {
    this.current = to.params.route
    next()
  },
  template: '<li :class="classObj"><router-link :to="path">{{ cleanedName }}</router-link></li>'
});

Vue.component('errmsg', {
  data: function(){
    return {
      data: null
    }
  },
  props: ['data'],
  computed: {
    msg: function() {
      return this.data.msg
    },
    active: function() {
      return this.msg != ''
    }
  },
  template: '<div class="msgcontainer" v-if="active"><div class="errmsg">Warning: {{ msg }}</div></div>'
});

// scrollBehavior:
// - only available in html5 history mode
// - defaults to no scroll behavior
// - return false to prevent scroll
const scrollBehavior = function (to, from, savedPosition) {
  if (savedPosition) {
    // savedPosition is only available for popstate navigations.
    return savedPosition
  } else {
    const position = {}

    // scroll to anchor by returning the selector
    if (to.hash) {
      position.selector = to.hash

      // specify offset of the element
      if (to.hash === '#anchor2') {
        position.offset = { y: 100 }
      }

      // bypass #1number check
      if (/^#\d/.test(to.hash) || document.querySelector(to.hash)) {
        return position
      }

      // if the returned position is falsy or an empty object,
      // will retain current scroll position.
      return false
    }

    return new Promise(resolve => {
      // check if any matched route config has meta that requires scrolling to top
      if (to.matched.some(m => m.meta.scrollToTop)) {
        // coords will be used if no selector is provided,
        // or if the selector didn't match any element.
        position.x = 0
        position.y = 0
      }

      // wait for the out transition to complete (if necessary)
      this.app.$root.$once('triggerScroll', () => {
        // if the resolved position is falsy or an empty object,
        // will retain current scroll position.
        resolve(position)
      })
    })
  }
}

async function vue_startup(data){
  let routes = [
    { path: '/', name: 'home', component: Home, props: { data: data } },
    { path: '/rounds', name: 'rounds', component: Rounds, props: { data: data } },
    { path: '/seasons', name: 'seasons', component: Seasons, props: { data: data } },
    { path: '/edit_round', name: 'edit_round', component: EditRound, props: { data: data } },
    { path: '/new_player', name: 'new_player', component: NewPlayer, props: { data: data } },
    { path: '*', name: '404', component: Error404, props: true }
  ];
  let available_routes = [];
  for (const r of routes) {
    if (r.name != '404') {
      available_routes.push(r);
    }
  }

  var router = new VueRouter({
    mode: 'history',
    routes: routes,
    scrollBehavior: scrollBehavior
  })

  const app = new Vue({
    el: '#page-container',
    data: {
      data: data,
      routes: available_routes,
      current: 'home'
    },
    router: router,
    asyncComputed: {
      visibleRoutes: async function() {
        var current = this.current;
        var ret = []
        for (const r of this.routes) {
          if (r.path[0] == '*')
            continue
          if (r.path.startsWith('/edit_round') && current != 'edit_round')
            continue
          ret.push(r)
        }
        console.log('routes',ret)
        return ret
      }
    },
    watch: {
      '$route.currentRoute.path': {
        handler: function() {
          console.log('currentPath update:'+router.currentRoute.path)
          this.current = router.currentRoute.name
          console.log('    route:'+this.current)
        },
        deep: true,
        immediate: true,
      }
    }
  })
}
