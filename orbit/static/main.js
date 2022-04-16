
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
  <p>{{ seasons }}</p>
  <p>{{ rounds }}</p>
</article>`
}

const Rounds = {
    data: function(){
      return {
        'season': '',
        'round': ''
      }
    },
    props: ['data'],
    created: function() {
      this.fetchData()
    },
    watch: {
      '$route': 'fetchData',
      'season': 'updateHistory',
      'round': 'updateHistory',
    },
    methods: {
      fetchData: function() {
        console.log('fetchData()')
        this.data.send_msg({fn: 'get_rounds'})
        if (this.$route.query.season) {
          this.season = this.$route.query.season
        }
        if (this.$route.query.round) {
          this.round = this.$route.query.round
        }
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
          const round = this.data.rounds[this.round];
          this.data.send_msg({fn: 'get_course_details', course: round.course})
          return round
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
          if (r.course in this.data.courses && this.data.courses[r.course].length) {
            return this.data.courses[r.course]
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
        'season': '',
        'newdate': ''
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
      newRound() {
        if (this.newdate) {
          this.data.send_msg({fn: 'new_round', season: this.season, date: this.newdate, course: 'Default'})
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
        console.log('player_scores', scores)
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
        </div>
        <div class="cell" v-for="player_uuid in player_ordering">
          {{ get_points(round, player_uuid) }}
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
    <div class="new_round">
      <h4>New Round</h4>
      <select>
        <option>course</option>
      </select>
    </div>
  </div>
  <div v-else>Select season</div>
</article>`
}

Vue.component('scorecard', {
  data: function(){
    return {
      edit: false
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
    }
  },
  watch: {
    player: function(newVal, oldVal) {
      console.log('player updated', newVal)
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
      console.log('player takes stroke', player, holenum, val, strokes)
      this.data.send_msg({
        fn: 'update_round_set_strokes',
        round: this.round.uuid,
        player: player,
        strokes: strokes
      })
    },
    edit_button: function(event) {
      this.edit = !this.edit
    }
  },
  template: `
<div class="scorecard" data-test="scorecard">
  <div class="edit"><button v-on:click="edit_button">{{ edit ? "View" : "Edit"}} Mode</button></div>
  <h3>{{ course_name }}</h3>
  <table>
    <tr class="hole">
      <th>Hole</th>
      <th v-for="hole in course">{{ hole.num }}</th>
      <th>Total</th>
      <th>Net</th>
    </tr>
    <tr class="yardage" v-for="(v,name) in yardages">
      <td>{{ name }}</td>
      <td v-for="hole in course">{{ hole.yardages[name] }}</th>
      <td>{{ v }}</td>
    </tr>
    <tr class="hcp">
      <td>Handicap</td>
      <td v-for="hole in course">{{ hole.hcp }}</th>
      <td></td>
      <td></td>
    </tr>
    <tr v-if="short_hcp" class="short_hcp">
      <td>Forward Hcp</td>
      <td v-for="h in short_hcp">{{ h }}</th>
      <td></td>
      <td></td>
    </tr>
    <tr class="par">
      <td>Par</td>
      <td v-for="hole in course">{{ hole.par }}</th>
      <td>{{ total_par }}</td>
      <td>{{ total_par }}</td>
    </tr>
    <tr class="player" v-for="(v, uuid) in players" :data-test="v.name">
      <td>{{ v.name }} <span class="hcp">+{{ v.hcp }}</span></td>
      <td v-for="hole in course"><input v-if="edit" type="number" :player="uuid" :hole="hole.num" :value="v.strokes[hole.num-1]" v-on:change="stroke" /><span v-else>{{ v.strokes[hole.num-1] }}</span></td>
      <td>{{ v.total_score }}</td>
      <td>{{ v.total_score - v.hcp }}</td>
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
      console.log('match tee: '+ret)
      return ret
    },
    holes_by_hcp: function() {
      const hcp_key = this.tee == 'short' ? 'short_hcp' : 'hcp'
      let ret = []
      for (const hole of this.course) {
        ret.push(hole.num)
      }
      ret.sort((a,b) => {
        const a_hcp = this.course[a-1][hcp_key]
        const b_hcp = this.course[b-1][hcp_key]
        return a_hcp-b_hcp
      })
      console.log('holes_by_hcp', ret)
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
      console.log('min_hcp: ', min_hcp)
      return min_hcp
    },
    adjusted_hcps: function() {
      ret = {}
      for (const uuid in this.players) {
        const player = this.players[uuid]
        ret[uuid] = player.hcp - this.min_hcp
      }
      console.log('adjusted_hcps:', ret)
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
        console.log('dot on hole_index', hole_index)
        for (const uuid in hcps) {
          console.log('eval', uuid, dots[uuid], hcps[uuid], strokes[uuid])
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
      console.log('adjusted_hcp_strokes:', ret)
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
      console.log('hole_winners():', ret)
      return ret
    },
    hole_points: function() {
      let total_points = {}
      for (const players of this.hole_winners) {
        if (players == null) {
          return {}
        }
        const pts = 1./players.length;
        console.log('hole_points players', players, pts)
        for (const uuid of players) {
          if (uuid in total_points) {
            total_points[uuid] += pts
          } else {
            total_points[uuid] = pts
          }
        }
      }
      console.log('hole_points:', total_points)
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
      console.log('low_net:', low_net_players)
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
      console.log('total_points:', ret)
      return ret
    }
  },
  methods: {
    hole_class: function(player, hole) {
      const v = this.hole_winners[hole]
      console.log('hole_class('+player+', '+hole+'): ', v)
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
  },
  beforeRouteEnter(to, from, next) {
    this.current = to.params.route
    next()
  },
  template: '<li :class="classObj"><router-link :to="path">{{ name }}</router-link></li>'
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
      routes: available_routes,
      current: 'home'
    },
    router: router,
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
