<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste des cours</h3>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openNewCourseDialog">
          <v-icon left>mdi-plus</v-icon>
          Créer un nouveau cours
        </v-btn>
      </v-card-title>

      <v-data-table
        :items="lessons"
        :headers="headers"
        class="elevation-1"
        item-value="idcours"
        dense
      >
        <!-- Retirer le slot top -->
        <!-- eslint-disable-next-line vue/valid-v-slot -->
        <template v-slot:item.actions="{ item }">
          <v-btn icon @click="openClientDialog(item)">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </template>
        <!-- eslint-disable-next-line vue/valid-v-slot -->
        <template v-slot:item.removeParticipant="{ item }">
          <v-btn icon @click="openRemoveClientDialog(item)">
            <v-icon>mdi-minus</v-icon>
          </v-btn>
        </template>
        <!-- eslint-disable-next-line vue/valid-v-slot -->
        <template v-slot:item.delete="{ item }">
          <v-btn icon color="red" @click="deleteCourse(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
  </v-container>

    <!-- Dialogue pour ajouter un client -->
    <v-dialog v-model="dialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Ajouter un client au cours</v-card-title>
        <v-card-text>
          <v-tabs v-model="activeTab">
            <v-tab value="select">Sélectionner un client existant</v-tab>
            <v-tab value="create">Créer un nouveau client</v-tab>
          </v-tabs>

          <v-window v-model="activeTab">
            <v-window-item value="select">
              <v-select
                v-model="selectedClient"
                :items="clients"
                item-title="fullName"
                item-value="idclient"
                label="Sélectionner un client"
                return-object
              ></v-select>
            </v-window-item>

            <v-window-item value="create">
              <v-form @submit.prevent="createNewClient">
                <v-text-field v-model="newClient.nom" label="Nom" required></v-text-field>
                <v-text-field v-model="newClient.prenom" label="Prénom" required></v-text-field>
                <v-text-field v-model="newClient.numtel" label="Numéro de téléphone" required></v-text-field>
                <v-text-field v-model="newClient.email" label="Email" required></v-text-field>
                <v-select
                  v-model="newClient.niveau"
                  :items="['débutant', 'non_débutant']"
                  label="Niveau"
                  required
                ></v-select>
              </v-form>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="closeDialog">Annuler</v-btn>
          <v-btn color="blue darken-1" text @click="activeTab === 'select' ? addSelectedClientToCourse() : createNewClient()">
            {{ activeTab === 'select' ? 'Ajouter' : 'Créer et Ajouter' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Nouveau dialogue pour supprimer un client -->
    <v-dialog v-model="removeClientDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Supprimer un client du cours</v-card-title>
        <v-card-text>
          <h3>Clients inscrits</h3>
          <v-list>
            <v-list-item v-for="client in enrolledClients" :key="client.idclient">
              <v-list-item-content>
                {{ client.prenom }} {{ client.nom }} - Niveau: {{ client.niveau }}
              </v-list-item-content>
              <v-list-item-action>
                <v-btn icon @click="removeClientFromCourse(client)">
                  <v-icon>mdi-delete</v-icon> 
                </v-btn> 
              </v-list-item-action> 
            </v-list-item> 
          </v-list> 
        </v-card-text> 
        <v-card-actions> 
          <v-spacer></v-spacer> 
          <v-btn color="blue darken-1" text @click="closeRemoveClientDialog">Fermer</v-btn> 
        </v-card-actions> 
      </v-card> 
    </v-dialog>

    <v-dialog v-model="newCourseDialogOpen" max-width="500px">
      <v-card>
        <v-card-title>Créer un nouveau cours</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="createNewCourse">
            <v-date-picker
              v-model="newCourse.date"
              label="Date"
              required
            ></v-date-picker>

            <v-text-field v-model="newCourse.heureDebut" label="Heure de début (HH:MM)" required></v-text-field>
            <v-text-field v-model="newCourse.heureFin" label="Heure de fin (HH:MM)" required></v-text-field>
            <v-text-field v-model.number="newCourse.nbParticipants" label="Nombre de participants" type="number" required></v-text-field>
            <v-select v-model="newCourse.statut" :items="['prévu', 'proposé']" label="Statut" required></v-select>
            <v-select v-model="newCourse.niveau" :items="['débutant', 'non_débutant']" label="Niveau" required></v-select>
            <v-select
              v-model="newCourse.idMoniteur"
              :items="moniteurs"
              item-title="nom"
              item-value="idMoniteur"
              label="Moniteur"
              required
            ></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="closeNewCourseDialog">Annuler</v-btn>
          <v-btn color="blue darken-1" text @click="createNewCourse">Créer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>


<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const lessons = ref([]);
const clients = ref([]);
const dialogOpen = ref(false);
const selectedClient = ref(null);
const currentCourse = ref(null);
const activeTab = ref('select');
const newClient = ref({
  nom: '',
  prenom: '',
  numtel: '',
  email: '',
  niveau: ''
});

const headers = [
  { title: "ID Cours", value: "idcours", align: "center" },
  { title: "Date", value: "date", align: "center" },
  { title: "Heure Début", value: "heuredebut", align: "center" },
  { title: "Heure Fin", value: "heurefin", align: "center" },
  { title: "Nombre de Participants", value: "nbparticipants", align: "center" },
  { title: "Statut", value: "statut", align: "center" },
  { title: "Niveau", value: "niveau", align: "center" },
  { title: "ID Moniteur", value: "idmoniteur", align: "center" },
  { title: "Ajouter un participant", value: "actions", sortable: false, align: "center" },
  { title: "Supprimer un participant", value: "removeParticipant", sortable: false, align: "center" },
  { title: "Supprimer le cours", value: "delete", sortable: false, align: "center" },
];

const newCourseDialogOpen = ref(false);
const moniteurs = ref([]);
const newCourse = ref({
  date: new Date(),
  heureDebut: '',
  heureFin: '',
  nbParticipants: 0,
  statut: '',
  niveau: '',
  idMoniteur: null
});




function formatDateToFrench(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const loadClients = async () => {
  try {
    const response = await axios.get(`http://localhost:5000/api/lessons/${currentCourse.value.idcours}/availableClients`);
    clients.value = response.data.map(client => ({
      ...client,
      fullName: `${client.prenom} ${client.nom} - Niveau: ${client.niveau}`
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des clients disponibles :", error);
  }
};

const openClientDialog = (course) => {
  currentCourse.value = course;
  dialogOpen.value = true;
  loadClients();
};

const closeDialog = () => {
  dialogOpen.value = false;
  selectedClient.value = null;
  activeTab.value = 'select';
  newClient.value = { nom: '', prenom: '', numtel: '', email: '', niveau: '' };
};

const addSelectedClientToCourse = async () => {
  if (selectedClient.value && currentCourse.value) {
    if (currentCourse.value.nbparticipants >= 10) {
      alert("Ce cours est déjà complet. Maximum de participants atteint.");
      return;
    }
    try {
      const response = await axios.post(`http://localhost:5000/api/lessons/${currentCourse.value.idcours}/addClient`, {
        idclient: selectedClient.value.idclient
      });
      if (response.data.success) {
        currentCourse.value.nbparticipants++;
        alert("Client ajouté avec succès au cours.");
      }
      closeDialog();
    } catch (error) {
      console.error("Erreur lors de l'ajout du client au cours :", error);
      alert("Erreur lors de l'ajout du client au cours. Veuillez réessayer.");
    }
  }
};

const createNewClient = async () => {
  try {
    const response = await axios.post("http://localhost:5000/api/clients", newClient.value);
    if (response.data.success) {
      const createdClient = response.data.client;
      clients.value.push({
        ...createdClient,
        fullName: `${createdClient.prenom} ${createdClient.nom} - Tél: ${createdClient.numtel} - Email: ${createdClient.email} - Niveau: ${createdClient.niveau}`
      });
      
      selectedClient.value = createdClient;
      await addSelectedClientToCourse();
    }
  } catch (error) {
    console.error("Erreur lors de la création du client :", error);
    alert("Erreur lors de la création du client. Veuillez réessayer.");
  }
};

const openNewCourseDialog = () => {
  newCourseDialogOpen.value = true;
  loadMoniteurs();
};

const closeNewCourseDialog = () => {
  newCourseDialogOpen.value = false;
  newCourse.value = {
    date: new Date(),
    heureDebut: '',
    heureFin: '',
    nbParticipants: 0,
    statut: '',
    niveau: '',
    idMoniteur: null
  };
};



const loadMoniteurs = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/moniteurs");
    moniteurs.value = response.data.map(moniteur => ({
      idMoniteur: moniteur.idmoniteur,
      nom: `${moniteur.prenom} ${moniteur.nom}`
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des moniteurs :", error);
  }
};


const createNewCourse = async () => {
  try {
    const formattedCourse = {
  ...newCourse.value,
  date: newCourse.value.date instanceof Date ? newCourse.value.date.toISOString().split('T')[0] : null,
  nbParticipants: parseInt(newCourse.value.nbParticipants),
  idMoniteur: parseInt(newCourse.value.idMoniteur)
};

    const response = await axios.post("http://localhost:5000/api/lessons/create", formattedCourse);
    if (response.data.success) {
      lessons.value.push(response.data.course);
      closeNewCourseDialog();
      alert("Cours créé avec succès.");
    }
  } catch (error) {
    console.error("Erreur lors de la création du cours :", error);
    alert("Erreur lors de la création du cours. Veuillez réessayer.");
  }
};

const deleteCourse = async (course) => {
  if (confirm(`Êtes-vous sûr de vouloir supprimer le cours du ${course.date} ?`)) {
    try {
      const response = await axios.delete(`http://localhost:5000/api/lessons/${course.idcours}`);
      if (response.data.success) {
        lessons.value = lessons.value.filter(l => l.idcours !== course.idcours);
        alert("Cours supprimé avec succès.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du cours :", error);
      alert("Erreur lors de la suppression du cours. Veuillez réessayer.");
    }
  }
};

const removeClientDialogOpen = ref(false);
const enrolledClients = ref([]);

const openRemoveClientDialog = async (course) => {
  currentCourse.value = course;
  removeClientDialogOpen.value = true;
  await loadEnrolledClients();
};

const closeRemoveClientDialog = () => {
  removeClientDialogOpen.value = false;
};

const loadEnrolledClients = async () => {
  try {
    const response = await axios.get(`http://localhost:5000/api/lessons/${currentCourse.value.idcours}/enrolledClients`);
    enrolledClients.value = response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des clients inscrits :", error);
  }
};

const removeClientFromCourse = async (client) => {
  if (confirm(`Êtes-vous sûr de vouloir retirer ${client.prenom} ${client.nom} de ce cours ?`)) {
    try {
      const response = await axios.delete(`http://localhost:5000/api/lessons/${currentCourse.value.idcours}/removeClient/${client.idclient}`);
      if (response.data.success) {
        enrolledClients.value = enrolledClients.value.filter(c => c.idclient !== client.idclient);
        currentCourse.value.nbparticipants = response.data.newParticipantCount;
        alert("Client retiré du cours avec succès.");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du client du cours :", error);
      alert("Erreur lors de la suppression du client du cours. Veuillez réessayer.");
    }
  }
};


onMounted(async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/lessons");
    lessons.value = response.data.map((lesson) => ({
      ...lesson,
      date: formatDateToFrench(lesson.date),
    }));
  } catch (error) {
    console.error("Erreur lors de la récupération des cours :", error);
  }
});
</script>

<style>
</style>
