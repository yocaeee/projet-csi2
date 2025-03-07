<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste des Campings</h3>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openAddCampingDialog">
          <v-icon left>mdi-plus</v-icon>
          Ajouter Camping
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="campings" item-value="idcamping" class="elevation-1">
        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.idcamping }}</td>
            <td>{{ item.nom }}</td>
            <td>{{ item.partenaire ? 'Oui' : 'Non' }}</td>
            <td>
              <v-btn icon color="red" @click="confirmDelete(item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialogAjout" max-width="500px">
      <v-card>
        <v-card-title>Ajouter un Camping</v-card-title>
        <v-card-text>
          <v-form ref="formAjout">
            <v-text-field v-model="nouveauCamping.nom" label="Nom du Camping" required></v-text-field>

            <v-switch v-model="nouveauCamping.partenaire" label="Partenaire"></v-switch>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogAjout = false">Annuler</v-btn>
          <v-btn color="primary" @click="addCamping">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogConfirmation" max-width="400px">
      <v-card>
        <v-card-title>Confirmer la Suppression</v-card-title>
        <v-card-text>Êtes-vous sûr de vouloir supprimer ce camping ?</v-card-text>
        <v-card-actions>
          <v-btn @click="dialogConfirmation = false">Annuler</v-btn>
          <v-btn color="red" @click="removeCamping">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-alert v-if="errorMessage" type="error" dismissible @click:close="errorMessage = ''">
      {{ errorMessage }}
    </v-alert>
  </v-container>
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const headers = [
  { title: 'ID', value: 'idcamping', align: "center" },
  { title: 'Nom', value: 'nom', align: "center" },
  { title: 'Partenaire', value: 'partenaire', align: "center" },
  { title: 'Actions', value: 'actions', align: "center" }
];

const campings = ref([]);
const errorMessage = ref('');
const dialogAjout = ref(false);
const dialogConfirmation = ref(false);
const campingToDelete = ref(null);

const nouveauCamping = ref({
  nom: '',
  partenaire: false,
});

const fetchCampings = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/camping');
    campings.value = response.data;
  } catch (error) {
    errorMessage.value = "Erreur lors de la récupération des campings";
  }
};

const openAddCampingDialog = () => {
  dialogAjout.value = true;
};

const addCamping = async () => {
  try {
    await axios.post('http://localhost:5000/api/camping', nouveauCamping.value);
    await fetchCampings();
    dialogAjout.value = false;

    nouveauCamping.value = { nom: '', partenaire: false };
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Erreur lors de l'ajout du camping";
  }
};

const confirmDelete = (camping) => {
  campingToDelete.value = camping;
  dialogConfirmation.value = true;
};

const removeCamping = async () => {
  try {
    await axios.delete(`http://localhost:5000/api/camping/${campingToDelete.value.idcamping}`);
    await fetchCampings();

    dialogConfirmation.value = false;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Erreur lors de la suppression du camping";
  }
};

onMounted(fetchCampings);
</script>

<style scoped>
.v-data-table {
  margin-top: 20px;
}
</style>
