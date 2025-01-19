const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.get("/api/lessons", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cours");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer la liste des clients
app.get("/api/clients", async (req, res) => {
  try {
    const result = await pool.query("SELECT idclient, nom, prenom, niveau FROM client");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/lessons/:idcours/addClient", async (req, res) => {
  const { idcours } = req.params;
  const { idclient } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Vérifier si le client est déjà inscrit au cours
    const checkInscription = await client.query(
      "SELECT * FROM InscriptionCours WHERE idcours = $1 AND idclient = $2",
      [idcours, idclient]
    );

    if (checkInscription.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: "Le client est déjà inscrit à ce cours" });
    }

    // Vérifier et réserver le matériel requis
    const materials = ['flotteur', 'voile', 'piedDeMat']; // Types de matériel requis
    for (const materialType of materials) {
      const materialCheck = await client.query(
        `INSERT INTO Location (date, heureDebut, duree, montantCaution, etatRetour, remise, cautionRendue, montantTotal, idMateriel)
         SELECT CURRENT_DATE, '00:00', 1, 0, 'bon', 0, TRUE, 0, m.idMateriel
         FROM Materiel m
         JOIN ${materialType} mt ON m.idMateriel = mt.idMateriel
         WHERE m.quantite > 0 AND m.etat <> 'mis_au_rebut'
         LIMIT 1
         RETURNING idMateriel`
      );

      if (materialCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Pas assez de ${materialType} disponible ou en bon état pour ce cours.` });
      }
    }

    // Incrémenter le nombre de participants
    const result = await client.query(
      "UPDATE Cours SET nbparticipants = nbparticipants + 1 WHERE idcours = $1 RETURNING nbparticipants",
      [idcours]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: "Cours non trouvé" });
    }

    // Ajouter l'inscription dans la table InscriptionCours
    await client.query(
      "INSERT INTO InscriptionCours (idcours, idclient) VALUES ($1, $2)",
      [idcours, idclient]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: "Client ajouté au cours avec succès", newParticipantCount: result.rows[0].nbparticipants });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de l'ajout du client au cours :", error.message);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});





// Nouvelle route pour récupérer les clients non inscrits à un cours spécifique
app.get("/api/lessons/:idcours/availableClients", async (req, res) => {
  const { idcours } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.idClient, c.nom, c.prenom, c.niveau 
       FROM Client c
       WHERE c.idClient NOT IN (
         SELECT ic.idClient 
         FROM InscriptionCours ic 
         WHERE ic.idCours = $1
       )`,
      [idcours]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer la liste des moniteurs
app.get("/api/moniteurs", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.idMoniteur, u.nom, u.prenom 
      FROM Moniteur m 
      JOIN Utilisateur u ON m.idMoniteur = u.idUtilisateur
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Créer un nouveau cours
app.post("/api/lessons/create", async (req, res) => {
  const { date, heureDebut, heureFin, nbParticipants, statut, niveau, idMoniteur } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Cours (date, heureDebut, heureFin, nbParticipants, statut, niveau, idMoniteur) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [date, heureDebut, heureFin, nbParticipants, statut, niveau, idMoniteur]
    );
    
    const course = result.rows[0];
    course.idMoniteur = course.idmoniteur;
    res.json({ success: true, course: course });
  } catch (error) {
    console.error("Erreur lors de la création du cours:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  }
});




// Authentification
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM Utilisateur WHERE email = $1 AND motDePasse = $2",
      [email, password]
    );
    
    if (result.rows.length === 1) {
      res.json({ success: true, message: "Connexion réussie" });
    } else {
      res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
    }
  } catch (error) {
    console.error("Erreur lors de l'authentification:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  }
});


app.delete("/api/lessons/:idcours", async (req, res) => {
  const { idcours } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Supprimer d'abord les inscriptions
    await client.query("DELETE FROM InscriptionCours WHERE idCours = $1", [idcours]);

    // Ensuite, supprimer le cours
    const result = await client.query("DELETE FROM Cours WHERE idCours = $1", [idcours]);

    if (result.rowCount > 0) {
      await client.query('COMMIT');
      res.json({ success: true, message: "Cours supprimé avec succès" });
    } else {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: "Cours non trouvé" });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la suppression du cours:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  } finally {
    client.release();
  }
});

app.get("/api/lessons/:idcours/enrolledClients", async (req, res) => {
  const { idcours } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.idclient, c.nom, c.prenom, c.niveau 
       FROM Client c
       JOIN InscriptionCours ic ON c.idclient = ic.idclient
       WHERE ic.idcours = $1`,
      [idcours]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des clients inscrits :", error.message);
    res.status(500).json({ error: error.message });
  }
});


app.delete("/api/lessons/:idcours/removeClient/:idclient", async (req, res) => {
  const { idcours, idclient } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Supprimer l'inscription
    await client.query("DELETE FROM InscriptionCours WHERE idCours = $1 AND idClient = $2", [idcours, idclient]);

    // Décrémenter le nombre de participants
    const result = await client.query(
      "UPDATE Cours SET nbParticipants = nbParticipants - 1 WHERE idCours = $1 RETURNING nbParticipants",
      [idcours]
    );

    await client.query('COMMIT');

    if (result.rows[0]) {
      res.json({ success: true, message: "Client retiré du cours avec succès", newParticipantCount: result.rows[0].nbparticipants });
    } else {
      res.status(404).json({ success: false, message: "Cours non trouvé" });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erreur lors de la suppression du client du cours:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
  } finally {
    client.release();
  }
});

app.get('/api/materiel', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
    m.idMateriel,
    m.quantite,
    m.disponible,
    m.tarifHoraire,
    m.tarifHeureSupp,
    m.etat,
    CASE 
        WHEN f.idMateriel IS NOT NULL THEN 'Flotteur'
        WHEN v.idMateriel IS NOT NULL THEN 'Voile'
        WHEN p1.idMateriel IS NOT NULL THEN 'Paddle'
        WHEN p2.idMateriel IS NOT NULL THEN 'Pedalo'
        WHEN c.idMateriel IS NOT NULL THEN 'Catamaran'
        WHEN h.idMateriel IS NOT NULL THEN 'Hors-Bord'
        WHEN pm.idMateriel IS NOT NULL THEN 'Pied de Mat'
        ELSE 'Autre'
    END AS type
FROM 
    Materiel m
LEFT JOIN Flotteur f ON m.idMateriel = f.idMateriel
LEFT JOIN Voile v ON m.idMateriel = v.idMateriel
LEFT JOIN Paddle p1 ON m.idMateriel = p1.idMateriel
LEFT JOIN Pedalo p2 ON m.idMateriel = p2.idMateriel
LEFT JOIN Catamaran c ON m.idMateriel = c.idMateriel
LEFT JOIN HorsBord h ON m.idMateriel = h.idMateriel
LEFT JOIN PiedDeMat pm ON m.idMateriel = pm.idMateriel


    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération du matériel :', error);
    res.status(500).json({ error: error.message });
  }
});




// Route pour mettre à jour l'état du matériel
app.put("/api/materiel/:id", async (req, res) => {
  const { id } = req.params;
  const { etat } = req.body; // Changer 'disponible' en 'etat'

  try {
    const result = await pool.query(
      "UPDATE Materiel SET etat = $1 WHERE idMateriel = $2",
      [etat, id]
    );

    if (result.rowCount > 0) {
      res.json({ success: true, message: "État mis à jour." });
    } else {
      res.status(404).json({ success: false, message: "Matériel non trouvé." });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'état du matériel:", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});

// Route pour ajouter un nouveau matériel
app.post("/api/materiel", async (req, res) => {
  const { 
    type, 
    quantite, 
    disponible, 
    tarifHoraire, 
    tarifHeureSupp, 
    etat 
  } = req.body;

  const client = await pool.connect();

  try {
    // Démarrer une transaction
    await client.query('BEGIN');

    // Insérer dans Materiel
    const materielQuery = `
      INSERT INTO Materiel 
      (quantite, disponible, tarifHoraire, tarifHeureSupp, etat) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING idMateriel
    `;
    const materielResult = await client.query(materielQuery, [
      quantite, 
      disponible, 
      tarifHoraire, 
      tarifHeureSupp, 
      etat
    ]);

    const newMaterielId = materielResult.rows[0].idmateriel;

    // Insérer dans la table spécifique selon le type
    switch(type) {
      case 'Flotteur':
        await client.query(
          'INSERT INTO Flotteur (idMateriel, volume) VALUES ($1, $2)', 
          [newMaterielId, req.body.volume || 0]
        );
        break;
      case 'Voile':
        await client.query(
          'INSERT INTO Voile (idMateriel, surface) VALUES ($1, $2)', 
          [newMaterielId, req.body.surface || 0]
        );
        break;
      case 'Paddle':
        await client.query(
          'INSERT INTO Paddle (idMateriel) VALUES ($1)', 
          [newMaterielId]
        );
        break;
      case 'Pedalo':
        await client.query(
          'INSERT INTO Pedalo (idMateriel, tarifDemiHeure) VALUES ($1, $2)', 
          [newMaterielId, req.body.tarifDemiHeure || 0]
        );
        break;
      case 'Catamaran':
        await client.query(
          'INSERT INTO Catamaran (idMateriel, modele) VALUES ($1, $2)', 
          [newMaterielId, req.body.modele || 'Non spécifié']
        );
        break;
      case 'Hors-Bord':
        await client.query(
          'INSERT INTO HorsBord (idMateriel) VALUES ($1)', 
          [newMaterielId]
        );
        break;
      default:
        throw new Error('Type de matériel non reconnu');
    }

    // Valider la transaction
    await client.query('COMMIT');

    res.status(201).json({ 
      success: true, 
      message: "Matériel ajouté avec succès",
      idMateriel: newMaterielId 
    });

  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error("Erreur lors de l'ajout du matériel :", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de l'ajout du matériel",
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// Route pour supprimer un matériel
app.delete("/api/materiel/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // Démarrer une transaction
    await client.query('BEGIN');

    // Supprimer des tables spécifiques
    await client.query('DELETE FROM Flotteur WHERE idMateriel = $1', [id]);
    await client.query('DELETE FROM Voile WHERE idMateriel = $1', [id]);
    await client.query('DELETE FROM Paddle WHERE idMateriel = $1', [id]);
    await client.query('DELETE FROM Pedalo WHERE idMateriel = $1', [id]);
    await client.query('DELETE FROM Catamaran WHERE idMateriel = $1', [id]);
    await client.query('DELETE FROM HorsBord WHERE idMateriel = $1', [id]);
    await client.query('DELETE FROM PiedDeMat WHERE idMateriel = $1', [id]);

    // Supprimer de la table Materiel
    const result = await client.query(
      'DELETE FROM Materiel WHERE idMateriel = $1', 
      [id]
    );

    // Valider la transaction
    await client.query('COMMIT');

    if (result.rowCount > 0) {
      res.json({ 
        success: true, 
        message: "Matériel supprimé avec succès" 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: "Matériel non trouvé" 
      });
    }

  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error("Erreur lors de la suppression du matériel :", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la suppression du matériel",
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// Route pour mettre à jour l'état
app.put("/api/materiel/:id/etat", async (req, res) => {
  const { id } = req.params;
  const { etat } = req.body;

  try {
    const result = await pool.query(
      'UPDATE Materiel SET etat = $1 WHERE idMateriel = $2',
      [etat, id]
    );

    if (result.rowCount > 0) {
      res.json({ 
        success: true, 
        message: "État mis à jour avec succès" 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: "Matériel non trouvé" 
      });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'état :", error);
    res.status(500).json({ 
      success: false, 
      message: "Erreur lors de la mise à jour de l'état",
      error: error.message 
    });
  }
});





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
