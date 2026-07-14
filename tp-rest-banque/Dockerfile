# Dockerfile — Application Node.js Express
FROM node:22-alpine

LABEL maintainer="sdiagne148r@gmail.com"
LABEL version="1.0"

# Créer le répertoire applicatif
WORKDIR /app

# Copier les fichiers de dépendances en premier (cache Docker)
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste du code source
COPY . .

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Variable d'environnement
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "app.js"]