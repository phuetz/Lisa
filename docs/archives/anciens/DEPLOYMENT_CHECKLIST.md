# 🚀 Checklist de Déploiement Production - Lisa

**Version:** v1.2 Production Ready  
**Date:** 2025-08-24  
**Score:** 9.2/10

## ✅ **Prérequis de Déploiement**

### **Infrastructure**
- [ ] **Serveur production** : CPU 4+ cores, RAM 8GB+, SSD 50GB+
- [ ] **Docker & Docker Compose** installés
- [ ] **Domaine configuré** avec certificats SSL/TLS
- [ ] **Base de données PostgreSQL** accessible
- [ ] **Reverse proxy** (Nginx/Traefik) configuré

### **Variables d'Environnement**
- [ ] **`.env.local`** créé avec JWT_SECRET sécurisé (64+ chars)
- [ ] **`LISA_API_KEY`** générée (32+ chars cryptographiquement sûre)
- [ ] **`DATABASE_URL`** pointant vers PostgreSQL production
- [ ] **`LISA_CORS_ORIGINS`** restreint aux domaines autorisés
- [ ] **Variables optionnelles** configurées selon besoins

### **Sécurité**
- [ ] **Firewall** configuré (ports 80, 443, 22 seulement)
- [ ] **SSL/TLS** certificats valides installés
- [ ] **Secrets** stockés de manière sécurisée (pas en plaintext)
- [ ] **Backup automatisé** base de données configuré
- [ ] **Monitoring sécurité** activé

---

## 🔧 **Étapes de Déploiement**

### **1. Préparation**
```bash
# Cloner le repository
git clone <repository-url>
cd Lisa

# Vérifier la version
git checkout main
git pull origin main

# Installer les dépendances
npm ci --production
```

### **2. Configuration**
```bash
# Copier et configurer l'environnement
cp .env.example .env
cp .env.example .env.local

# Éditer .env.local avec les vraies valeurs
nano .env.local
```

### **3. Base de Données**
```bash
# Démarrer PostgreSQL
docker compose -f docker-compose.prod.yml up -d postgres

# Attendre que la DB soit prête
sleep 10

# Appliquer les migrations
npx prisma migrate deploy

# Vérifier la connexion
npx prisma db pull
```

### **4. Build & Test**
```bash
# Build de l'application
npm run build

# Vérification TypeScript
npm run typecheck

# Tests unitaires
npm test

# Test de l'API
npm run start-api &
curl http://localhost:3001/health
```

### **5. Déploiement Production**
```bash
# Démarrer tous les services
docker compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker compose -f docker-compose.prod.yml logs -f

# Test des endpoints
curl https://votre-domaine.com/health
curl https://votre-domaine.com/api/health
```

---

## 🧪 **Tests de Validation**

### **Tests Fonctionnels**
- [ ] **Page d'accueil** se charge correctement
- [ ] **Authentification** : Inscription/Connexion fonctionnelle
- [ ] **Interface robot** accessible après connexion
- [ ] **API endpoints** répondent avec codes 200/401 appropriés
- [ ] **WebSocket ROS** se connecte (si robot disponible)

### **Tests de Performance**
- [ ] **Temps de chargement** < 3 secondes
- [ ] **API response time** < 100ms
- [ ] **Memory usage** stable < 300MB
- [ ] **CPU usage** < 50% en charge normale

### **Tests de Sécurité**
- [ ] **HTTPS** forcé (redirection HTTP → HTTPS)
- [ ] **Headers sécurité** présents (CSP, HSTS, etc.)
- [ ] **JWT tokens** expiration fonctionnelle
- [ ] **CORS** restreint aux domaines autorisés
- [ ] **Rate limiting** actif sur API

### **Tests d'Intégration**
- [ ] **Base de données** : CRUD opérations
- [ ] **Authentification** : Login/logout complet
- [ ] **Robot API** : Commandes de base (si applicable)
- [ ] **Error handling** : Pages d'erreur appropriées

---

## 📊 **Monitoring Post-Déploiement**

### **Métriques à Surveiller**
```bash
# Health checks automatiques
curl -f https://votre-domaine.com/health || echo "ALERT: API down"

# Logs en temps réel
docker compose logs -f lisa-api

# Utilisation ressources
docker stats lisa-api lisa-postgres
```

### **Alertes Recommandées**
- [ ] **API down** : Health check échoue
- [ ] **High response time** : > 500ms
- [ ] **High memory usage** : > 80%
- [ ] **Database connection** : Erreurs de connexion
- [ ] **SSL expiration** : < 30 jours

---

## 🔄 **Procédures de Maintenance**

### **Backup Quotidien**
```bash
# Script de backup automatisé
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec lisa-postgres pg_dump -U lisa lisa > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://lisa-backups/
```

### **Mises à Jour**
```bash
# Procédure de mise à jour
git pull origin main
npm ci --production
npm run build
docker compose -f docker-compose.prod.yml up -d --build
```

### **Rollback d'Urgence**
```bash
# Retour à la version précédente
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🚨 **Troubleshooting**

### **Problèmes Courants**

#### **API ne démarre pas**
```bash
# Vérifier les logs
docker logs lisa-api

# Vérifier les variables d'environnement
docker exec lisa-api env | grep LISA

# Redémarrer le service
docker compose restart lisa-api
```

#### **Base de données inaccessible**
```bash
# Vérifier la connexion
docker exec lisa-postgres pg_isready -U lisa

# Vérifier les logs
docker logs lisa-postgres

# Test de connexion manuelle
docker exec -it lisa-postgres psql -U lisa -d lisa
```

#### **Frontend ne se charge pas**
```bash
# Vérifier Nginx
docker logs nginx

# Vérifier les fichiers statiques
docker exec nginx ls -la /usr/share/nginx/html

# Test direct du build
docker run -p 8080:80 lisa-frontend
```

---

## 📋 **Checklist Final**

### **Avant Go-Live**
- [ ] Tous les tests passent
- [ ] Monitoring configuré
- [ ] Backup automatisé testé
- [ ] SSL/TLS validé
- [ ] Performance validée
- [ ] Sécurité auditée
- [ ] Documentation à jour
- [ ] Équipe formée

### **Post Go-Live (24h)**
- [ ] Monitoring actif
- [ ] Logs surveillés
- [ ] Performance stable
- [ ] Aucune erreur critique
- [ ] Backup vérifié
- [ ] Utilisateurs satisfaits

### **Post Go-Live (1 semaine)**
- [ ] Métriques de performance stables
- [ ] Aucun incident sécurité
- [ ] Feedback utilisateurs positif
- [ ] Optimisations identifiées
- [ ] Plan de maintenance établi

---

## 🎯 **Critères de Succès**

| Métrique | Cible | Status |
|----------|-------|--------|
| **Uptime** | > 99.5% | ⏳ |
| **Response Time** | < 100ms | ⏳ |
| **Error Rate** | < 0.1% | ⏳ |
| **User Satisfaction** | > 4.5/5 | ⏳ |
| **Security Score** | A+ | ✅ |

---

**🚀 Lisa v1.2 est prête pour la production !**

*Suivez cette checklist étape par étape pour un déploiement réussi et sécurisé.*
