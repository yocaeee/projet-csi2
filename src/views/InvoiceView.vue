<template>
  <v-container>
    <v-card>
      <v-card-title class="d-flex align-center">
        <h3>Liste des Factures</h3>
      </v-card-title>

      <v-data-table :headers="headers" :items="factures" item-value="idfacture" class="elevation-1">
        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.idfacture }}</td>
            <td>{{ item.nom_client }} {{ item.prenom_client }}</td>
            <td>{{ item.montanttotal }}€</td>
            <td>{{ formatDate(item.dateemission) }}</td>
            <td>{{ item.tva }}%</td>
            <td>{{ item.mode_paiement }}</td>
            <td>
              <v-btn icon color="blue" @click="generatePDF(item)">
                <v-icon>mdi-file-pdf-box</v-icon>
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </v-card>

    <v-alert v-if="errorMessage" type="error" dismissible @click:close="errorMessage = ''">
      {{ errorMessage }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";
import jsPDF from 'jspdf'

const headers = [
  { title: "ID Facture", key: "idfacture", align: "center" },
  { title: "Client", key: "nom_client", align: "center" },
  { title: "Montant Total", key: "montanttotal", align: "center" },
  { title: "Date d'émission", key: "dateemission", align: "center" },
  { title: "TVA", key: "tva", align: "center" },
  { title: "Mode de paiement", key: "mode_paiement", align: "center" },
  { title: "Actions", key: "actions", sortable: false, align: "center" }
];

const factures = ref([]);
const errorMessage = ref("");

const fetchFactures = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/factures");
    factures.value = response.data;
  } catch (error) {
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const generatePDF = (facture) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 105, 30, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Numéro de facture : ${facture.idfacture}`, 20, 50);
  doc.text(`Date : ${formatDate(new Date().toISOString())}`, 20, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Informations Client', 20, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom : ${facture.nom_client} ${facture.prenom_client}`, 20, 90);

  doc.setFont('helvetica', 'bold');
  doc.text('Détails', 20, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(`Montant total : ${facture.montanttotal}€`, 20, 120);
  doc.text(`TVA : ${facture.tva}%`, 20, 130);
  doc.text(`Mode de paiement : ${facture.mode_paiement}`, 20, 140);

  doc.line(20, 160, 190, 160);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total TTC : ${facture.montanttotal}€`, 20, 170);

  doc.save(`Facture_${facture.idfacture}.pdf`);
};

onMounted(() => {
  fetchFactures();
});
</script>