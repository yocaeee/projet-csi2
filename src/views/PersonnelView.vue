<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste du Personnel</h3>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="dialogAjout = true">
          <v-icon left>mdi-plus</v-icon>
          Ajouter Personnel
        </v-btn>
      </v-card-title>

      <v-data-table :headers="headers" :items="personnel" item-value="idUtilisateur" class="elevation-1">
        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.idutilisateur }}</td>
            <td>{{ item.nom }}</td>
            <td>{{ item.prenom }}</td>
            <td>{{ item.email }}</td>
            <td>{{ item.numtel }}</td>
            <td>{{ item.role }}</td>
            <td>
              <v-btn icon color="red" @click="confirmDelete(item)" :disabled="item.idutilisateur === 1">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="dialogAjout" max-width="500px">
      <v-card>
        <v-card-title>Ajouter un Membre du Personnel</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field v-model="nouveauPersonnel.nom" label="Nom" required></v-text-field>
            <v-text-field v-model="nouveauPersonnel.prenom" label="Prénom" required></v-text-field>
            <v-text-field v-model="nouveauPersonnel.email" label="Email" required></v-text-field>
            <v-text-field v-model="nouveauPersonnel.numTel" label="Téléphone" required></v-text-field>
            <v-text-field v-model="nouveauPersonnel.motDePasse" label="Mot de passe" type="password"
              required></v-text-field>
            <v-select v-model="nouveauPersonnel.role"
              :items="['Administrateur', 'Moniteur', 'Propriétaire', 'Garçon de Plage']" label="Rôle"
              required></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogAjout = false">Annuler</v-btn>
          <v-btn color="primary" @click="addPersonnel">Ajouter</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogConfirmation" max-width="400px">
      <v-card>
        <v-card-title>Confirmer la Suppression</v-card-title>
        <v-card-text>
          Voulez-vous vraiment supprimer {{ personnelToDelete?.nom }} {{ personnelToDelete?.prenom }} ?
        </v-card-text>
        <v-card-actions>
          <v-btn @click="dialogConfirmation = false">Annuler</v-btn>
          <v-btn color="red" @click="removePersonnel">Supprimer</v-btn>
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
  { title: "ID", key: "idutilisateur", align: "center" },
  { title: "Nom", key: "nom", align: "center" },
  { title: "Prénom", key: "prenom", align: "center" },
  { title: "Email", key: "email", align: "center" },
  { title: "Téléphone", key: "numtel", align: "center" },
  { title: "Rôle", key: "role", align: "center" },
  { title: "Actions", key: "actions", sortable: false, align: "center" }
];

const personnel = ref([]);
const errorMessage = ref("");
const dialogAjout = ref(false);
const dialogConfirmation = ref(false);
const personnelToDelete = ref(null);
const nouveauPersonnel = ref({ nom: "", prenom: "", email: "", numTel: "", motDePasse: "", role: "" });

const fetchPersonnel = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/personnel");
    personnel.value = response.data;
  } catch (error) {
    errorMessage.value = "Erreur lors de la récupération du personnel";
  }
};

const addPersonnel = async () => {
  try {
    await axios.post("http://localhost:5000/api/personnel", nouveauPersonnel.value);
    fetchPersonnel();
    dialogAjout.value = false;
    nouveauPersonnel.value = { nom: "", prenom: "", email: "", numTel: "", motDePasse: "", role: "" };
  } catch (error) {
    errorMessage.value = "Erreur lors de l'ajout du personnel.";
  }
};

const confirmDelete = (person) => {
  const userId = person.idutilisateur ?? person.idutilisateur;

  if (!userId) {
    console.error("Erreur : ID utilisateur invalide", person);
    errorMessage.value = "Erreur : ID utilisateur invalide";
    return;
  }

  console.log("Personnel sélectionné pour suppression :", userId);
  personnelToDelete.value = { ...person, idutilisateur: userId };
  dialogConfirmation.value = true;
};

const removePersonnel = async () => {
  if (!personnelToDelete.value || !personnelToDelete.value.idutilisateur) {
    console.error("Erreur: Aucun ID utilisateur à supprimer", personnelToDelete.value);
    errorMessage.value = "Erreur: Aucun ID utilisateur à supprimer";
    return;
  }

  console.log("Suppression du personnel avec ID:", personnelToDelete.value.idutilisateur);

  try {
    await axios.delete(`http://localhost:5000/api/personnel/${personnelToDelete.value.idutilisateur}`);
    fetchPersonnel();
    dialogConfirmation.value = false;
    personnelToDelete.value = null;
  } catch (error) {
    console.error("Erreur lors de la suppression :", error);
    errorMessage.value = "Erreur lors de la suppression du personnel.";
  }
};

onMounted(fetchPersonnel);
</script>