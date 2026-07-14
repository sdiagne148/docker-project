const express = require('express');

const app = express();
// Middleware pour parser le JSON dans le corps des requêtes
app.use(express.json());

// swagger pour la documentation de l'API
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Banque',
      version: '1.0.0',
      description: 'Documentation des api bancaires'
    },
  },
  apis: ['./app.js'], // Chemin vers les fichiers contenant les annotations
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// -------- Authentification avec JSON Web Tokens (JWT)------------------
const jwt = require('jsonwebtoken');

// Clé secrète pour signer les jetons (à mettre dans un .env normalement)
const SECRET_KEY = "ma_super_cle_secrete_123";

// Middleware pour vérifier la validité du JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format "Bearer TOKEN"

    if (!token) return res.status(401).json({ message: "Token manquant" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ message: "Token invalide ou expiré" });
        req.user = user; // On attache l'utilisateur à la requête
        next();
    });
};
// -------- Fin Authentification avec JSON Web Tokens (JWT)--------------

let comptes = [
    { id: 1, client: "Alice", solde: 5000 },
    { id: 2, client: "Bob", solde: 12500 }
];

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Authentifie un utilisateur
 *     parameters:
 *       - in: body
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom d'utilisateur
 *       - in: body
 *         name: password
 *         required: true
 *         schema:
 *           type: string
 *         description: Mot de passe
 *     responses:
 *       200:
 *         description: Token d'accès généré avec succès
 *       401:
 *         description: Identifiants incorrects
 */
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Simulation : On accepte "admin" avec le pass "1234"
  if (username === "admin" && password === "1234") {
      const user = { name: username, role: 'ADMIN' };
      
      // Génération du token (expire dans 1 heure)
      const accessToken = jwt.sign(user, SECRET_KEY, { expiresIn: '1h' });
      res.json({ accessToken });
  } else {
      res.status(401).json({ message: "Identifiants incorrects" });
  }
});

/**
 * @openapi
 * /comptes:
 *   get:
 *     summary: Récupère tous les comptes bancaires
 *     responses:
 *       200:
 *         description: Liste des comptes bancaires
 */
app.get('/comptes', (req, res) => {
  res.status(200).json(comptes);
});

/**
 * @openapi
 * /comptes:
 *   post:
 *     summary: Crée un nouveau compte bancaire
 *     parameters:
 *       - in: body
 *         name: client
 *         required: true
 *         schema:
 *           type: string
 *         description: Nom du client
 *       - in: body
 *         name: solde
 *         required: true
 *         schema:
 *           type: number
 *         description: Solde du compte
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 */
app.post('/comptes', authenticateToken, (req, res) => {
  const newCompte = { id: comptes.length + 1, client: req.body.client, solde: req.body.solde };
  comptes.push(newCompte);
  res.status(201).json(newCompte);
});

/**
 * @openapi
 * /comptes/{id}:
 *   get:
 *     summary: Récupère un compte bancaire par ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du compte bancaire
 *     responses:
 *       200:
 *         description: Compte trouvé avec succès
 */
app.get('/comptes/:id', (req, res) => {
    const compte = comptes.find(c => c.id === parseInt(req.params.id));
    if (!compte) {
        return res.status(404).json({ message: 'Compte non trouvé' });
    }
    res.status(200).json(compte);
});

/**
 * @openapi
 * /comptes/{id}/transactions:
 *   post:
 *     summary: Effectue une transaction sur un compte bancaire
 *     parameters:
 *       - in: body
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [versement, retrait]
 *         description: Type de transaction
 *       - in: body
 *         name: montant
 *         required: true
 *         schema:
 *           type: number
 *         description: Montant de la transaction
 *     responses:
 *       200:
 *         description: Transaction effectuée avec succès
 */
app.post('/comptes/:id/transactions', authenticateToken, (req, res) => {
  const { type, montant } = req.body; // type: "versement" ou "retrait"
  const compte = comptes.find(c => c.id === parseInt(req.params.id));

  if (!compte) return res.status(404).send("Compte inexistant");

  if (type === "versement") {
      compte.solde += montant;
  } else if (type === "retrait") {
      if (compte.solde < montant) return res.status(400).send("Solde insuffisant");
      compte.solde -= montant;
  }
  res.json(compte);
});

/**
 * @openapi
 * /virements:
 *   post:
 *     summary: Effectue un virement entre deux comptes bancaires
 *     parameters:
 *       - in: body
 *         name: fromId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: body
 *         name: toId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: body
 *         name: montant
 *         required: true
 *         schema:
 *           type: number
 *         description: Montant du virement
 *     responses:
 *       200:
 *         description: Virement effectué avec succès
 */
app.post('/virements', authenticateToken, (req, res) => {
  console.log(`Virement effectué par : ${req.user.name}`);
  const { fromId, toId, montant } = req.body;
  const source = comptes.find(c => c.id === fromId);
  const cible = comptes.find(c => c.id === toId);

  if (!source || !cible) return res.status(404).send("Un des comptes est introuvable");
  if (source.solde < montant) return res.status(400).send("Fonds insuffisants");

  source.solde -= montant;
  cible.solde += montant;

  res.json({ message: "Virement effectué", source, cible });
});

/**
 * @openapi
 * /comptes/{id}:
 *   delete:
 *     summary: Supprime un compte bancaire
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Compte supprimé avec succès
 */
app.delete('/comptes/:id', authenticateToken, (req, res) => {
  const index = comptes.findIndex(c => c.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).send("Compte non trouvé");

  comptes.splice(index, 1);
  res.status(204).send(); // 204 No Content : Succès sans retour de corps
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Serveur RESTful démarré sur http://localhost:${PORT}`);
});

