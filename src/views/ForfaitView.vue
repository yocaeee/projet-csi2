<template>
    <v-container>
      <v-card>
        <v-card-title class="d-flex align-center">
          <h3>Liste des Forfaits</h3>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="dialogAjout = true">
            <v-icon left>mdi-plus</v-icon>
            Ajouter Forfait
          </v-btn>
        </v-card-title>
  
        <v-data-table
          :headers="headers"
          :items="forfaits"
          item-value="idforfait"
          class="elevation-1"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td>{{ item.idforfait }}</td>
              <td>{{ item.nom_client }} {{ item.prenom_client }}</td>
              <td>{{ item.nbseances }}</td>
              <td>{{ item.nbseancesrestantes }}</td>
              <td>{{ item.prix }}€</td>
              <td>{{ item.remise }}€</td>
              <td>{{ item.montanttotal }}€</td>
              <td>
                <v-btn 
                  icon 
                  color="green" 
                  @click="genererFacture(item)"
                  :disabled="item.paiement_effectue"
                >
                  <v-icon>mdi-file-document-outline</v-icon>
                </v-btn>
                <v-btn 
                icon 
                color="red" 
                  @click="supprimerForfait(item.idforfait)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
  
      <!-- Dialog Ajout Forfait -->
      <v-dialog v-model="dialogAjout" max-width="500px">
        <v-card>
          <v-card-title>Ajouter un Forfait</v-card-title>
          <v-card-text>
            <v-form>
              <v-select
                v-model="nouveauForfait.idClient"
                :items="clients"
                item-title="nom_complet"
                item-value="idclient"
                label="Client"
                required
              ></v-select>
              <v-select
                v-model="nouveauForfait.nbSeances"
                :items="forfaitOptions"
                label="Nombre de séances"
                item-title="label"
                item-value="nbSeances"
                @update:model-value="updatePrix"
                required
              ></v-select>
              <v-text-field 
                v-model="nouveauForfait.prix" 
                label="Prix" 
                type="number" 
                readonly 
                required
              ></v-text-field>
              <v-text-field 
                v-model="nouveauForfait.remise" 
                label="Remise" 
                type="number"
              ></v-text-field>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="dialogAjout = false">Annuler</v-btn>
            <v-btn color="primary" @click="addForfait">Ajouter</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  
      <!-- Dialog Génération Facture -->
      <v-dialog v-model="dialogFacture" max-width="500px">
        <v-card>
          <v-card-title>Générer une Facture</v-card-title>
          <v-card-text>
            <p>Forfait : {{ forfaitSelectionne?.idforfait }}</p>
            <p>Client : {{ forfaitSelectionne?.nom_client }} {{ forfaitSelectionne?.prenom_client }}</p>
            <p>Montant total : {{ forfaitSelectionne?.montanttotal }}€</p>
            <v-select
              v-model="nouveauPaiement.mode"
              :items="['carte_bancaire', 'virement', 'espèces']"
              label="Mode de paiement"
              required
            ></v-select>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="dialogFacture = false">Annuler</v-btn>
            <v-btn 
              color="primary" 
              @click="confirmerPaiement" 
              :disabled="forfaitSelectionne?.paiement_effectue"
            >
              Confirmer le paiement
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  
      <!-- Affichage des erreurs -->
      <v-alert 
        v-if="errorMessage" 
        type="error" 
        dismissible 
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>
  
      <!-- Alerte de succès -->
      <v-snackbar v-model="successMessageVisible" timeout="3000">
        Paiement effectué avec succès.
        <template #action="{ attrs }">
          <v-btn color="pink" text v-bind="attrs" @click.stop="">
            Fermer
          </v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import axios from "axios";
  
  // Options de forfaits prédéfinies
  const forfaitOptions = [
    { label: '1 séance (25€)', nbSeances: 1, prix: 25 },
    { label: '2 séances (42€)', nbSeances: 2, prix: 42 },
    { label: '5 séances (100€)', nbSeances: 5, prix: 100 }
  ];
  
  // Colonnes du tableau
  const headers = [
    { title: "ID", key: "idforfait", align: "center" },
    { title: "Client", key: "nom_client", align: "center" },
    { title: "Nb Séances", key: "nbseances", align: "center" },
    { title: "Séances Restantes", key: "nbseancesrestantes", align: "center" },
    { title: "Prix", key: "prix", align: "center" },
    { title: "Remise", key: "remise", align: "center" },
    { title: "Montant Total", key: "montanttotal", align: "center" },
    { title: "Actions", key: "actions", sortable: false, align: "center" }
  ];
  
  // États
  const forfaits = ref([]);
  const clients = ref([]);
  const errorMessage = ref("");
  const dialogAjout = ref(false);
  const dialogFacture = ref(false);
  const nouveauForfait = ref({ idClient: null, nbSeances: 0, prix: 0, remise: 0 });
  const nouveauPaiement = ref({ mode: '' });
  const forfaitSelectionne = ref(null);
  const successMessageVisible = ref(false);
  
  // Mettre à jour le prix en fonction du nombre de séances
  const updatePrix = (nbSeances) => {
    const forfait = forfaitOptions.find(f => f.nbSeances === nbSeances);
    if (forfait) {
      nouveauForfait.value.prix = forfait.prix;
      nouveauForfait.value.montantTotal = forfait.prix;
    }
  };
  
  // Charger les forfaits
  const fetchForfaits = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/forfaits");
      forfaits.value = response.data;
    } catch (error) {
      errorMessage.value = "Erreur lors de la récupération des forfaits";
    }
  };
  
  // Charger les clients
  const fetchClients = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/clients");
      clients.value = response.data.map(client => ({
        ...client,
        nom_complet: `${client.nom} ${client.prenom}`
      }));
    } catch (error) {
      errorMessage.value = "Erreur lors de la récupération des clients";
    }
  };
  
  // Ajouter un forfait
  const addForfait = async () => {
  if (!nouveauForfait.value.idClient || !nouveauForfait.value.nbSeances) {
    errorMessage.value = "❌ Veuillez sélectionner un client et un nombre de séances";
    return;
  }

  // Afficher les données envoyées
  console.log("📤 Envoi de la requête d'ajout de forfait :", nouveauForfait.value);

  try {
    await axios.post("http://localhost:5000/api/forfaits", {
      idClient: nouveauForfait.value.idClient,
      nbSeances: nouveauForfait.value.nbSeances,
      prix: nouveauForfait.value.prix,
      remise: nouveauForfait.value.remise || 0
    });

    fetchForfaits();
    dialogAjout.value = false;
    nouveauForfait.value = { idClient: null, nbSeances: 0, prix: 0, remise: 0 };
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du forfait :", error.response?.data?.error || error.message);
    errorMessage.value = error.response?.data?.error || "Erreur lors de l'ajout du forfait";
  }
};

  
  // Supprimer un forfait
  const supprimerForfait = async (idForfait) => {
    try {
      await axios.delete(`http://localhost:5000/api/forfaits/${idForfait}`);
      fetchForfaits();
    } catch (error) {
      errorMessage.value = error.response?.data?.error || "Erreur lors de la suppression du forfait";
    }
  };
  
  // Générer une facture
  const genererFacture = (forfait) => {
    forfaitSelectionne.value = forfait;
    dialogFacture.value = true;
  };
  
  // Confirmer le paiement et générer la facture
  const confirmerPaiement = async () => {
  if (forfaitSelectionne.value.paiement_effectue) {
    errorMessage.value = "Le paiement a déjà été effectué pour ce forfait";
    return;
  }

  try {
    // 🔹 Étape 1 : Créer la facture
    const factureResponse = await axios.post("http://localhost:5000/api/factures", {
      montantTotal: forfaitSelectionne.value.montanttotal,
      dateEmission: new Date().toISOString().split('T')[0],
      tva: 20 // Exemple de TVA à 20%
    });

    const idFacture = factureResponse.data.idFacture;

    // 🔹 Étape 2 : Associer un paiement à cette facture
    await axios.post("http://localhost:5000/api/paiements", {
      montant: forfaitSelectionne.value.montanttotal,
      mode: nouveauPaiement.value.mode,
      idFacture: idFacture,
      idClient: forfaitSelectionne.value.idclient
    });

    // 🔹 Rafraîchir les données pour mettre à jour l’état des paiements
    fetchForfaits();

    dialogFacture.value = false;

    // ✅ Afficher un message de succès
    successMessageVisible.value = true;

  } catch (error) {
    errorMessage.value = `Erreur lors de la génération de la facture : ${error.response?.data?.error || error.message}`;
  }
};

  
  onMounted(() => {
    fetchForfaits();
    fetchClients();
  });
  </script>
  