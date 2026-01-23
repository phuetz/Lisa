# Dockerfile pour l'API Lisa
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY src/ ./src/
COPY prisma/ ./prisma/

# Construire l'application TypeScript
RUN npm run build:api

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lisa -u 1001

# Changer la propriété des fichiers
RUN chown -R lisa:nodejs /app
USER lisa

# Exposer le port
EXPOSE 3001

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV LISA_API_PORT=3001

# Commande de démarrage
CMD ["node", "dist/api/index.js"]
