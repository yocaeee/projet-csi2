<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste du Matériel</h3>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openAddMaterielDialog">
          <v-icon left>mdi-plus</v-icon>
          Ajouter Matériel
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="sortedMateriels"
        item-value="idmateriel"
        class="elevation-1"
      >
        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.idmateriel }}</td>
            <td>{{ item.quantite }}</td>
            <td>{{ item.disponible ? 'Oui' : 'Non' }}</td>
            <td>{{ item.tarifhoraire }}€</td>
            <td>
              <v-select
                v-model="item.etat"
                :items="etatOptions"
                @change="updateEtat(item)"
                hide-details
              ></v-select>
            </td>
            <td>{{ item.type }}</td>
            <td>
              <v-btn icon @click="openDetailsDialog(item)">
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </td>
            <td>
              <v-btn icon color="red" @click="confirmDelete(item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog Ajout Matériel -->
    <v-dialog v-model="dialogAjout" max-width="600px">
      <v-card>
        <v-card-title>Ajouter un Matériel</v-card-title>
        <v-card-text>
          <v-form ref="formAjout">
            <v-select
              v-model="nouveauMateriel.type"
              :items="typeOptions"
              label="Type de Matériel"
              required
            ></v-select>
            
            <v-text-field
              v-model.number="nouveauMateriel.quantite"
              type="number"
              label="Quantité"
              required
            ></v-text-field>
            
            <v-text-field
              v-model.number="nouveauMateriel.tarifhoraire"
              type="number"
              label="Tarif Horaire"
              required
            ></v-text-field>
            
            <v-switch
              v-model="nouveauMateriel.disponible"
              label="Disponible"
            ></v-switch>
            
            <v-select
              v-model="nouveauMateriel.etat"
              :items="etatOptions"
              label="État"
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogAjout = false">Annuler</v-btn>
          <v-btn color="primary" @click="addMateriel">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Détails Matériel -->
    <v-dialog v-model="dialogDetails" max-width="500px">
      <v-card v-if="selectedMateriel">
        <v-card-title>Détails du Matériel</v-card-title>
        <v-card-text>
          <p><strong>ID:</strong> {{ selectedMateriel.idmateriel }}</p>
          <p><strong>Type:</strong> {{ selectedMateriel.type }}</p>
          <p><strong>Quantité:</strong> {{ selectedMateriel.quantite }}</p>
          <p><strong>Tarif Horaire:</strong> {{ selectedMateriel.tarifhoraire }}€</p>
          <p><strong>Disponible:</strong> {{ selectedMateriel.disponible ? 'Oui' : 'Non' }}</p>
          <p><strong>État:</strong> {{ selectedMateriel.etat }}</p>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogDetails = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Confirmation Suppression -->
    <v-dialog v-model="dialogConfirmation" max-width="400px">
      <v-card>
        <v-card-title>Confirmer la Suppression</v-card-title>
        <v-card-text>
          Êtes-vous sûr de vouloir supprimer ce matériel ?
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogConfirmation = false">Annuler</v-btn>
          <v-btn color="red" @click="removeMateriel">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Alerte d'erreur -->
    <v-alert 
      v-if="errorMessage" 
      type="error" 
      dismissible
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

// Configuration des en-têtes
const headers = [
  { title: 'ID', value: 'idmateriel', align: "center" },
  { title: 'Quantité', value: 'quantite', align: "center" },
  { title: 'Disponible', value: 'disponible', align: "center" },
  { title: 'Tarif Horaire', value: 'tarifhoraire', align: "center" },
  { title: 'État', value: 'etat', align: "center" },
  { title: 'Type', value: 'type', align: "center" },
  { title: 'Détails', align: "center" },
  { title: 'Actions', align: "center" }
];

// Options pour les états et types
const etatOptions = ['reçu', 'fonctionnel', 'mis_au_rebut'];
const typeOptions = ['Flotteur', 'Voile', 'Paddle', 'Pedalo', 'Catamaran', 'Hors-Bord'];

// États réactifs
const materiels = ref([]);
const errorMessage = ref('');
const dialogAjout = ref(false);
const dialogDetails = ref(false);
const dialogConfirmation = ref(false);
const selectedMateriel = ref(null);
const materielToDelete = ref(null);

// Nouveau matériel par défaut
const nouveauMateriel = ref({
  type: null,
  quantite: 1,
  tarifhoraire: 0,
  disponible: true,
  etat: 'reçu'
});

// Méthode pour récupérer les matériels
const fetchMateriels = async () => {
  try {
    const response = await axios.get('http://localhost:5000/api/materiel');
    materiels.value = response.data;
  } catch (error) {
    errorMessage.value = "Erreur lors de la récupération des matériels";
  }
};

// Tri des matériels
const sortedMateriels = computed(() => {
  return [...materiels.value].sort((a, b) => a.type.localeCompare(b.type));
});

// Mise à jour de l'état
const updateEtat = async (item) => {
  try {
    await axios.put(`http://localhost:5000/api/materiel/${item.idmateriel}/etat`, { 
      etat: item.etat 
    });
  } catch (error) {
    errorMessage.value = "Erreur lors de la mise à jour de l'état";
  }
};

// Ouverture du dialogue d'ajout
const openAddMaterielDialog = () => {
  dialogAjout.value = true;
};

// Ajout de matériel
const addMateriel = async () => {
  try {
    await axios.post('http://localhost:5000/api/materiel', nouveauMateriel.value);
    await fetchMateriels();
    dialogAjout.value = false;
    // Réinitialiser le formulaire
    nouveauMateriel.value = {
      type: null,
      quantite: 1,
      tarifhoraire: 0,
      disponible: true,
      etat: 'reçu'
    };
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Erreur lors de l'ajout du matériel";
  }
};

// Ouverture du dialogue de détails
const openDetailsDialog = (item) => {
  selectedMateriel.value = item;
  dialogDetails.value = true;
};

// Confirmation de suppression
const confirmDelete = (item) => {
  materielToDelete.value = item;
  dialogConfirmation.value = true;
};

// Suppression de matériel
const removeMateriel = async () => {
  try {
    await axios.delete(`http://localhost:5000/api/materiel/${materielToDelete.value.idmateriel}`);
    await fetchMateriels();
    dialogConfirmation.value = false;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || "Erreur lors de la suppression du matériel";
  }
};

// Chargement initial
onMounted(fetchMateriels);
</script>

<style scoped>
.v-data-table {
  margin-top: 20px;
}
</style>