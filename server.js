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
    tarifhoraire, 
    tarifheuresupp, 
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
      tarifhoraire, 
      tarifheuresupp, 
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

// Route pour récupérer tous les campings
app.get('/api/camping', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        idcamping, 
        nom, 
        partenaire 
      FROM Camping
      ORDER BY nom
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des campings :', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour ajouter un camping
app.post('/api/camping', async (req, res) => {
  const { nom, partenaire } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO Camping (nom, partenaire) 
       VALUES ($1, $2) 
       RETURNING idcamping, nom, partenaire`,
      [nom, partenaire]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du camping :', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour supprimer un camping
app.delete('/api/camping/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    // Début de la transaction
    await client.query('BEGIN');

    // Vérifier s'il y a des clients associés
    const clientsAssocies = await client.query(
      'SELECT COUNT(*) FROM Client WHERE idcamping = $1', 
      [id]
    );

    if (parseInt(clientsAssocies.rows[0].count) > 0) {
      // Mettre à NULL les références de camping dans la table Client
      await client.query(
        'UPDATE Client SET idcamping = NULL WHERE idcamping = $1', 
        [id]
      );
      console.log(`Mis à jour ${clientsAssocies.rows[0].count} clients`);
    }

    // Supprimer le camping
    const result = await client.query(
      'DELETE FROM Camping WHERE idcamping = $1',
      [id]
    );

    // Valider la transaction
    await client.query('COMMIT');

    if (result.rowCount > 0) {
      res.json({ message: 'Camping supprimé avec succès' });
    } else {
      res.status(404).json({ error: 'Camping non trouvé' });
    }
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression du camping :', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});


//Recuperer le personnel
app.get("/api/personnel", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.idUtilisateur, u.nom, u.prenom, u.email, u.numTel,
        CASE 
          WHEN a.idAdministrateur IS NOT NULL THEN 'Administrateur'
          WHEN m.idMoniteur IS NOT NULL THEN 'Moniteur'
          WHEN p.idProprietaire IS NOT NULL THEN 'Propriétaire'
          WHEN g.idGarcon IS NOT NULL THEN 'Garçon de Plage'
          ELSE 'Autre'
        END AS role
      FROM Utilisateur u
      LEFT JOIN Administrateur a ON u.idUtilisateur = a.idAdministrateur
      LEFT JOIN Moniteur m ON u.idUtilisateur = m.idMoniteur
      LEFT JOIN Proprietaire p ON u.idUtilisateur = p.idProprietaire
      LEFT JOIN GarconDePlage g ON u.idUtilisateur = g.idGarcon
      ORDER BY role;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération du personnel :", error);
    res.status(500).json({ error: error.message });
  }
});

//Pour ajouter un membre de personnel
app.post("/api/personnel", async (req, res) => {
  const { nom, prenom, email, numTel, motDePasse, role } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ajouter dans Utilisateur
    const userResult = await client.query(
      `INSERT INTO Utilisateur (nom, prenom, email, numTel, motDePasse) 
       VALUES ($1, $2, $3, $4, $5) RETURNING idUtilisateur`,
      [nom, prenom, email, numTel, motDePasse]
    );

    const newUserId = userResult.rows[0].idutilisateur;

    // Ajouter dans la bonne table selon le rôle
    switch (role) {
      case "Administrateur":
        await client.query("INSERT INTO Administrateur (idAdministrateur) VALUES ($1)", [newUserId]);
        break;
      case "Moniteur":
        await client.query("INSERT INTO Moniteur (idMoniteur) VALUES ($1)", [newUserId]);
        break;
      case "Propriétaire":
        await client.query("INSERT INTO Proprietaire (idProprietaire) VALUES ($1)", [newUserId]);
        break;
      case "Garçon de Plage":
        await client.query(
          `INSERT INTO GarconDePlage (idGarcon, nom, prenom, numTel, email) 
           VALUES ($1, $2, $3, $4, $5)`,
          [newUserId, nom, prenom, numTel, email]
        );
        break;
      default:
        throw new Error("Rôle non valide !");
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, message: "Personnel ajouté avec succès" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur lors de l'ajout du personnel :", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Pour supprimer un membre du personnel
app.delete("/api/personnel/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log(`Tentative de suppression du personnel avec ID: ${id}`);

    // Vérifier si l'utilisateur est Jean Dupont (administrateur principal)
    if (id === "1") {
      await client.query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Suppression interdite : cet utilisateur est l'administrateur principal" });
    }

    // Vérifier si l'utilisateur existe
    const checkUser = await client.query("SELECT * FROM Utilisateur WHERE idUtilisateur = $1", [id]);
    if (checkUser.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Personnel non trouvé" });
    }

    // Vérifier si l'utilisateur est référencé ailleurs
    const checkReferences = await client.query(`
      SELECT COUNT(*) AS count
      FROM (
        SELECT idMoniteur AS id FROM Cours WHERE idMoniteur = $1
        UNION ALL
        SELECT idClient AS id FROM InscriptionCours WHERE idClient = $1
      ) AS ref_check;
    `, [id]);

    if (parseInt(checkReferences.rows[0].count) > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Impossible de supprimer : utilisateur référencé dans une autre table" });
    }

    // Supprimer d'abord des tables spécifiques
    await client.query("DELETE FROM Administrateur WHERE idAdministrateur = $1", [id]);
    await client.query("DELETE FROM Moniteur WHERE idMoniteur = $1", [id]);
    await client.query("DELETE FROM Proprietaire WHERE idProprietaire = $1", [id]);
    await client.query("DELETE FROM GarconDePlage WHERE idGarcon = $1", [id]);

    // Supprimer de la table principale Utilisateur
    const result = await client.query("DELETE FROM Utilisateur WHERE idUtilisateur = $1 RETURNING *", [id]);

    if (result.rowCount > 0) {
      await client.query("COMMIT");
      res.json({ success: true, message: "Personnel supprimé avec succès", deletedUser: result.rows[0] });
    } else {
      await client.query("ROLLBACK");
      res.status(404).json({ success: false, message: "Personnel non trouvé" });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur lors de la suppression du personnel :", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Ajoutez ces routes après vos autres configurations et routes existantes

// Récupérer tous les clients
app.get('/api/clientspage', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT Client.*, Camping.nom AS nom_camping 
      FROM Client 
      LEFT JOIN Camping ON Client.idCamping = Camping.idCamping 
      ORDER BY Client.idClient
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des clients" });
  }
});

// Ajouter un nouveau client
app.post('/api/clients', async (req, res) => {
  const { nom, prenom, email, numTel, niveau, idCamping } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Client (nom, prenom, email, numTel, niveau, idCamping) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nom, prenom, email, numTel, niveau, idCamping]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout du client" });
  }
});

// Supprimer un client
app.delete('/api/clients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Client WHERE idClient = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client non trouvé" });
    }
    res.json({ message: "Client supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression du client" });
  }
});

// Route pour récupérer la liste des campings
app.get('/api/campingsname', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Camping ORDER BY nom');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des campings" });
  }
});

// Route pour récupérer les forfaits avec les informations du client
app.get('/api/forfaits', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        Forfait.*, 
        Client.nom AS nom_client, 
        Client.prenom AS prenom_client,
        EXISTS (
          SELECT 1 
          FROM Paiement 
          WHERE Paiement.idClient = Forfait.idClient AND Paiement.montant = Forfait.montantTotal
        ) AS paiement_effectue
      FROM Forfait 
      JOIN Client ON Forfait.idClient = Client.idClient 
      ORDER BY Forfait.idForfait
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des forfaits" });
  }
});


// Route pour supprimer un forfait
app.delete('/api/forfaits/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Vérifier s'il existe des cours ou paiements liés
    const checkRelatedRecords = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM InscriptionCours WHERE idClient IN (
          SELECT idClient FROM Forfait WHERE idForfait = $1
        )) AS cours_count,
        (SELECT COUNT(*) FROM Paiement WHERE idClient IN (
          SELECT idClient FROM Forfait WHERE idForfait = $1
        )) AS paiement_count
    `, [id]);

    const { cours_count, paiement_count } = checkRelatedRecords.rows[0];

    if (cours_count > 0 || paiement_count > 0) {
      return res.status(400).json({ 
        error: "Impossible de supprimer ce forfait. Des enregistrements sont liés." 
      });
    }

    // Supprimer le forfait
    const result = await pool.query(
      'DELETE FROM Forfait WHERE idForfait = $1 RETURNING *', 
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Forfait non trouvé" });
    }

    res.json({ message: "Forfait supprimé avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression du forfait" });
  }
});

// Modification de la route d'ajout de forfait pour sécuriser
app.post('/api/forfaits', async (req, res) => {
  const { idClient, nbSeances, prix } = req.body;
  
  // Validation des données
  if (!idClient || !nbSeances || !prix) {
    return res.status(400).json({ error: "Données invalides" });
  }

  // Vérification des forfaits autorisés
  const forfaitOptions = {
    1: 25,
    2: 42,
    5: 100
  };

  if (!forfaitOptions[nbSeances] || forfaitOptions[nbSeances] !== prix) {
    return res.status(400).json({ error: "Configuration de forfait invalide" });
  }

  try {
    const result = await pool.query(
      'INSERT INTO Forfait (idClient, nbSeances, nbSeancesRestantes, prix, remise, montantTotal) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [idClient, nbSeances, nbSeances, prix, 0, prix]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout du forfait" });
  }
});


// Route pour ajouter une facture
app.post('/api/forfaits', async (req, res) => {
  const { idClient, nbSeances, prix, remise } = req.body;

  console.log("📥 Requête reçue pour ajouter un forfait :", req.body);

  // Vérification des champs obligatoires
  if (!idClient || isNaN(idClient)) {
    return res.status(400).json({ error: "❌ ID Client invalide ou manquant" });
  }
  if (!nbSeances || isNaN(nbSeances)) {
    return res.status(400).json({ error: "❌ Nombre de séances invalide" });
  }
  if (!prix || isNaN(prix)) {
    return res.status(400).json({ error: "❌ Prix invalide" });
  }

  try {
    console.log("📡 Envoi de la requête SQL...");
    const result = await pool.query(
      `INSERT INTO Forfait (idClient, nbSeances, nbSeancesRestantes, prix, remise, montantTotal) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [idClient, nbSeances, nbSeances, prix, remise || 0, prix - (remise || 0)]
    );
    console.log("✅ Forfait ajouté :", result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ ERREUR lors de l'ajout du forfait :", err);
    res.status(500).json({ error: "Erreur serveur lors de l'ajout du forfait", details: err.message });
  }
});


// Route pour ajouter une facture
app.post('/api/factures', async (req, res) => {
  const { montantTotal, dateEmission, tva } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Facture (montantTotal, dateEmission, tva) VALUES ($1, $2, $3) RETURNING *',
      [montantTotal, dateEmission, tva]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création de la facture" });
  }
});

// Route pour ajouter un paiement
app.post('/api/paiements', async (req, res) => {
  const { montant, mode, idFacture, idClient } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Paiement (montant, mode, idFacture, idClient) VALUES ($1, $2, $3, $4) RETURNING *',
      [montant, mode, idFacture, idClient]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la création du paiement" });
  }
});

// Route pour récupérer toutes les factures avec les informations du client et du paiement
app.get('/api/factures', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        f.idFacture, 
        f.montantTotal, 
        f.dateEmission, 
        f.tva,
        c.nom AS nom_client, 
        c.prenom AS prenom_client,
        p.mode AS mode_paiement
      FROM Facture f
      JOIN Paiement p ON f.idFacture = p.idFacture
      JOIN Client c ON p.idClient = c.idClient
      ORDER BY f.idFacture DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des factures" });
  }
});

// Récupérer les horaires d'ouverture
app.get("/api/accueil", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM Accueil ORDER BY idAccueil ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Erreur lors de la récupération des horaires :", error);
    res.status(500).json({ error: error.message });
  }
});



// Mettre à jour un horaire d'ouverture
app.put("/api/accueil/:id", async (req, res) => {
  const { id } = req.params;
  const { ouvert, dateFermeture, heureOuverture, heureFermeture, adresse } = req.body;

  try {
    const result = await pool.query(
      `UPDATE Accueil 
       SET ouvert = $1, dateFermeture = $2, heureOuverture = $3, heureFermeture = $4, adresse = $5
       WHERE idAccueil = $6`,
      [ouvert, dateFermeture || null, heureOuverture, heureFermeture, adresse, id]
    );

    if (result.rowCount > 0) {
      res.json({ success: true, message: "Horaire mis à jour avec succès !" });
    } else {
      res.status(404).json({ success: false, message: "ID non trouvé" });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour :", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/locations", async (req, res) => {
  try {
    const query = `
      SELECT 
        l.idLocation, 
        l.date, 
        l.heureDebut, 
        l.duree, 
        l.montantCaution, 
        l.etatRetour, 
        l.remise, 
        l.cautionRendue, 
        l.montantTotal, 
        l.idMateriel,
        m.etat AS etatMateriel,
        c.modele AS modeleCatamaran
      FROM Location l
      LEFT JOIN Materiel m ON l.idMateriel = m.idMateriel
      LEFT JOIN Catamaran c ON l.idCatamaran = c.idCatamaran
      ORDER BY l.date DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour ajouter une location
// Route pour ajouter une location
app.post("/api/locations", async (req, res) => {
  const { 
    date, 
    heureDebut, 
    duree, 
    montantCaution, 
    etatRetour, 
    remise, 
    cautionRendue, 
    montantTotal, 
    idMateriel
  } = req.body;

  // Vérification des entrées
  if (!date || !heureDebut || !duree || !montantTotal || !idMateriel || !etatRetour) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
  }

  try {
    // Vérifier la disponibilité du matériel
    const materielCheck = await pool.query(
      'SELECT disponible FROM Materiel WHERE idMateriel = $1', 
      [idMateriel]
    );

    if (!materielCheck.rows[0]?.disponible) {
      return res.status(400).json({ error: "Le matériel n'est pas disponible" });
    }

    const query = `
      INSERT INTO Location (
        date, heureDebut, duree, montantCaution, etatRetour, remise, cautionRendue, montantTotal, idMateriel
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING idLocation
    `;

    const values = [
      date, heureDebut, duree, 
      montantCaution || 0, etatRetour, remise || 0, 
      cautionRendue || false, montantTotal, idMateriel
    ];

    const result = await pool.query(query, values);

    // Marquer le matériel comme indisponible après location
    await pool.query(
      'UPDATE Materiel SET disponible = false WHERE idMateriel = $1', 
      [idMateriel]
    );

    res.status(201).json({ 
      success: true, 
      message: "Location ajoutée avec succès",
      idLocation: result.rows[0].idlocation 
    });

  } catch (error) {
    console.error("Erreur lors de l'ajout de la location :", error);
    res.status(500).json({ 
      error: "Erreur serveur lors de l'ajout de la location",
      details: error.message 
    });
  }
});

// Route pour supprimer une location
app.delete("/api/locations/:id", async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Vérifier si la location existe
    const locationQuery = await client.query("SELECT idMateriel FROM Location WHERE idLocation = $1", [id]);

    if (locationQuery.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Location non trouvée" });
    }

    const idMateriel = locationQuery.rows[0].idmateriel;

    // Supprimer la location
    const deleteResult = await client.query("DELETE FROM Location WHERE idLocation = $1", [id]);

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Échec de la suppression de la location" });
    }

    // Mettre à jour la disponibilité du matériel après suppression de la location
    await client.query("UPDATE Materiel SET disponible = true WHERE idMateriel = $1", [idMateriel]);

    await client.query("COMMIT");

    res.json({ success: true, message: "Location supprimée avec succès" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur lors de la suppression de la location:", error);
    res.status(500).json({ error: "Erreur serveur lors de la suppression de la location", details: error.message });
  } finally {
    client.release();
  }
});












const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
