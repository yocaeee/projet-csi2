<template>
    <v-app>
      <v-main>
        <v-container>
          <h1>Page d'accueil</h1>
        </v-container>
      </v-main>

      <v-app-bar app color="teal">
        <v-btn @click="onClickCours" text>
          <v-icon>mdi-book</v-icon>
          <span class="ml-2">Cours</span>
        </v-btn>
      </v-app-bar>
      <v-app-bar app color="teal">
        <v-btn @click="onClickCampings" text>
          <v-icon>mdi-book</v-icon>
          <span class="ml-2">Camping</span>
        </v-btn>
      </v-app-bar>
      <v-app-bar app color="teal">
        <v-btn @click="onClickEmployees" text>
          <v-icon>mdi-book</v-icon>
          <span class="ml-2">Personnel</span>
        </v-btn>
      </v-app-bar>
      <v-app-bar app color="teal">
        <v-btn @click="onClickMateriel" text>
          <v-icon>mdi-book</v-icon>
          <span class="ml-2">Matériel</span>
        </v-btn>
      </v-app-bar>
    </v-app>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router'
  
  const router = useRouter()

  
  const onClickCours = () => {
    router.push({ name: 'lessons' })
  }

  const onClickCampings = () => {
    router.push({ name: 'campings' })
  }

  const onClickEmployees = () => {
    router.push({ name: 'employees' })
  }

  const onClickMateriel = () => {
    router.push({ name: 'materiel' })
  }

  </script>
  
  <style scoped>
  </style>
  