# 📊 Guide de Configuration - Monitoring & Observabilité
**Date:** 30 Octobre 2025  
**Phase:** 1 - Monitoring & Observabilité

---

## 🎯 Objectif

Implémenter le monitoring complet de l'application Lisa avec Prometheus et Grafana.

---

## 📦 Composants Implémentés

### **1. Prometheus Metrics Middleware**
**Fichier:** `src/api/middleware/prometheus.ts`

- Collecte les métriques HTTP (durée, nombre de requêtes)
- Collecte les métriques de base de données
- Collecte les erreurs
- Expose les métriques au format Prometheus

**Endpoint:** `GET /metrics`

### **2. Structured Logger**
**Fichier:** `src/api/middleware/structuredLogger.ts`

- Logging structuré en JSON
- Logging HTTP avec durée et statut
- Logging des erreurs
- Stockage en mémoire des logs

**Endpoints:**
- `GET /logs` - Accéder aux logs
- `GET /logs?level=error` - Filtrer par niveau
- `DELETE /logs` - Nettoyer les logs

### **3. Health Check Routes**
**Fichier:** `src/api/routes/healthRoutes.ts`

- `/health` - Health check basique
- `/health/detailed` - Health check détaillé
- `/ready` - Readiness check
- `/live` - Liveness check

### **4. Prometheus Configuration**
**Fichier:** `prometheus.yml`

- Configuration Prometheus
- Scrape interval: 15s
- Scrape timeout: 5s

### **5. Docker Compose Monitoring**
**Fichier:** `docker-compose.monitoring.yml`

- Prometheus container
- Grafana container
- Volumes persistants
- Health checks

### **6. Grafana Dashboards**
**Fichier:** `grafana/provisioning/dashboards/lisa-dashboard.json`

- HTTP Requests Rate
- API Response Time (p95)
- Error Rate
- Database Query Time (p95)

---

## 🚀 Démarrage

### **Option 1: Démarrer le Monitoring Seul**

```bash
# Démarrer Prometheus et Grafana
docker compose -f docker-compose.monitoring.yml up -d

# Vérifier les services
docker ps | grep lisa

# Accéder aux interfaces
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

### **Option 2: Démarrer la Stack Complète**

```bash
# Terminal 1: Base de données
docker compose up postgres

# Terminal 2: API avec monitoring
npm run start-api

# Terminal 3: Monitoring
docker compose -f docker-compose.monitoring.yml up

# Terminal 4: Frontend
npm run dev
```

---

## 📊 Accès aux Interfaces

### **Prometheus**
- **URL:** http://localhost:9090
- **Métriques disponibles:**
  - `http_request_duration_seconds`
  - `http_requests_total`
  - `db_query_duration_seconds`
  - `db_queries_total`
  - `errors_total`

### **Grafana**
- **URL:** http://localhost:3000
- **Credentials:** admin / admin
- **Dashboard:** Lisa API Monitoring

### **Health Checks**
- **Health:** http://localhost:3001/health
- **Health Detailed:** http://localhost:3001/health/detailed
- **Ready:** http://localhost:3001/ready
- **Live:** http://localhost:3001/live

### **Logs**
- **Tous les logs:** http://localhost:3001/logs
- **Logs d'erreur:** http://localhost:3001/logs?level=error
- **Derniers 50 logs:** http://localhost:3001/logs?limit=50

### **Métriques Prometheus**
- **Format Prometheus:** http://localhost:3001/metrics

---

## 📈 Métriques Disponibles

### **HTTP Requests**
```
http_request_duration_seconds{route="GET /api/agents",quantile="0.95"} 0.123
http_requests_total{route="GET /api/agents 200"} 1234
```

### **Database Queries**
```
db_query_duration_seconds{query_type="SELECT",quantile="0.95"} 0.045
db_queries_total{query_type="SELECT"} 5678
```

### **Errors**
```
errors_total{status_code="500"} 12
errors_total{status_code="404"} 5
```

---

## 🔧 Configuration Avancée

### **Modifier l'Intervalle de Scrape**

**Fichier:** `prometheus.yml`

```yaml
global:
  scrape_interval: 5s  # Changer de 15s à 5s
```

### **Ajouter des Alertes**

**Fichier:** `alert.rules.yml` (à créer)

```yaml
groups:
  - name: lisa_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
```

### **Modifier les Credentials Grafana**

**Fichier:** `docker-compose.monitoring.yml`

```yaml
environment:
  GF_SECURITY_ADMIN_USER: your_username
  GF_SECURITY_ADMIN_PASSWORD: your_password
```

---

## 🧪 Tests

### **Tester les Métriques**

```bash
# Générer du trafic
for i in {1..100}; do
  curl http://localhost:3001/health
done

# Vérifier les métriques
curl http://localhost:3001/metrics | grep http_requests_total
```

### **Tester les Health Checks**

```bash
# Health check basique
curl http://localhost:3001/health

# Health check détaillé
curl http://localhost:3001/health/detailed

# Readiness check
curl http://localhost:3001/ready

# Liveness check
curl http://localhost:3001/live
```

### **Tester les Logs**

```bash
# Tous les logs
curl http://localhost:3001/logs

# Logs d'erreur
curl http://localhost:3001/logs?level=error

# Derniers 10 logs
curl http://localhost:3001/logs?limit=10
```

---

## 📋 Checklist

- [x] Prometheus middleware implémenté
- [x] Structured logger implémenté
- [x] Health check routes créées
- [x] Prometheus configuration créée
- [x] Docker Compose monitoring créé
- [x] Grafana dashboards créés
- [ ] Tests en production
- [ ] Alerting configuré
- [ ] Backup des données Prometheus
- [ ] Documentation complétée

---

## 🚨 Troubleshooting

### **Prometheus ne scrape pas les métriques**

```bash
# Vérifier la configuration
docker logs lisa-prometheus

# Vérifier la connectivité
curl http://localhost:3001/metrics
```

### **Grafana ne se connecte pas à Prometheus**

```bash
# Vérifier les datasources
docker exec lisa-grafana curl http://prometheus:9090

# Redémarrer Grafana
docker restart lisa-grafana
```

### **Logs ne s'affichent pas**

```bash
# Vérifier les logs de l'API
npm run start-api

# Vérifier l'endpoint
curl http://localhost:3001/logs
```

---

## 📚 Ressources

- **Prometheus Documentation:** https://prometheus.io/docs/
- **Grafana Documentation:** https://grafana.com/docs/
- **Express Middleware:** https://expressjs.com/en/guide/using-middleware.html

---

## ✅ Prochaines Étapes

1. **Phase 2:** Tests & Sécurité
   - Compléter tests E2E (Playwright)
   - Forcer HTTPS en production
   - Renforcer CSP headers

2. **Phase 3:** Performance
   - Code splitting
   - Image optimization
   - Lazy loading

3. **Phase 4:** DevOps
   - GitHub Actions CI/CD
   - Kubernetes manifests
   - Documentation

---

**🎉 Monitoring & Observabilité implémentés avec succès!**

*Phase 1 complétée le 30 Octobre 2025*
