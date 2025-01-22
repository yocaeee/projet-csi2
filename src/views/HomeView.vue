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
              <h1 class="club-title text-center mb-6">
                Club Nautique de Jarville sur Mer
              </h1>
              <div class="image-container">
                <img src="http://localhost:5000/images/image2.png" alt="Image 1" class="my-image">
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-footer app color="teal" class="white--text">
      <v-container class="d-flex justify-space-between">
        <span><strong>Propriétaire :</strong> Lucas PETIT</span>
        <span><strong>Email :</strong> lucas.petit@mail.com</span>
        <span><strong>Téléphone :</strong> 06 56 74 38 99</span>
      </v-container>
    </v-footer>

  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'


const router = useRouter()

const onClickCours = () => router.push({ name: 'lessons' })
const onClickCampings = () => router.push({ name: 'campings' })
const onClickEmployees = () => router.push({ name: 'employees' })
const onClickForfait = () => router.push({ name: 'forfait' })
const onClickLocation = () => router.push({ name: 'location' })
const onClickCustomer = () => router.push({ name: 'customer' })
const onClickMateriel = () => router.push({ name: 'materiel' })
const onClickInvoice = () => router.push({ name: 'invoice' })
const onClickSettings = () => router.push({ name: 'settings' })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

.v-btn {
  text-transform: none;
}

.club-title {
  font-family: 'Pacifico', cursive;
  font-size: 2.5rem;
  color: #008080;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  letter-spacing: 1px;
  transform: rotate(-2deg);
  transition: all 0.3s ease;
}

.club-title:hover {
  transform: rotate(0deg) scale(1.05);
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.my-image {
  width: 100vw;
  max-height: 50vh;
  object-fit: cover;
  border-radius: 0;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.my-image:hover {
  transform: scale(1.02);
}



.v-footer {
  padding: 10px 20px;
  font-size: 0.9rem;
}
</style>
