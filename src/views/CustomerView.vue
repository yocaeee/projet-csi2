<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste des Clients</h3>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialogAjout = true">
          <v-icon left>mdi-plus</v-icon>
          Ajouter Client
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="clients" item-value="idclient" class="elevation-1">
        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.idclient }}</td>
            <td>{{ item.nom }}</td>
            <td>{{ item.prenom }}</td>
            <td>{{ item.email }}</td>
            <td>{{ item.numtel }}</td>
            <td>{{ item.niveau }}</td>
            <td>{{ item.nom_camping || 'Non assigné' }}</td>
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
        <v-card-title>Ajouter un Client</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field v-model="nouveauClient.nom" label="Nom" required></v-text-field>
            <v-text-field v-model="nouveauClient.prenom" label="Prénom" required></v-text-field>
            <v-text-field v-model="nouveauClient.email" label="Email" required></v-text-field>
            <v-text-field v-model="nouveauClient.numTel" label="Téléphone" required></v-text-field>
            <v-select v-model="nouveauClient.niveau" :items="['débutant', 'non_débutant']" label="Niveau"
              required></v-select>
            <v-select v-model="nouveauClient.idCamping" :items="campings" item-title="nom" item-value="idcamping"
              label="Camping"></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogAjout = false">Annuler</v-btn>
          <v-btn color="primary" @click="addClient">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogConfirmation" max-width="400px">
      <v-card>
        <v-card-title>Confirmer la Suppression</v-card-title>
        <v-card-text>
          Voulez-vous vraiment supprimer {{ clientToDelete?.nom }} {{ clientToDelete?.prenom }} ?
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogConfirmation = false">Annuler</v-btn>
          <v-btn color="red" @click="removeClient">Supprimer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-alert v-if="errorMessage" type="error" dismissible @click:close="errorMessage = ''">
      {{ errorMessage }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const headers = [
  { title: "ID", key: "idclient", align: "center" },
  { title: "Nom", key: "nom", align: "center" },
  { title: "Prénom", key: "prenom", align: "center" },
  { title: "Email", key: "email", align: "center" },
  { title: "Téléphone", key: "numtel", align: "center" },
  { title: "Niveau", key: "niveau", align: "center" },
  { title: "Camping", key: "nom_camping", align: "center" },
  { title: "Actions", key: "actions", sortable: false, align: "center" }
];

const clients = ref([]);
const campings = ref([]);
const errorMessage = ref("");
const dialogAjout = ref(false);
const dialogConfirmation = ref(false);
const clientToDelete = ref(null);
const nouveauClient = ref({ nom: "", prenom: "", email: "", numTel: "", niveau: "", idCamping: null });

const fetchClients = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/clientspage");
    clients.value = response.data;
  } catch (error) {
    errorMessage.value = "Erreur lors de la récupération des clients";
  }
};

const fetchCampings = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/campingsname");
    campings.value = response.data;
  } catch (error) {
    errorMessage.value = "Erreur lors de la récupération des campings";
  }
};

const addClient = async () => {
  try {
    await axios.post("http://localhost:5000/api/clients", nouveauClient.value);
    fetchClients();
    dialogAjout.value = false;
    nouveauClient.value = { nom: "", prenom: "", email: "", numTel: "", niveau: "", idCamping: null };
  } catch (error) {
    errorMessage.value = "Erreur lors de l'ajout du client.";
  }
};

const confirmDelete = (client) => {
  clientToDelete.value = client;
  dialogConfirmation.value = true;
};

const removeClient = async () => {
  if (!clientToDelete.value || !clientToDelete.value.idclient) {
    errorMessage.value = "Erreur: Aucun ID client à supprimer";
    return;
  }

  try {
    await axios.delete(`http://localhost:5000/api/clients/${clientToDelete.value.idclient}`);
    fetchClients();
    dialogConfirmation.value = false;
    clientToDelete.value = null;
  } catch (error) {
    errorMessage.value = "Erreur lors de la suppression du client.";
  }
};

onMounted(() => {
  fetchClients();
  fetchCampings();
});
</script>