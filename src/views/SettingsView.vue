<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Horaires d'ouverture</h3>
      </v-card-title>
      <v-data-table :headers="headers" :items="horaires" item-value="idAccueil" class="elevation-1">
        <template v-slot:item="{ item }">
          <tr>
            <td>
              <v-switch v-model="item.ouvert" :label="item.ouvert ? 'Ouvert' : 'Fermé'"
                @change="updateHoraire(item)"></v-switch>
            </td>
            <td>
              <v-text-field v-model="item.dateFermeture" label="Date Fermeture" type="date" clearable
                @change="updateHoraire(item)"></v-text-field>
            </td>
            <td>
              <v-text-field v-model="item.heureOuverture" label="Heure Ouverture" type="time"
                @change="updateHoraire(item)"></v-text-field>
            </td>
            <td>
              <v-text-field v-model="item.heureFermeture" label="Heure Fermeture" type="time"
                @change="updateHoraire(item)"></v-text-field>
            </td>
            <td>
              <v-text-field v-model="item.adresse" label="Adresse" @change="updateHoraire(item)"></v-text-field>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const horaires = ref([]);

const headers = [
  { title: "Ouvert", key: "ouvert", align: 'center' },
  { title: "Date Fermeture", key: "dateFermeture", align: 'center' },
  { title: "Heure Ouverture", key: "heureOuverture", align: 'center' },
  { title: "Heure Fermeture", key: "heureFermeture", align: 'center' },
  { title: "Adresse", key: "adresse", align: 'center' }
];

const fetchHoraires = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/accueil");

    horaires.value = response.data.map(item => ({
      idAccueil: item.idaccueil,
      ouvert: item.ouvert,
      dateFermeture: item.datefermeture ? item.datefermeture.split("T")[0] : "",
      heureOuverture: item.heureouverture || "00:00",
      heureFermeture: item.heurefermeture || "00:00",
      adresse: item.adresse
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des horaires :", error);
  }
};

const updateHoraire = async (horaire) => {
  try {
    await axios.put(`http://localhost:5000/api/accueil/${horaire.idAccueil}`, horaire);
  } catch (error) {
    console.error("Erreur lors de la mise à jour :", error);
  }
};

onMounted(fetchHoraires);
</script>

<style scoped></style>