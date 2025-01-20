<template>
  <v-app>
    <v-app-bar app color="teal" dense>
      <v-container fluid class="d-flex justify-space-between align-center">
        <div class="d-flex">
          <v-btn @click="onClickCours" text class="mx-1">
            <v-icon>mdi-book</v-icon>
            <span class="ml-2">Cours</span>
          </v-btn>
          <v-btn @click="onClickCampings" text class="mx-1">
            <v-icon>mdi-tent</v-icon>
            <span class="ml-2">Camping</span>
          </v-btn>
          <v-btn @click="onClickEmployees" text class="mx-1">
            <v-icon>mdi-account-group</v-icon>
            <span class="ml-2">Personnel</span>
          </v-btn>
          <v-btn @click="onClickMateriel" text class="mx-1">
            <v-icon>mdi-tools</v-icon>
            <span class="ml-2">Matériel</span>
          </v-btn>
          <v-btn @click="onClickForfait" text class="mx-1">
            <v-icon>mdi-ticket</v-icon>
            <span class="ml-2">Forfait</span>
          </v-btn>
          <v-btn @click="onClickLocation" text class="mx-1">
            <v-icon>mdi-sail-boat</v-icon>
            <span class="ml-2">Location</span>
          </v-btn>
          <v-btn @click="onClickCustomer" text class="mx-1">
            <v-icon>mdi-account-multiple</v-icon>
            <span class="ml-2">Clients</span>
          </v-btn>
          <v-btn @click="onClickInvoice" text class="mx-1">
            <v-icon>mdi-file-document</v-icon>
            <span class="ml-2">Factures</span>
          </v-btn>
          <v-btn @click="onClickSettings" text class="mx-1">
            <v-icon>mdi-cog</v-icon>
            <span class="ml-2">Paramètres</span>
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-main>
      <v-container>
        <v-row>
          <v-col>
            <v-sheet class="pa-4">
              <v-typography tag="h1" class="text-h4 font-weight-bold mb-4">
                CLUB NAUTIQUE DE JARVILLE SUR MER
              </v-typography>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'

// Configuration des routes
const router = useRouter()

// Fonctions de navigation
const onClickCours = () => {
  router.push({ name: 'lessons' })
}

const onClickCampings = () => {
  router.push({ name: 'campings' })
}

const onClickEmployees = () => {
  router.push({ name: 'employees' })
}

const onClickForfait = () => {
  router.push({ name: 'forfait' })
}

const onClickLocation = () => {
  router.push({ name: 'location' })
}

const onClickCustomer = () => {
  router.push({ name: 'customer' })
}

const onClickMateriel = () => {
  router.push({ name: 'materiel' })
}

const onClickInvoice = () => {
  router.push({ name: 'invoice' })
}

const onClickSettings = () => {
  router.push({ name: 'settings' })
}
</script>

<style scoped>
.v-btn {
  text-transform: none;
}
</style>
