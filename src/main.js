import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import LogView from './views/LogView.vue'
import HomeView from './views/HomeView.vue'
import LessonsView from './views/LessonsView.vue'
import PersonnelView from './views/PersonnelView.vue'
import CampingView from './views/CampingView.vue'
import MaterielView from './views/MaterielView.vue'
import ForfaitView from './views/ForfaitView.vue'
import LocationView from './views/LocationView.vue'
import SettingsView from './views/SettingsView.vue'
import CustomerView from './views/CustomerView.vue'

const routes = [
  { path: "/", component: LogView },
  { path: "/home", name: "home", component: HomeView },
  { path: "/lessons", name: "lessons", component: LessonsView },
  { path: "/employees", name: "employees", component: PersonnelView },
  { path: "/campings", name: "campings", component: CampingView },
  { path: "/materiel", name: "materiel", component: MaterielView },
  { path: "/forfait", name: "forfait", component: ForfaitView },
  { path: "/location", name: "location", component: LocationView },
  { path: "/settings", name: "settings", component: SettingsView },
  { path: "/customer", name: "customer", component: CustomerView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const vuetify = createVuetify({
  components,
  directives
});

const app = createApp(App)
app.use(router)
app.use(vuetify)
app.mount('#app')
