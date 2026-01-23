# 🚀 Guide DevOps - Phase 4
**Date:** 30 Octobre 2025  
**Phase:** 4 - DevOps & CI/CD

---

## 🎯 Objectif

Implémenter une pipeline CI/CD complète et déployer l'application sur Kubernetes.

---

## 📦 Composants Implémentés

### **1. GitHub Actions CI/CD Pipeline**
**Fichier:** `.github/workflows/ci-cd.yml`

#### **Jobs Configurés**

1. **Test Job**
   - Lint (ESLint)
   - Type checking (TypeScript)
   - Unit tests (Vitest)
   - Coverage upload (Codecov)

2. **Build Job**
   - Build frontend (Vite)
   - Build API (TypeScript)
   - Upload artifacts

3. **Security Job**
   - npm audit
   - OWASP Dependency Check

4. **Performance Job**
   - Lighthouse testing
   - Performance metrics

5. **Docker Job**
   - Build Docker image
   - Push to registry (GHCR)

6. **Deploy Job**
   - Deploy to production
   - Health check
   - Slack notification

### **2. Kubernetes Manifests**

#### **Deployment** (`k8s/deployment.yaml`)
- API deployment (3 replicas)
- Frontend deployment (2 replicas)
- Resource requests/limits
- Health checks (liveness + readiness)
- Security context
- Pod anti-affinity

#### **Service** (`k8s/service.yaml`)
- API service (ClusterIP)
- Frontend service (ClusterIP)
- Ingress service (LoadBalancer)

#### **ConfigMap & Secrets** (`k8s/configmap.yaml`)
- Environment configuration
- Database URL
- JWT secret
- Registry credentials

#### **Ingress** (`k8s/ingress.yaml`)
- HTTPS with Let's Encrypt
- SSL redirect
- Rate limiting
- CORS configuration
- Certificate management

### **3. Helm Chart**
**Fichier:** `helm/values.yaml`

- API deployment configuration
- Frontend deployment configuration
- PostgreSQL database
- Monitoring (Prometheus + Grafana)
- Ingress configuration
- Auto-scaling
- Network policies
- RBAC

---

## 🚀 Déploiement

### **Prérequis**

```bash
# Kubernetes cluster
kubectl version

# Helm
helm version

# Docker
docker version

# GitHub CLI
gh version
```

### **Configuration Initiale**

#### **1. Créer les Secrets GitHub**

```bash
# Database URL
gh secret set DATABASE_URL --body "postgresql://user:password@postgres:5432/lisa"

# JWT Secret
gh secret set JWT_SECRET --body "your-64-char-secret-here"

# Deploy Key
gh secret set DEPLOY_KEY --body "$(cat ~/.ssh/deploy_key)"

# Deploy Host
gh secret set DEPLOY_HOST --body "your-server.com"

# Deploy User
gh secret set DEPLOY_USER --body "deploy"

# Slack Webhook
gh secret set SLACK_WEBHOOK --body "https://hooks.slack.com/services/..."
```

#### **2. Configurer Kubernetes**

```bash
# Créer le namespace
kubectl create namespace lisa

# Créer les secrets
kubectl create secret generic lisa-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="..." \
  -n lisa

# Créer la ConfigMap
kubectl create configmap lisa-config \
  --from-literal=cors-origins="https://yourdomain.com" \
  -n lisa

# Appliquer les manifests
kubectl apply -f k8s/deployment.yaml -n lisa
kubectl apply -f k8s/service.yaml -n lisa
kubectl apply -f k8s/ingress.yaml -n lisa
```

#### **3. Installer Helm Chart**

```bash
# Ajouter le repo Helm
helm repo add lisa https://your-helm-repo.com
helm repo update

# Installer la release
helm install lisa lisa/lisa \
  -f helm/values.yaml \
  -n lisa

# Vérifier l'installation
helm status lisa -n lisa
```

---

## 📊 Pipeline CI/CD

### **Flux de Déploiement**

```
Push to main/develop
        ↓
    Tests
        ↓
    Build
        ↓
    Security
        ↓
    Performance
        ↓
    Docker Build & Push
        ↓
    Deploy to Production (main only)
        ↓
    Health Check
        ↓
    Slack Notification
```

### **Triggers**

```yaml
# Sur push vers main ou develop
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

---

## 🐳 Docker

### **Build Image**

```bash
# Build local
docker build -t lisa:latest .

# Tag pour registry
docker tag lisa:latest ghcr.io/your-org/lisa:latest

# Push
docker push ghcr.io/your-org/lisa:latest
```

### **Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3001

CMD ["npm", "start"]
```

---

## ☸️ Kubernetes

### **Vérifier le Déploiement**

```bash
# Voir les pods
kubectl get pods -n lisa

# Voir les services
kubectl get svc -n lisa

# Voir l'ingress
kubectl get ingress -n lisa

# Logs
kubectl logs -f deployment/lisa-api -n lisa

# Describe pod
kubectl describe pod <pod-name> -n lisa
```

### **Scaling**

```bash
# Manual scaling
kubectl scale deployment lisa-api --replicas=5 -n lisa

# Auto-scaling (HPA)
kubectl autoscale deployment lisa-api \
  --min=3 --max=10 \
  --cpu-percent=80 \
  -n lisa
```

### **Rolling Update**

```bash
# Update image
kubectl set image deployment/lisa-api \
  api=ghcr.io/your-org/lisa:v1.2.0 \
  -n lisa

# Check rollout status
kubectl rollout status deployment/lisa-api -n lisa

# Rollback if needed
kubectl rollout undo deployment/lisa-api -n lisa
```

---

## 📈 Monitoring

### **Prometheus**

```bash
# Port forward
kubectl port-forward svc/prometheus 9090:9090 -n lisa

# Access at http://localhost:9090
```

### **Grafana**

```bash
# Port forward
kubectl port-forward svc/grafana 3000:3000 -n lisa

# Access at http://localhost:3000
# Default: admin/admin
```

### **Logs**

```bash
# View logs
kubectl logs deployment/lisa-api -n lisa

# Follow logs
kubectl logs -f deployment/lisa-api -n lisa

# Previous logs
kubectl logs deployment/lisa-api --previous -n lisa
```

---

## 🧪 Tests

### **Unit Tests**

```bash
npm run test
```

### **E2E Tests**

```bash
npm run test:e2e
```

### **Performance Tests**

```bash
npm run build
lighthouse http://localhost:5173 --view
```

### **Security Tests**

```bash
npm audit
npm run lint
```

---

## 📋 Checklist Phase 4

- [x] GitHub Actions workflow créé
- [x] Kubernetes manifests créés
- [x] Helm chart créé
- [ ] GitHub secrets configurés
- [ ] Kubernetes cluster configuré
- [ ] Docker images buildées
- [ ] Helm chart installé
- [ ] Pipeline testée
- [ ] Monitoring configuré
- [ ] Documentation complétée

---

## 🚨 Troubleshooting

### **Pod ne démarre pas**

```bash
# Voir les logs
kubectl logs <pod-name> -n lisa

# Describe le pod
kubectl describe pod <pod-name> -n lisa

# Vérifier les ressources
kubectl top pods -n lisa
```

### **Service inaccessible**

```bash
# Vérifier le service
kubectl get svc -n lisa

# Port forward
kubectl port-forward svc/lisa-api 3001:3001 -n lisa

# Test
curl http://localhost:3001/health
```

### **Ingress ne fonctionne pas**

```bash
# Vérifier l'ingress
kubectl get ingress -n lisa

# Describe l'ingress
kubectl describe ingress lisa-ingress -n lisa

# Vérifier les certificats
kubectl get certificates -n lisa
```

### **Pipeline échoue**

```bash
# Voir les logs GitHub Actions
gh run list --repo your-org/lisa

# Voir les détails
gh run view <run-id> --repo your-org/lisa
```

---

## 📚 Ressources

- **GitHub Actions:** https://docs.github.com/en/actions
- **Kubernetes:** https://kubernetes.io/docs/
- **Helm:** https://helm.sh/docs/
- **Docker:** https://docs.docker.com/

---

## ✅ Prochaines Étapes

1. **Monitoring Avancé**
   - Prometheus alerting
   - Grafana dashboards
   - Log aggregation

2. **Scalabilité**
   - Horizontal Pod Autoscaling
   - Vertical Pod Autoscaling
   - Cluster autoscaling

3. **Disaster Recovery**
   - Backup strategy
   - Restore procedures
   - Failover testing

4. **Documentation**
   - Runbooks
   - Troubleshooting guides
   - Architecture diagrams

---

**🚀 DevOps implémenté avec succès!**

*Phase 4 en cours - 30 Octobre 2025*
