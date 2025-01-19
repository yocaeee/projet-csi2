<template>
  <v-container class="d-flex justify-center align-center" style="height: 100vh;">
    <v-card class="pa-4" max-width="400">
      <v-card-title>
        <span class="headline">Se connecter</span>
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="onLogin">
          <v-text-field
            v-model="email"
            label="Email"
            prepend-icon="mdi-account"
            outlined
            required
          ></v-text-field>

          <v-text-field
            v-model="password"
            label="Mot de passe"
            type="password"
            prepend-icon="mdi-lock"
            outlined
            required
          ></v-text-field>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="blue"
          @click="onLogin"
          block
        >
          Connexion
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const email = ref('')
const password = ref('')

const router = useRouter()

const onLogin = async () => {
  if (email.value && password.value) {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email: email.value,
        password: password.value
      })
      
      if (response.data.success) {
        router.push({ name: 'home' })
      } else {
        alert('Identifiants invalides.')
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      alert('Une erreur est survenue lors de la connexion.')
    }
  } else {
    alert('Veuillez remplir tous les champs.')
  }
}
</script>

<style scoped>
.v-card {
  max-width: 400px;
  width: 100%;
}
</style>
