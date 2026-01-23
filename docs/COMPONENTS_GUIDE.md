# Guide des Composants UI - Lisa

Ce guide présente les composants réutilisables de Lisa avec des exemples d'utilisation.

---

## Table des matières

1. [DataCard](#datacard) - KPIs animés
2. [ChartCard](#chartcard) - Wrapper graphique
3. [ProgressRing](#progressring) - Indicateur circulaire
4. [Timeline](#timeline) - Événements chronologiques
5. [StatGrid](#statgrid) - Grille de statistiques
6. [EmptyState](#emptystate) - État vide élégant

---

## DataCard

Affiche des KPIs/métriques avec animations, sparklines et tendances.

### Import

```tsx
import { DataCard } from '@/components/ui/DataCard';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `title` | `string` | - | Titre de la métrique |
| `value` | `number` | - | Valeur à afficher |
| `previousValue` | `number` | - | Valeur précédente (pour calcul du trend) |
| `format` | `'number' \| 'currency' \| 'percent' \| 'compact'` | `'number'` | Format d'affichage |
| `trend` | `string \| number` | - | Tendance manuelle |
| `trendDirection` | `'up' \| 'down' \| 'neutral'` | auto | Direction de la tendance |
| `sparkline` | `number[]` | - | Données pour mini-graphique |
| `icon` | `ReactNode` | - | Icône optionnelle |
| `color` | `'blue' \| 'green' \| 'red' \| 'purple' \| 'orange' \| 'cyan'` | `'blue'` | Couleur du thème |
| `loading` | `boolean` | `false` | État de chargement |
| `animate` | `boolean` | `true` | Animation du compteur |
| `subtitle` | `string` | - | Sous-titre optionnel |

### Exemples

```tsx
// Basique
<DataCard 
  title="Revenus" 
  value={125000} 
  format="currency" 
/>

// Avec tendance calculée automatiquement
<DataCard 
  title="Utilisateurs actifs" 
  value={1250} 
  previousValue={1100}
  format="compact"
  color="green"
/>

// Avec sparkline
<DataCard 
  title="Ventes mensuelles" 
  value={45000} 
  format="currency"
  sparkline={[35000, 38000, 42000, 40000, 45000]}
  trend="+12.5%"
  trendDirection="up"
/>

// Avec icône
import { Users } from 'lucide-react';

<DataCard 
  title="Nouveaux clients" 
  value={89} 
  icon={<Users size={20} />}
  color="purple"
  subtitle="Cette semaine"
/>

// État de chargement
<DataCard 
  title="Chargement..." 
  value={0} 
  loading={true}
/>
```

---

## ChartCard

Wrapper pour graphiques avec actions (export, plein écran, actualiser).

### Import

```tsx
import { ChartCard } from '@/components/ui/ChartCard';
import { ChartRenderer } from '@/components/chat/ChartRenderer';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `title` | `string` | - | Titre du graphique |
| `subtitle` | `string` | - | Sous-titre optionnel |
| `children` | `ReactNode` | - | Contenu (graphique) |
| `onExport` | `() => void` | - | Callback d'export personnalisé |
| `onRefresh` | `() => void` | - | Callback d'actualisation |
| `onFullscreen` | `boolean` | `true` | Activer le mode plein écran |
| `loading` | `boolean` | `false` | État de chargement |
| `error` | `string` | - | Message d'erreur |
| `lastUpdated` | `Date` | - | Date de dernière mise à jour |
| `actions` | `ReactNode` | - | Actions personnalisées |

### Exemples

```tsx
// Basique avec ChartRenderer
<ChartCard title="Ventes 2024" subtitle="En milliers d'euros">
  <ChartRenderer chartData={{
    type: 'line',
    data: [
      { mois: 'Jan', ventes: 120 },
      { mois: 'Fév', ventes: 150 },
      { mois: 'Mar', ventes: 180 },
    ],
    xKey: 'mois',
    yKey: 'ventes'
  }} />
</ChartCard>

// Avec actualisation
const [data, setData] = useState(initialData);
const [loading, setLoading] = useState(false);

const handleRefresh = async () => {
  setLoading(true);
  const newData = await fetchData();
  setData(newData);
  setLoading(false);
};

<ChartCard 
  title="Données temps réel"
  onRefresh={handleRefresh}
  loading={loading}
  lastUpdated={new Date()}
>
  <ChartRenderer chartData={data} />
</ChartCard>

// Avec erreur
<ChartCard 
  title="Graphique"
  error="Impossible de charger les données"
  onRefresh={() => retry()}
/>
```

---

## ProgressRing

Indicateur de progression circulaire avec animation.

### Import

```tsx
import { ProgressRing } from '@/components/ui/ProgressRing';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `value` | `number` | - | Valeur actuelle |
| `max` | `number` | `100` | Valeur maximale |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Taille |
| `color` | `'blue' \| 'green' \| 'red' \| 'purple' \| 'orange' \| 'cyan' \| 'gradient'` | `'blue'` | Couleur |
| `thickness` | `number` | auto | Épaisseur du trait |
| `showValue` | `boolean` | `true` | Afficher le pourcentage |
| `showLabel` | `boolean` | `true` | Afficher le label |
| `label` | `string` | - | Texte du label |
| `animate` | `boolean` | `true` | Animer la progression |
| `children` | `ReactNode` | - | Contenu central personnalisé |

### Exemples

```tsx
// Basique
<ProgressRing value={75} />

// Avec label
<ProgressRing 
  value={85} 
  label="Complétion"
  color="green"
/>

// Grande taille avec gradient
<ProgressRing 
  value={60} 
  size="xl"
  color="gradient"
  label="Score"
/>

// Petite taille
<ProgressRing 
  value={42} 
  size="sm"
  color="orange"
/>

// Contenu personnalisé
<ProgressRing value={90} size="lg" color="purple">
  <div className="text-center">
    <span className="text-2xl font-bold text-white">A+</span>
    <span className="text-xs text-slate-400 block">Note</span>
  </div>
</ProgressRing>

// Sans animation
<ProgressRing 
  value={100} 
  animate={false}
  color="green"
  label="Terminé"
/>
```

---

## Timeline

Affiche des événements chronologiques avec statuts.

### Import

```tsx
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `items` | `TimelineItem[]` | - | Liste des événements |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Orientation |
| `showConnectors` | `boolean` | `true` | Afficher les connecteurs |
| `animate` | `boolean` | `true` | Animer l'apparition |

### TimelineItem

| Prop | Type | Description |
|------|------|-------------|
| `date` | `string \| Date` | Date de l'événement |
| `title` | `string` | Titre |
| `description` | `string` | Description optionnelle |
| `status` | `'completed' \| 'current' \| 'pending' \| 'error'` | Statut |
| `icon` | `ReactNode` | Icône personnalisée |
| `metadata` | `Record<string, string>` | Métadonnées |

### Exemples

```tsx
// Vertical (défaut)
<Timeline items={[
  { 
    date: '2024-01-15', 
    title: 'Projet lancé', 
    status: 'completed',
    description: 'Démarrage officiel du projet'
  },
  { 
    date: '2024-03-01', 
    title: 'Phase 1 terminée', 
    status: 'completed' 
  },
  { 
    date: '2024-06-15', 
    title: 'Phase 2 en cours', 
    status: 'current',
    metadata: { 'Progression': '65%', 'Équipe': '5 personnes' }
  },
  { 
    date: '2024-09-01', 
    title: 'Lancement v2.0', 
    status: 'pending' 
  },
]} />

// Horizontal
<Timeline 
  orientation="horizontal"
  items={[
    { date: '2024-01', title: 'Q1', status: 'completed' },
    { date: '2024-04', title: 'Q2', status: 'completed' },
    { date: '2024-07', title: 'Q3', status: 'current' },
    { date: '2024-10', title: 'Q4', status: 'pending' },
  ]}
/>

// Avec icônes personnalisées
import { Rocket, Code, TestTube, Flag } from 'lucide-react';

<Timeline items={[
  { date: '2024-01', title: 'Lancement', status: 'completed', icon: <Rocket size={18} /> },
  { date: '2024-02', title: 'Développement', status: 'completed', icon: <Code size={18} /> },
  { date: '2024-03', title: 'Tests', status: 'current', icon: <TestTube size={18} /> },
  { date: '2024-04', title: 'Release', status: 'pending', icon: <Flag size={18} /> },
]} />

// Avec erreur
<Timeline items={[
  { date: '2024-01', title: 'Étape 1', status: 'completed' },
  { date: '2024-02', title: 'Étape 2', status: 'error', description: 'Échec de déploiement' },
  { date: '2024-03', title: 'Étape 3', status: 'pending' },
]} />
```

---

## StatGrid

Grille de statistiques avec icônes et formatage.

### Import

```tsx
import { StatGrid, type StatItem } from '@/components/ui/StatGrid';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `stats` | `StatItem[]` | - | Liste des statistiques |
| `columns` | `2 \| 3 \| 4 \| 5 \| 6` | `4` | Nombre de colonnes |
| `gap` | `'sm' \| 'md' \| 'lg'` | `'md'` | Espacement |
| `variant` | `'default' \| 'compact' \| 'bordered'` | `'default'` | Style |

### StatItem

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Libellé |
| `value` | `number \| string` | Valeur |
| `format` | `'number' \| 'currency' \| 'percent' \| 'compact'` | Format |
| `icon` | `LucideIcon` | Icône |
| `color` | `string` | Couleur |
| `trend` | `number` | Tendance en % |
| `prefix` | `string` | Préfixe |
| `suffix` | `string` | Suffixe |

### Exemples

```tsx
import { Users, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

// Défaut
<StatGrid stats={[
  { label: 'Utilisateurs', value: 12543, format: 'compact', icon: Users, color: 'blue' },
  { label: 'Revenus', value: 45600, format: 'currency', icon: DollarSign, color: 'green' },
  { label: 'Commandes', value: 892, icon: ShoppingCart, color: 'purple' },
  { label: 'Croissance', value: 12.5, suffix: '%', icon: TrendingUp, color: 'cyan', trend: 12.5 },
]} />

// Compact (3 colonnes)
<StatGrid 
  variant="compact"
  columns={3}
  stats={[
    { label: 'Vues', value: 45000, format: 'compact', color: 'blue' },
    { label: 'Clics', value: 2300, format: 'compact', color: 'green' },
    { label: 'Taux', value: 5.1, suffix: '%', color: 'purple' },
  ]}
/>

// Bordered (2 colonnes)
<StatGrid 
  variant="bordered"
  columns={2}
  stats={[
    { label: 'Total', value: 125000, format: 'currency', color: 'blue', trend: 8 },
    { label: 'Moyenne', value: 450, format: 'currency', color: 'green', trend: -2 },
  ]}
/>
```

---

## EmptyState

État vide élégant avec icône, titre, description et actions.

### Import

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
```

### Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `icon` | `LucideIcon` | `Inbox` | Icône |
| `title` | `string` | - | Titre |
| `description` | `string` | - | Description |
| `action` | `EmptyStateAction` | - | Action principale |
| `secondaryAction` | `EmptyStateAction` | - | Action secondaire |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Taille |
| `children` | `ReactNode` | - | Contenu personnalisé |

### Exemples

```tsx
import { Search, Plus, FileText, RefreshCw, Upload } from 'lucide-react';

// Recherche sans résultats
<EmptyState 
  icon={Search}
  title="Aucun résultat"
  description="Aucun élément ne correspond à votre recherche. Essayez avec d'autres termes."
  action={{
    label: 'Réinitialiser la recherche',
    onClick: () => resetSearch(),
  }}
/>

// Liste vide
<EmptyState 
  icon={FileText}
  title="Aucun document"
  description="Vous n'avez pas encore de documents. Commencez par en créer un."
  action={{
    label: 'Créer un document',
    onClick: () => createDocument(),
    icon: Plus,
  }}
/>

// Erreur de chargement
<EmptyState 
  icon={RefreshCw}
  title="Erreur de chargement"
  description="Une erreur s'est produite lors du chargement des données."
  action={{
    label: 'Réessayer',
    onClick: () => retry(),
  }}
  secondaryAction={{
    label: 'Annuler',
    onClick: () => cancel(),
  }}
/>

// Avec contenu personnalisé
<EmptyState 
  icon={Upload}
  title="Glissez vos fichiers ici"
  size="lg"
>
  <div className="mt-4 p-4 border-2 border-dashed border-slate-600 rounded-lg">
    <p className="text-slate-400">ou cliquez pour sélectionner</p>
  </div>
</EmptyState>

// Taille compacte
<EmptyState 
  icon={Search}
  title="Aucun résultat"
  size="sm"
/>
```

---

## Bonnes pratiques

### 1. Cohérence des couleurs

Utilisez les mêmes couleurs pour les mêmes types de données :
- **Bleu** : Valeurs neutres, informations
- **Vert** : Succès, croissance, positif
- **Rouge** : Erreur, baisse, négatif
- **Purple** : Nouveauté, premium
- **Orange** : Attention, avertissement
- **Cyan** : Progression, processus

### 2. Responsive Design

Tous les composants sont responsive. Utilisez `columns` pour StatGrid :

```tsx
<StatGrid columns={4} /> // 2 sur mobile, 4 sur desktop
```

### 3. État de chargement

Affichez toujours un état de chargement :

```tsx
<DataCard loading={isLoading} ... />
<ChartCard loading={isLoading} ... />
```

### 4. Accessibilité

- Utilisez des labels descriptifs
- Les animations peuvent être désactivées avec `animate={false}`
- Les couleurs ont un contraste suffisant

---

## Installation rapide

Tous ces composants sont dans `src/components/ui/`. Pour les utiliser :

```tsx
// Import individuel
import { DataCard } from '@/components/ui/DataCard';
import { ChartCard } from '@/components/ui/ChartCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Timeline } from '@/components/ui/Timeline';
import { StatGrid } from '@/components/ui/StatGrid';
import { EmptyState } from '@/components/ui/EmptyState';
```

---

*Documentation générée le 7 janvier 2026 - Lisa v2.0*
