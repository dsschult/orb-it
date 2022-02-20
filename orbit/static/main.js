
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
    <select v-model="season">
      <option disabled value="">Select a season</option>
      <option v-for="s in seasons">{{ s }}<option>
    </select>
    <select v-model="round">
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
  <div v-else>Select season and round</div>
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
          }
          ret[color] += hole.yardages[color]
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
          strokes: player.strokes,
          total_score: s
        }
      }
      return ret
    }
  },
  template: `
<div class="scorecard">
  <h3>{{ course_name }}</h3>
  <table>
    <tr class="hole">
      <th>Hole</th>
      <th v-for="hole in course">{{ hole.num }}</th>
      <th>Total</th>
      <th>Tot Hcp</th>
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
    <tr class="par">
      <td>Par</td>
      <td v-for="hole in course">{{ hole.par }}</th>
      <td>{{ total_par }}</td>
      <td>{{ total_par }}</td>
    </tr>
    <tr class="player" v-for="(v, uuid) in players">
      <td>{{ v.name }} <span class="hcp">+{{ v.hcp }}</span></td>
      <td v-for="s in v.strokes">{{ s }}</td>
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
    holes_by_hcp: function() {
      let ret = []
      let used_holes = {}
      while (ret.length < this.course.length) {
        let min_hcp = 100
        let min_hole = 0
        for (const hole of this.course) {
          if (hole.num in used_holes) {
            continue
          }
          if (hole.hcp < min_hcp) {
            min_hcp = hole.hcp
            min_hole = hole.num
          }
        }
        used_holes[min_hole] = true
        ret.push(min_hole-1)
      }
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
          let strokes_hcp = []
          let course_hcp = []
          for (const s of player.strokes) {
            strokes_hcp.push(s)
            course_hcp.push(0)
          }
          let hcp_count = hcp
          let index = 0
          while (hcp_count > 0) {
            strokes_hcp[this.holes_by_hcp[index]] -= 1
            course_hcp[this.holes_by_hcp[index]] += 1
            hcp_count -= 1
            index += 1
            if (index == this.course.length) {
              index = 0
            }
          }
          ret[p] = {
            name: this.data.players[p].name,
            hcp: hcp,
            strokes: player.strokes,
            strokes_hcp: strokes_hcp,
            hcp_adjust: course_hcp,
            total_score: s
          }
        }
      }
      return ret
    },
    players_hcp_adjust_normalized: function() {
      let min_hcp = 10000
      for (const uuid in this.players) {
        const player = this.players[uuid]
        if (player.hcp < min_hcp) {
          min_hcp = player.hcp
        }
      }
      let ret = {}
      for (const uuid in this.players) {
        const player = this.players[uuid]
        let course_hcp = []
        for (const hole of this.course) {
          course_hcp.push(0)
        }
        let hcp_count = player.hcp - min_hcp
        let index = 0
        while (hcp_count > 0) {
          course_hcp[this.holes_by_hcp[index]] += 1
          hcp_count -= 1
          index += 1
          if (index == this.course.length) {
            index = 0
          }
        }
        ret[uuid] = {
          'by_hole': course_hcp,
          'total': player.hcp - min_hcp
        }
      }
      /*
      let min_hcps = []
      for (const hole of this.course) {
        let min_hcp = 10000
        for (const uuid in this.players) {
          const player = this.players[uuid];
          if (player.hcp_adjust[hole.num-1] < min_hcp) {
            min_hcp = player.hcp_adjust[hole.num-1]
          }
        }
        min_hcps.push(min_hcp)
      }
      console.log('min_hcps: ', min_hcps)
      let ret = {}
      for (const uuid in this.players) {
        const player = this.players[uuid];
        let hcp_adjust = []
        for (const hole of this.course) {
          hcp_adjust.push(player.hcp_adjust[hole.num-1] - min_hcps[hole.num-1])
        }
        ret[uuid] = {
          'by_hole': hcp_adjust,
          'total': hcp_adjust.reduce((s, a) => s + a, 0)
        }
      }*/
      console.log('players_hcp_adjust_normalized: ', ret)
      return ret
    },
    hole_winner: function() {
      let ret = []
      for (const hole of this.course) {
        const index = hole.num-1
        let scores = {}
        for (const uuid in this.players) {
          const player = this.players[uuid]
          const s_wo_hcp = player.strokes[index]
          const s = player.strokes_hcp[index]
          console.log('hole_winner '+(index+1), player.name, s_wo_hcp, s)
          if (s_wo_hcp == 0) { // don't count holes not played
            continue
          }
          if (!(s in scores)) {
            scores[s] = [uuid]
          } else {
            scores[s].push(uuid)
          }
        }
        const sorted_scores = Object.keys(scores).sort(function(a,b){ return a-b })
        console.log('hole_winner sorted_scores', sorted_scores)
        if (sorted_scores.length == 0) {
          ret.push(null)
        } else {
          const players = scores[sorted_scores[0]]
          ret.push(players)
        }
      }
      console.log('victor():', ret)
      return ret
    },
    hole_points: function() {
      let total_points = {}
      for (const players of this.hole_winner) {
        if (players == null) {
          return null
        }
        const pts = players.length > 1 ? 0.5 : 1.;
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
      for (const players of this.hole_winner) {
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
      const v = this.hole_winner[hole]
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
    dot: function(player, hole) {
      const num = this.players_hcp_adjust_normalized[player].by_hole[hole]
      return '•'.repeat(num)
    },
    hcp_normalized: function(player) {
      const hcp = this.players_hcp_adjust_normalized[player].total
      if (hcp > 0) {
        return '+'+hcp
      }
      return ''
    }
  },
  template: `
<div class="scorecard matchup">
  <h3>Matchup: {{ players[matchup[0]].name }} vs {{ players[matchup[1]].name }}</h3>
  <table>
    <tr class="hole">
      <th>Hole</th>
      <th v-for="hole in course">{{ hole.num }}</th>
      <th>Total</th>
      <th>Tot Hcp</th>
      <th>Points</th>
    </tr>
    <tr class="par">
      <td>Par</td>
      <td v-for="hole in course">{{ hole.par }}</th>
      <td>{{ total_par }}</td>
      <td>{{ total_par }}</td>
      <td></td>
    </tr>
    <tr class="player" v-for="(v, uuid) in players">
      <td>{{ v.name }} <span class="hcp">{{ hcp_normalized(uuid) }}</span></td>
      <td v-for="hole in course" class="score" :class="hole_class(uuid, hole.num-1)"><div class="hcp_dots_wrapper">{{ v.strokes[hole.num-1] }}<span class="hcp_dots">{{ dot(uuid, hole.num-1) }}</span></div></td>
      <td>{{ v.total_score }}</td>
      <td :class="net_class(uuid)">{{ v.total_score - v.hcp }}</td>
      <td :class="total_class(uuid)">{{ hole_points[uuid] }}<span v-if="net_class(uuid) == 'win'"> + 4</span><span v-else-if="net_class(uuid) == 'tie'"> + 2</span> = <span class="total_points">{{ total_points[uuid] }}</span></td>
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
