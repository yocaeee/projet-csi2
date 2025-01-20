<template>
    <v-container>
      <v-card>
        <!-- Titre du tableau -->
        <v-card-title class="d-flex align-center">
          <h3>Horaires d'ouverture</h3>
        </v-card-title>
  
        <!-- Tableau des horaires -->
        <v-data-table
          :headers="headers"
          :items="horaires"
          item-value="idAccueil"
          class="elevation-1"
        >
          <template v-slot:item="{ item }">
            <tr>
              <!-- Bouton switch pour ouvert/fermé -->
              <td>
                <v-switch 
                  v-model="item.ouvert"
                  :label="item.ouvert ? 'Ouvert' : 'Fermé'"
                  @change="updateHoraire(item)"
                ></v-switch>
              </td>
  
              <!-- Date de fermeture (Toujours modifiable) -->
              <td>
                <v-text-field
                  v-model="item.dateFermeture"
                  label="Date Fermeture"
                  type="date"
                  clearable
                  @change="updateHoraire(item)"
                ></v-text-field>
              </td>
  
              <!-- Heure d'ouverture -->
              <td>
                <v-text-field
                  v-model="item.heureOuverture"
                  label="Heure Ouverture"
                  type="time"
                  @change="updateHoraire(item)"
                ></v-text-field>
              </td>
  
              <!-- Heure de fermeture -->
              <td>
                <v-text-field
                  v-model="item.heureFermeture"
                  label="Heure Fermeture"
                  type="time"
                  @change="updateHoraire(item)"
                ></v-text-field>
              </td>
  
              <!-- Adresse -->
              <td>
                <v-text-field
                  v-model="item.adresse"
                  label="Adresse"
                  @change="updateHoraire(item)"
                ></v-text-field>
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
  
  // Stocker les horaires d'accueil
  const horaires = ref([]);
  
  const headers = [
    { title: "Ouvert", key: "ouvert", align: 'center' },
    { title: "Date Fermeture", key: "dateFermeture", align: 'center' },
    { title: "Heure Ouverture", key: "heureOuverture", align: 'center' },
    { title: "Heure Fermeture", key: "heureFermeture", align: 'center' },
    { title: "Adresse", key: "adresse", align: 'center' }
  ];
  
  // Charger les données depuis le serveur
  const fetchHoraires = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/accueil");
      
      // Assurer que chaque champ est bien initialisé
      horaires.value = response.data.map(item => ({
        idAccueil: item.idaccueil,
        ouvert: item.ouvert,
        dateFermeture: item.datefermeture ? item.datefermeture.split("T")[0] : "", // Format YYYY-MM-DD
        heureOuverture: item.heureouverture || "00:00",
        heureFermeture: item.heurefermeture || "00:00",
        adresse: item.adresse
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération des horaires :", error);
    }
  };
  
  // Mettre à jour les horaires dans la base de données
  const updateHoraire = async (horaire) => {
    try {
      await axios.put(`http://localhost:5000/api/accueil/${horaire.idAccueil}`, horaire);
    } catch (error) {
      console.error("Erreur lors de la mise à jour :", error);
    }
  };
  
  onMounted(fetchHoraires);
  </script>
  
  <style scoped>
  /* Ajoutez ici vos styles personnalisés si nécessaire */
  </style>
  