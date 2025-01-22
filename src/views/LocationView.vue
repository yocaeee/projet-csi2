<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste des Locations</h3>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialogAjout = true">
          <v-icon left>mdi-plus</v-icon>
          Ajouter Location
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="locations" item-value="idLocation" class="elevation-1">
        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.idLocation }}</td>
            <td>{{ item.date }}</td>
            <td>{{ item.heureDebut }}</td>
            <td>{{ item.duree }}h</td>
            <td>{{ item.montantCaution }}€</td>
            <td>{{ item.etatRetour }}</td>
            <td>{{ item.remise }}€</td>
            <td>{{ item.cautionRendue ? "Oui" : "Non" }}</td>
            <td>{{ item.montantTotal }}€</td>
            <td>{{ item.idMateriel }}</td>
            <td>
              <v-btn icon color="red" @click="confirmDelete(item)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <!-- Dialog Ajout Location -->
    <v-dialog v-model="dialogAjout" max-width="500px">
      <v-card>
        <v-card-title>Ajouter une Location</v-card-title>
        <v-card-text>
          <v-form ref="formAjout">
            <v-text-field v-model="nouvelleLocation.date" label="Date" type="date" required></v-text-field>
            <v-text-field v-model="nouvelleLocation.heureDebut" label="Heure de début" type="time"
              required></v-text-field>
            <v-text-field v-model="nouvelleLocation.duree" label="Durée (heures)" type="number" required></v-text-field>
            <v-text-field v-model="nouvelleLocation.montantCaution" label="Montant Caution (€)" type="number"
              required></v-text-field>
            <v-select v-model="nouvelleLocation.etatRetour" :items="['bon', 'endommagé']" label="État Retour"
              required></v-select>
            <v-text-field v-model="nouvelleLocation.remise" label="Remise (€)" type="number"></v-text-field>
            <v-switch v-model="nouvelleLocation.cautionRendue" label="Caution Rendue"></v-switch>
            <v-text-field v-model="nouvelleLocation.montantTotal" label="Montant Total (€)" type="number"
              required></v-text-field>
            <v-text-field v-model="nouvelleLocation.idMateriel" label="ID Matériel" type="number"
              required></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogAjout = false">Annuler</v-btn>
          <v-btn color="primary" @click.prevent="addLocation">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Confirmation Suppression -->
    <v-dialog v-model="dialogConfirmation" max-width="400px">
      <v-card>
        <v-card-title>Confirmer la Suppression</v-card-title>
        <v-card-text>
          Voulez-vous vraiment supprimer la location du {{ locationToDelete?.date }} ?
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogConfirmation = false">Annuler</v-btn>
          <v-btn color="red" @click.prevent="removeLocation">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Affichage des erreurs -->
    <v-alert v-if="errorMessage" type="error" dismissible @click:close="errorMessage = ''">
      {{ errorMessage }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

// Colonnes du tableau
const headers = [
  { title: "ID", key: "idLocation", align: "center" },
  { title: "Date", key: "date", align: "center" },
  { title: "Heure Début", key: "heureDebut", align: "center" },
  { title: "Durée", key: "duree", align: "center" },
  { title: "Caution (€)", key: "montantCaution", align: "center" },
  { title: "État Retour", key: "etatRetour", align: "center" },
  { title: "Remise (€)", key: "remise", align: "center" },
  { title: "Caution Rendue", key: "cautionRendue", align: "center" },
  { title: "Montant Total (€)", key: "montantTotal", align: "center" },
  { title: "ID Matériel", key: "idMateriel", align: "center" },
  { title: "Actions", key: "actions", sortable: false, align: "center" }
];

// États
const locations = ref([]);
const errorMessage = ref("");
const dialogAjout = ref(false);
const dialogConfirmation = ref(false);
const locationToDelete = ref(null);
const nouvelleLocation = ref({
  date: "",
  heureDebut: "",
  duree: "",
  montantCaution: "",
  etatRetour: "",
  remise: "",
  cautionRendue: false,
  montantTotal: "",
  idMateriel: ""
});

// Charger les locations
const fetchLocations = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/locations");
    locations.value = response.data.map(loc => ({
      idLocation: loc.idlocation,
      date: loc.date,
      heureDebut: loc.heuredebut,
      duree: loc.duree,
      montantCaution: loc.montantcaution,
      etatRetour: loc.etatretour,
      remise: loc.remise,
      cautionRendue: loc.cautionrendue,
      montantTotal: loc.montanttotal,
      idMateriel: loc.idmateriel
    }));
  } catch (error) {
    errorMessage.value = "Erreur lors de la récupération des locations.";
  }
};

// Ajouter une location
const addLocation = async () => {
  try {
    await axios.post("http://localhost:5000/api/locations", nouvelleLocation.value);
    fetchLocations();
    dialogAjout.value = false;
  } catch (error) {
    errorMessage.value = `Erreur lors de l'ajout : ${error.response?.data?.error || error.message}`;
  }
};

// Fonction pour demander confirmation avant suppression
const confirmDelete = (location) => {
  locationToDelete.value = location;
  dialogConfirmation.value = true;
};

// Fonction pour supprimer une location
const removeLocation = async () => {
  if (!locationToDelete.value?.idLocation) {
    errorMessage.value = "Erreur : Aucun ID de location valide.";
    return;
  }

  try {
    await axios.delete(`http://localhost:5000/api/locations/${locationToDelete.value.idLocation}`);
    fetchLocations();
    dialogConfirmation.value = false;
    locationToDelete.value = null;
  } catch (error) {
    errorMessage.value = `Erreur lors de la suppression : ${error.response?.data?.error || error.message}`;
  }
};

// Charger les données au montage
onMounted(fetchLocations);
</script>