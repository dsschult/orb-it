
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
    <scorecard v-if="round_info && course_info.length" :round="round_info"
      :course_name="course_name" :course="course_info" :data="data"></scorecard>
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
  created: function() {
    console.log('round', this.round, 'course', this.course[0])
  },
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
        let s = 0
        for (const v of this.round.players[p]) {
          s += v
        }
        ret[p] = {
          name: this.data.players[p].name,
          scores: this.round.players[p],
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
    </tr>
    <tr class="par">
      <td>Par</td>
      <td v-for="hole in course">{{ hole.par }}</th>
      <td>{{ total_par }}</td>
    </tr>
    <tr class="player" v-for="(v, uuid) in players">
      <td>{{ v.name }}</td>
      <td v-for="s in v.scores">{{ s }}</td>
      <td>{{ v.total_score }}</td>
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
