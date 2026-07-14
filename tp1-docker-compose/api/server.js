const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
const router = express.Router();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stack API',
      version: '1.0.0',
      description: 'API REST de gestion des utilisateurs (approche code-first avec swagger-jsdoc)',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Accès direct au conteneur API (préfixe /api)' },
      { url: 'http://localhost/api', description: 'Accès via le reverse proxy Nginx' },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Alice Dupont' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
            created_at: { type: 'string', format: 'date-time', example: '2026-07-09T12:00:00.000Z' },
          },
        },
        UserInput: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', example: 'Alice Dupont' },
            email: { type: 'string', format: 'email', example: 'alice@example.com' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Message d\'erreur' },
          },
        },
        Health: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error'], example: 'ok' },
            database: { type: 'string', enum: ['connected', 'disconnected'], example: 'connected' },
          },
        },
      },
    },
    tags: [
      { name: 'Santé', description: 'Vérification de l\'état du service' },
      { name: 'Utilisateurs', description: 'CRUD sur la table users' },
    ],
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Monter les routes API sous le préfixe /api
app.use('/api', router);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Santé]
 *     summary: Vérifie l'état de l'API et de la connexion PostgreSQL
 *     responses:
 *       200:
 *         description: Service opérationnel
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Health'
 *       503:
 *         description: Base de données inaccessible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Health'
 */
router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Utilisateurs]
 *     summary: Liste tous les utilisateurs
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de récupérer les utilisateurs' });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Utilisateurs]
 *     summary: Récupère un utilisateur par son identifiant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identifiant de l'utilisateur
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Identifiant invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de récupérer l\'utilisateur' });
  }
});

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Utilisateurs]
 *     summary: Crée un nouvel utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Utilisateur créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Les champs name et email sont requis' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [name, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet email existe déjà' });
    }
    console.error(err);
    res.status(500).json({ error: 'Impossible de créer l\'utilisateur' });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags: [Utilisateurs]
 *     summary: Met à jour un utilisateur existant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identifiant de l'utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Les champs name et email sont requis' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at',
      [name, email, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet email existe déjà' });
    }
    console.error(err);
    res.status(500).json({ error: 'Impossible de mettre à jour l\'utilisateur' });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Utilisateurs]
 *     summary: Supprime un utilisateur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Identifiant de l'utilisateur
 *     responses:
 *       204:
 *         description: Utilisateur supprimé
 *       400:
 *         description: Identifiant invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Utilisateur introuvable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }

  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Impossible de supprimer l\'utilisateur' });
  }
});

app.listen(PORT, () => {
  console.log(`API démarrée sur le port ${PORT}`);
  console.log(`Documentation Swagger : http://localhost:${PORT}/api-docs`);
  console.log(`API base path: http://localhost:${PORT}/api`);
});
