/**
 * 🎨 Code Playground - Éditeur de code inspiré de CodePen
 * Avec Monaco Editor pour la colorisation syntaxique
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Code, Eye, Copy, Download,
  ChevronDown, Maximize2, Minimize2, RefreshCw, Trash2,
  FileCode, Palette, Terminal, CheckCircle, XCircle,
  Sun, Moon, Columns, Rows, Square, Atom, Braces
} from 'lucide-react';

// Types
interface EditorTab {
  id: string;
  label: string;
  language: string;
  icon: React.ReactNode;
  defaultValue: string;
}

type LayoutMode = 'horizontal' | 'vertical' | 'preview-only';
type Theme = 'vs-dark' | 'light';
type PlaygroundMode = 'web' | 'html' | 'css' | 'javascript' | 'typescript' | 'python' | 'react';

// Mode configuration
interface ModeConfig {
  id: PlaygroundMode;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const PLAYGROUND_MODES: ModeConfig[] = [
  { id: 'web', label: 'Web', icon: <Braces size={14} />, color: '#f5a623', description: 'HTML + CSS + JS' },
  { id: 'html', label: 'HTML', icon: <FileCode size={14} />, color: '#e34c26', description: 'HTML seul' },
  { id: 'css', label: 'CSS', icon: <Palette size={14} />, color: '#264de4', description: 'CSS seul' },
  { id: 'javascript', label: 'JavaScript', icon: <Braces size={14} />, color: '#f7df1e', description: 'JS seul' },
  { id: 'typescript', label: 'TypeScript', icon: <FileCode size={14} />, color: '#3178c6', description: 'TS seul' },
  { id: 'python', label: 'Python', icon: <Terminal size={14} />, color: '#3776ab', description: 'Pyodide' },
  { id: 'react', label: 'React', icon: <Atom size={14} />, color: '#61dafb', description: 'JSX + CSS' },
];

// Tabs configuration for Web mode (HTML/CSS/JS)
const WEB_TABS: EditorTab[] = [
  {
    id: 'html',
    label: 'HTML',
    language: 'html',
    icon: <FileCode size={14} />,
    defaultValue: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lisa Playground</title>
</head>
<body>
  <div class="container">
    <h1>🚀 Bienvenue sur Lisa</h1>
    <p class="subtitle">Votre assistant IA intelligent</p>
    
    <div class="card">
      <h2>Fonctionnalités</h2>
      <ul>
        <li>💬 Chat intelligent</li>
        <li>👁️ Vision par ordinateur</li>
        <li>🎤 Reconnaissance vocale</li>
        <li>🏠 Maison connectée</li>
      </ul>
    </div>
    
    <button id="actionBtn" class="btn">
      Cliquez-moi !
    </button>
    
    <div id="output" class="output"></div>
  </div>
</body>
</html>`
  },
  {
    id: 'css',
    label: 'CSS',
    language: 'css',
    icon: <Palette size={14} />,
    defaultValue: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.container {
  max-width: 600px;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #f5a623, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #6a6a82;
  font-size: 1.1rem;
  margin-bottom: 30px;
}

.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card h2 {
  color: #fff;
  font-size: 1.2rem;
  margin-bottom: 16px;
}

.card ul {
  list-style: none;
  text-align: left;
}

.card li {
  color: #ccc;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.card li:last-child {
  border-bottom: none;
}

.btn {
  background: linear-gradient(90deg, #f5a623, #e6951a);
  color: white;
  border: none;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(245, 166, 35, 0.3);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(245, 166, 35, 0.4);
}

.btn:active {
  transform: translateY(0);
}

.output {
  margin-top: 20px;
  padding: 16px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  color: #8b5cf6;
  font-weight: 500;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.output.active {
  background: rgba(245, 166, 35, 0.1);
  color: #f5a623;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 1.5s infinite;
}`
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    language: 'javascript',
    icon: <Terminal size={14} />,
    defaultValue: `// 🎯 Lisa Code Playground - JavaScript
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('actionBtn');
  const output = document.getElementById('output');
  let clickCount = 0;

  const messages = [
    '✨ Excellent ! Continuez à explorer !',
    '🎉 Vous maîtrisez le code !',
    '🚀 Lisa est impressionnée !',
    '💡 Créativité en action !',
    '🔥 Vous êtes en feu !',
  ];

  btn.addEventListener('click', () => {
    clickCount++;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    output.classList.add('active');
    output.innerHTML = \`
      <span>\${randomMessage}</span>
      <span style="margin-left: 10px; font-size: 0.9em; opacity: 0.7;">
        (Clics: \${clickCount})
      </span>
    \`;

    // Animation du bouton
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 100);
  });

  // Message initial
  output.textContent = 'Cliquez sur le bouton pour commencer !';
  
  console.log('🎨 Lisa Playground chargé avec succès !');
});`
  }
];

// Tabs configuration for Python mode
const PYTHON_TABS: EditorTab[] = [
  {
    id: 'python',
    label: 'Python',
    language: 'python',
    icon: <Terminal size={14} />,
    defaultValue: `# 🐍 Lisa Python Playground
# Powered by Pyodide - Python dans le navigateur

import sys
print(f"Python {sys.version}")

# Variables et opérations
nom = "Lisa"
age = 2024 - 2023
print(f"Bonjour, je suis {nom} et j'ai {age} an(s) !")

# Listes et boucles
fonctionnalites = [
    "💬 Chat intelligent",
    "👁️ Vision par ordinateur", 
    "🎤 Reconnaissance vocale",
    "🏠 Maison connectée"
]

print("\\n📋 Fonctionnalités de Lisa:")
for i, feature in enumerate(fonctionnalites, 1):
    print(f"  {i}. {feature}")

# Fonctions
def calculer_fibonacci(n):
    """Calcule les n premiers nombres de Fibonacci"""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]

print(f"\\n🔢 Fibonacci(10): {calculer_fibonacci(10)}")

# Classes
class Assistant:
    def __init__(self, name):
        self.name = name
        self.skills = []
    
    def add_skill(self, skill):
        self.skills.append(skill)
        return self
    
    def present(self):
        print(f"\\n🤖 Je suis {self.name}!")
        print(f"   Mes compétences: {', '.join(self.skills)}")

lisa = Assistant("Lisa")
lisa.add_skill("Python").add_skill("IA").add_skill("Vision")
lisa.present()

print("\\n✅ Code Python exécuté avec succès !")`
  }
];

// Tabs configuration for React mode
const REACT_TABS: EditorTab[] = [
  {
    id: 'jsx',
    label: 'App.jsx',
    language: 'javascript',
    icon: <Atom size={14} />,
    defaultValue: `// 🚀 Lisa React Playground
// Composant React avec hooks

function App() {
  const [count, setCount] = React.useState(0);
  const [items, setItems] = React.useState([
    { id: 1, text: '💬 Chat intelligent', done: true },
    { id: 2, text: '👁️ Vision par ordinateur', done: true },
    { id: 3, text: '🎤 Reconnaissance vocale', done: false },
  ]);
  const [newItem, setNewItem] = React.useState('');

  const addItem = () => {
    if (newItem.trim()) {
      setItems([...items, { 
        id: Date.now(), 
        text: newItem, 
        done: false 
      }]);
      setNewItem('');
    }
  };

  const toggleItem = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 Lisa React</h1>
        <p>Playground React en temps réel</p>
      </header>

      <div className="counter-section">
        <h2>Compteur: {count}</h2>
        <div className="button-group">
          <button onClick={() => setCount(c => c - 1)}>−</button>
          <button onClick={() => setCount(0)}>Reset</button>
          <button onClick={() => setCount(c => c + 1)}>+</button>
        </div>
      </div>

      <div className="todo-section">
        <h2>📋 Todo List</h2>
        <div className="add-item">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
            placeholder="Nouvelle tâche..."
          />
          <button onClick={addItem}>Ajouter</button>
        </div>
        <ul className="todo-list">
          {items.map(item => (
            <li key={item.id} className={item.done ? 'done' : ''}>
              <span onClick={() => toggleItem(item.id)}>
                {item.done ? '✅' : '⬜'} {item.text}
              </span>
              <button onClick={() => removeItem(item.id)}>🗑️</button>
            </li>
          ))}
        </ul>
        <p className="stats">
          {items.filter(i => i.done).length}/{items.length} complétées
        </p>
      </div>
    </div>
  );
}

// Rendu du composant
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
  },
  {
    id: 'css',
    label: 'Styles',
    language: 'css',
    icon: <Palette size={14} />,
    defaultValue: `/* 🎨 Styles React Playground */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  padding: 20px;
  color: #fff;
}

.app {
  max-width: 500px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2rem;
  background: linear-gradient(90deg, #61dafb, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header p {
  color: #6a6a82;
  margin-top: 8px;
}

.counter-section, .todo-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.counter-section h2 {
  text-align: center;
  font-size: 1.5rem;
  margin-bottom: 16px;
  color: #61dafb;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.button-group button {
  padding: 12px 24px;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #2d2d44;
  color: #fff;
  transition: all 0.2s;
}

.button-group button:hover {
  background: #61dafb;
  color: #000;
}

.todo-section h2 {
  margin-bottom: 16px;
}

.add-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.add-item input {
  flex: 1;
  padding: 12px;
  border: 1px solid #2d2d44;
  border-radius: 8px;
  background: #1a1a2e;
  color: #fff;
  font-size: 14px;
}

.add-item button {
  padding: 12px 20px;
  background: #61dafb;
  color: #000;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.todo-list {
  list-style: none;
}

.todo-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.todo-list li:hover {
  background: rgba(255, 255, 255, 0.08);
}

.todo-list li.done span {
  text-decoration: line-through;
  opacity: 0.5;
}

.todo-list li span {
  cursor: pointer;
  flex: 1;
}

.todo-list li button {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.todo-list li button:hover {
  opacity: 1;
}

.stats {
  text-align: center;
  margin-top: 16px;
  color: #6a6a82;
  font-size: 14px;
}`
  }
];

// Tabs for individual language modes
const HTML_TABS: EditorTab[] = [
  {
    id: 'html',
    label: 'index.html',
    language: 'html',
    icon: <FileCode size={14} />,
    defaultValue: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HTML Playground</title>
  <style>
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 600px; text-align: center; }
    h1 { color: #e34c26; margin-bottom: 20px; }
    .card {
      background: rgba(255,255,255,0.05);
      padding: 24px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    ul { list-style: none; text-align: left; }
    li { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏷️ HTML Playground</h1>
    <p>Éditez le HTML et voyez le résultat en temps réel</p>
    
    <div class="card">
      <h2>Éléments HTML</h2>
      <ul>
        <li>📝 <strong>Paragraphes</strong> - &lt;p&gt;</li>
        <li>🔗 <strong>Liens</strong> - &lt;a href=""&gt;</li>
        <li>🖼️ <strong>Images</strong> - &lt;img src=""&gt;</li>
        <li>📋 <strong>Listes</strong> - &lt;ul&gt;, &lt;ol&gt;</li>
        <li>📊 <strong>Tableaux</strong> - &lt;table&gt;</li>
        <li>📝 <strong>Formulaires</strong> - &lt;form&gt;</li>
      </ul>
    </div>
  </div>
</body>
</html>`
  }
];

const CSS_TABS: EditorTab[] = [
  {
    id: 'css',
    label: 'styles.css',
    language: 'css',
    icon: <Palette size={14} />,
    defaultValue: `/* 🎨 CSS Playground - Explorez les styles ! */

/* Variables CSS modernes */
:root {
  --primary: #264de4;
  --secondary: #8b5cf6;
  --accent: #f5a623;
  --bg-dark: #1a1a2e;
  --bg-card: rgba(255, 255, 255, 0.05);
  --text: #ffffff;
  --text-muted: #6a6a82;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, var(--bg-dark) 0%, #16213e 100%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.demo-container {
  max-width: 500px;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 30px;
}

/* Card avec effet glassmorphism */
.card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
}

/* Bouton animé */
.btn {
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  color: white;
  border: none;
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(38, 77, 228, 0.3);
}

.btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 25px rgba(38, 77, 228, 0.4);
}

/* Animation keyframes */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.floating {
  animation: float 3s ease-in-out infinite;
}

/* Grid layout moderne */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.grid-item {
  background: rgba(38, 77, 228, 0.1);
  padding: 20px;
  border-radius: 12px;
  color: var(--text);
}`
  }
];

const JAVASCRIPT_TABS: EditorTab[] = [
  {
    id: 'javascript',
    label: 'script.js',
    language: 'javascript',
    icon: <Braces size={14} />,
    defaultValue: `// 🟨 JavaScript Playground
// Exécutez du JavaScript pur dans le navigateur

console.log('🚀 JavaScript Playground chargé !');

// Variables et types
const nom = 'Lisa';
let compteur = 0;

// Fonctions
function saluer(name) {
  return \`Bonjour, \${name} ! 👋\`;
}

console.log(saluer(nom));

// Arrow functions
const carre = (n) => n * n;
const cube = (n) => n ** 3;

console.log(\`Carré de 5: \${carre(5)}\`);
console.log(\`Cube de 3: \${cube(3)}\`);

// Arrays et méthodes
const nombres = [1, 2, 3, 4, 5];
const doubles = nombres.map(n => n * 2);
const pairs = nombres.filter(n => n % 2 === 0);
const somme = nombres.reduce((acc, n) => acc + n, 0);

console.log('Nombres:', nombres);
console.log('Doubles:', doubles);
console.log('Pairs:', pairs);
console.log('Somme:', somme);

// Objets et destructuring
const utilisateur = {
  nom: 'Lisa',
  age: 1,
  skills: ['IA', 'Vision', 'Chat']
};

const { nom: userName, skills } = utilisateur;
console.log(\`\${userName} maîtrise: \${skills.join(', ')}\`);

// Async/Await (simulé)
const attendre = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function demo() {
  console.log('⏳ Début de la démo async...');
  await attendre(1000);
  console.log('✅ Opération terminée après 1s');
}

demo();

// Classes ES6
class Assistant {
  constructor(name) {
    this.name = name;
    this.createdAt = new Date();
  }
  
  present() {
    console.log(\`🤖 Je suis \${this.name}, créé le \${this.createdAt.toLocaleDateString()}\`);
  }
}

const lisa = new Assistant('Lisa');
lisa.present();

console.log('\\n✨ Fin du script JavaScript !');`
  }
];

const TYPESCRIPT_TABS: EditorTab[] = [
  {
    id: 'typescript',
    label: 'main.ts',
    language: 'typescript',
    icon: <FileCode size={14} />,
    defaultValue: `// 🔷 TypeScript Playground
// TypeScript avec typage statique

// Types de base
const nom: string = 'Lisa';
const age: number = 1;
const actif: boolean = true;

console.log(\`\${nom} a \${age} an(s), actif: \${actif}\`);

// Interfaces
interface Utilisateur {
  id: number;
  nom: string;
  email: string;
  roles: string[];
}

const user: Utilisateur = {
  id: 1,
  nom: 'Lisa',
  email: 'lisa@assistant.ai',
  roles: ['admin', 'ai']
};

console.log('Utilisateur:', user);

// Types génériques
function premier<T>(tableau: T[]): T | undefined {
  return tableau[0];
}

const nombres: number[] = [1, 2, 3];
const mots: string[] = ['hello', 'world'];

console.log('Premier nombre:', premier(nombres));
console.log('Premier mot:', premier(mots));

// Enums
enum Status {
  Pending = 'PENDING',
  Active = 'ACTIVE',
  Completed = 'COMPLETED'
}

const taskStatus: Status = Status.Active;
console.log('Status:', taskStatus);

// Type unions et guards
type Result = { success: true; data: string } | { success: false; error: string };

function handleResult(result: Result): void {
  if (result.success) {
    console.log('✅ Succès:', result.data);
  } else {
    console.log('❌ Erreur:', result.error);
  }
}

handleResult({ success: true, data: 'Opération réussie !' });
handleResult({ success: false, error: 'Une erreur est survenue' });

// Classes avec types
class ApiService<T> {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async fetch(endpoint: string): Promise<T> {
    console.log(\`Fetching: \${this.baseUrl}/\${endpoint}\`);
    // Simulation
    return {} as T;
  }
}

const api = new ApiService<Utilisateur>('https://api.lisa.ai');
api.fetch('users/1');

console.log('\\n🔷 TypeScript compilé avec succès !');`
  }
];

// Monaco Editor options
const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
  fontLigatures: true,
  lineNumbers: 'on' as const,
  roundedSelection: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const,
  padding: { top: 16, bottom: 16 },
  smoothScrolling: true,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
};

// Helper to get tabs for current mode
const getTabsForMode = (mode: PlaygroundMode): EditorTab[] => {
  switch (mode) {
    case 'html': return HTML_TABS;
    case 'css': return CSS_TABS;
    case 'javascript': return JAVASCRIPT_TABS;
    case 'typescript': return TYPESCRIPT_TABS;
    case 'python': return PYTHON_TABS;
    case 'react': return REACT_TABS;
    default: return WEB_TABS;
  }
};

// Helper to get initial code for mode
const getInitialCodeForMode = (mode: PlaygroundMode): Record<string, string> => {
  const tabs = getTabsForMode(mode);
  return tabs.reduce((acc, tab) => ({ ...acc, [tab.id]: tab.defaultValue }), {});
};

export default function CodePlayground() {
  const [mode, setMode] = useState<PlaygroundMode>('web');
  const [activeTab, setActiveTab] = useState<string>('html');
  const [code, setCode] = useState<Record<string, string>>(getInitialCodeForMode('web'));
  const [layout, setLayout] = useState<LayoutMode>('horizontal');
  const [theme, setTheme] = useState<Theme>('vs-dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [pythonLoading, setPythonLoading] = useState(false);
  const [pythonReady, setPythonReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get current tabs based on mode
  const currentTabs = getTabsForMode(mode);

  // Handle mode change
  const handleModeChange = useCallback((newMode: PlaygroundMode) => {
    setMode(newMode);
    const newTabs = getTabsForMode(newMode);
    setActiveTab(newTabs[0].id);
    setCode(getInitialCodeForMode(newMode));
    setConsoleOutput([]);
    setPythonReady(false);
  }, []);

  // Generate preview HTML for Web mode
  const generateWebPreview = useCallback(() => {
    const html = code.html || '';
    const css = code.css || '';
    const js = code.javascript || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
  ${html.replace(/<!DOCTYPE html>|<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>|<meta[^>]*>|<title[^>]*>.*?<\/title>/gi, '')}
  <script>
    // Console override
    const originalConsole = console.log;
    console.log = function(...args) {
      originalConsole.apply(console, args);
      window.parent.postMessage({ type: 'console', data: args.map(a => String(a)).join(' ') }, '*');
    };
    console.error = function(...args) {
      window.parent.postMessage({ type: 'console-error', data: args.map(a => String(a)).join(' ') }, '*');
    };
    try {
      ${js}
    } catch(e) {
      console.error('Error:', e.message);
    }
  </script>
</body>
</html>`;
  }, [code]);

  // Generate preview for React mode
  const generateReactPreview = useCallback(() => {
    const jsx = code.jsx || '';
    const css = code.css || '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Console override
    const originalLog = console.log;
    const originalError = console.error;
    console.log = function(...args) {
      originalLog.apply(console, args);
      window.parent.postMessage({ type: 'console', data: args.map(a => String(a)).join(' ') }, '*');
    };
    console.error = function(...args) {
      originalError.apply(console, args);
      window.parent.postMessage({ type: 'console-error', data: args.map(a => String(a)).join(' ') }, '*');
    };
  </script>
  <script type="text/babel">
    try {
      ${jsx}
    } catch(e) {
      console.error('Error:', e.message);
      document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">Erreur: ' + e.message + '</div>';
    }
  </script>
</body>
</html>`;
  }, [code]);

  // Generate preview for Python mode
  const generatePythonPreview = useCallback(() => {
    const pythonCode = code.python || '';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Fira Code', 'JetBrains Mono', monospace;
      background: #1a1a2e;
      color: #f5a623;
      padding: 20px;
      min-height: 100vh;
    }
    #output {
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .loading {
      color: #8b5cf6;
      animation: pulse 1.5s infinite;
    }
    .error { color: #ef4444; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div id="output"><span class="loading">🐍 Chargement de Python (Pyodide)...</span></div>
  <script>
    const output = document.getElementById('output');
    
    async function runPython() {
      try {
        window.parent.postMessage({ type: 'python-loading' }, '*');
        
        const pyodide = await loadPyodide();
        
        // Redirect stdout
        pyodide.setStdout({
          batched: (text) => {
            output.innerHTML += text;
            window.parent.postMessage({ type: 'console', data: text.trim() }, '*');
          }
        });
        
        pyodide.setStderr({
          batched: (text) => {
            output.innerHTML += '<span class="error">' + text + '</span>';
            window.parent.postMessage({ type: 'console-error', data: text.trim() }, '*');
          }
        });
        
        output.innerHTML = '';
        window.parent.postMessage({ type: 'python-ready' }, '*');
        
        await pyodide.runPythonAsync(\`${pythonCode.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`);
        
      } catch (e) {
        output.innerHTML = '<span class="error">❌ Erreur: ' + e.message + '</span>';
        window.parent.postMessage({ type: 'console-error', data: e.message }, '*');
      }
    }
    
    runPython();
  </script>
</body>
</html>`;
  }, [code]);

  // Generate preview for HTML-only mode
  const generateHtmlPreview = useCallback(() => {
    const html = code.html || '';
    return html;
  }, [code]);

  // Generate preview for CSS-only mode
  const generateCssPreview = useCallback(() => {
    const css = code.css || '';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="demo-container">
    <h1>🎨 CSS Preview</h1>
    <p class="subtitle">Vos styles sont appliqués ci-dessous</p>
    <div class="card">
      <h2>Card Component</h2>
      <p>Un exemple de carte avec vos styles.</p>
      <button class="btn">Bouton</button>
    </div>
    <div class="grid">
      <div class="grid-item">Item 1</div>
      <div class="grid-item">Item 2</div>
      <div class="grid-item">Item 3</div>
    </div>
    <div class="floating" style="margin-top: 20px; font-size: 2rem;">🚀</div>
  </div>
</body>
</html>`;
  }, [code]);

  // Generate preview for JavaScript-only mode
  const generateJsPreview = useCallback(() => {
    const js = code.javascript || '';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Fira Code', 'JetBrains Mono', monospace;
      background: #1a1a2e;
      color: #f7df1e;
      padding: 20px;
      min-height: 100vh;
    }
    #output { white-space: pre-wrap; line-height: 1.6; }
    .log { color: #f5a623; }
    .error { color: #ef4444; }
    .header { color: #f7df1e; margin-bottom: 20px; font-size: 1.2rem; }
  </style>
</head>
<body>
  <div class="header">🟨 JavaScript Console Output</div>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = function(...args) {
      originalLog.apply(console, args);
      const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      output.innerHTML += '<div class="log">> ' + text + '</div>';
      window.parent.postMessage({ type: 'console', data: text }, '*');
    };
    
    console.error = function(...args) {
      originalError.apply(console, args);
      const text = args.map(a => String(a)).join(' ');
      output.innerHTML += '<div class="error">❌ ' + text + '</div>';
      window.parent.postMessage({ type: 'console-error', data: text }, '*');
    };
    
    try {
      ${js}
    } catch(e) {
      console.error('Error:', e.message);
    }
  </script>
</body>
</html>`;
  }, [code]);

  // Generate preview for TypeScript mode (compiled to JS)
  const generateTsPreview = useCallback(() => {
    const ts = code.typescript || '';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/typescript@latest/lib/typescript.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Fira Code', 'JetBrains Mono', monospace;
      background: #1a1a2e;
      color: #3178c6;
      padding: 20px;
      min-height: 100vh;
    }
    #output { white-space: pre-wrap; line-height: 1.6; }
    .log { color: #f5a623; }
    .error { color: #ef4444; }
    .header { color: #3178c6; margin-bottom: 20px; font-size: 1.2rem; }
  </style>
</head>
<body>
  <div class="header">🔷 TypeScript Console Output</div>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = function(...args) {
      originalLog.apply(console, args);
      const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      output.innerHTML += '<div class="log">> ' + text + '</div>';
      window.parent.postMessage({ type: 'console', data: text }, '*');
    };
    
    console.error = function(...args) {
      originalError.apply(console, args);
      const text = args.map(a => String(a)).join(' ');
      output.innerHTML += '<div class="error">❌ ' + text + '</div>';
      window.parent.postMessage({ type: 'console-error', data: text }, '*');
    };
    
    try {
      const tsCode = ${JSON.stringify(ts)};
      const jsCode = ts.transpile(tsCode, { 
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None 
      });
      eval(jsCode);
    } catch(e) {
      console.error('TypeScript Error:', e.message);
    }
  </script>
</body>
</html>`;
  }, [code]);

  // Generate preview based on mode
  const generatePreview = useCallback(() => {
    switch (mode) {
      case 'html': return generateHtmlPreview();
      case 'css': return generateCssPreview();
      case 'javascript': return generateJsPreview();
      case 'typescript': return generateTsPreview();
      case 'python': return generatePythonPreview();
      case 'react': return generateReactPreview();
      default: return generateWebPreview();
    }
  }, [mode, generateWebPreview, generateReactPreview, generatePythonPreview, generateHtmlPreview, generateCssPreview, generateJsPreview, generateTsPreview]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        setConsoleOutput(prev => [...prev.slice(-49), `> ${event.data.data}`]);
      } else if (event.data?.type === 'console-error') {
        setConsoleOutput(prev => [...prev.slice(-49), `❌ ${event.data.data}`]);
      } else if (event.data?.type === 'python-loading') {
        setPythonLoading(true);
      } else if (event.data?.type === 'python-ready') {
        setPythonLoading(false);
        setPythonReady(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-run preview
  useEffect(() => {
    if (autoRun) {
      const timer = setTimeout(() => {
        setLastRun(new Date());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [code, autoRun]);

  // Handle code change
  const handleCodeChange = useCallback((value: string | undefined, tabId: string) => {
    setCode(prev => ({ ...prev, [tabId]: value || '' }));
  }, []);

  // Copy code
  const handleCopy = useCallback(() => {
    const currentCode = code[activeTab];
    navigator.clipboard.writeText(currentCode);
  }, [code, activeTab]);

  // Download code
  const handleDownload = useCallback(() => {
    const blob = new Blob([generatePreview()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lisa-playground.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [generatePreview]);

  // Reset code
  const handleReset = useCallback(() => {
    setCode(getInitialCodeForMode(mode));
    setConsoleOutput([]);
  }, [mode]);

  // Manual run
  const handleRun = useCallback(() => {
    setLastRun(new Date());
    setConsoleOutput([]);
  }, []);

  const currentTab = currentTabs.find((t: EditorTab) => t.id === activeTab) || currentTabs[0];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Code Playground</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Editeur de code en temps reel</p>
        </div>
      </div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        backgroundColor: '#12121a',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #333',
      }}>
        {/* Header Bar - CodePen Style */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#0a0a0f',
          borderBottom: '1px solid #333',
        }}>
          {/* Left - Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f5a623, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Code size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>
                Lisa Playground
              </h1>
              <p style={{ fontSize: '11px', color: '#6a6a82', margin: 0 }}>
                Éditeur de code en temps réel
              </p>
            </div>
          </div>

          {/* Center - Layout Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setLayout('horizontal')}
              style={{
                padding: '8px',
                backgroundColor: layout === 'horizontal' ? '#2d2d44' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: layout === 'horizontal' ? '#fff' : '#6a6a82',
              }}
              title="Vue horizontale"
            >
              <Columns size={16} />
            </button>
            <button
              onClick={() => setLayout('vertical')}
              style={{
                padding: '8px',
                backgroundColor: layout === 'vertical' ? '#2d2d44' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: layout === 'vertical' ? '#fff' : '#6a6a82',
              }}
              title="Vue verticale"
            >
              <Rows size={16} />
            </button>
            <button
              onClick={() => setLayout('preview-only')}
              style={{
                padding: '8px',
                backgroundColor: layout === 'preview-only' ? '#2d2d44' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: layout === 'preview-only' ? '#fff' : '#6a6a82',
              }}
              title="Prévisualisation seule"
            >
              <Square size={16} />
            </button>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#2d2d44', margin: '0 8px' }} />
            <button
              onClick={() => setTheme(t => t === 'vs-dark' ? 'light' : 'vs-dark')}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6a6a82',
              }}
              title="Changer le thème"
            >
              {theme === 'vs-dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          {/* Right - Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setAutoRun(!autoRun)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: autoRun ? '#f5a62320' : '#2d2d44',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: autoRun ? '#f5a623' : '#6a6a82',
                fontSize: '12px',
              }}
            >
              {autoRun ? <CheckCircle size={14} /> : <XCircle size={14} />}
              Auto
            </button>
            <button
              onClick={handleRun}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: 'linear-gradient(90deg, #f5a623, #e6951a)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <Play size={14} />
              Exécuter
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: '8px',
                backgroundColor: '#2d2d44',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6a6a82',
              }}
              title="Copier le code"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: '8px',
                backgroundColor: '#2d2d44',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6a6a82',
              }}
              title="Télécharger"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '8px',
                backgroundColor: '#2d2d44',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6a6a82',
              }}
              title="Réinitialiser"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                padding: '8px',
                backgroundColor: '#2d2d44',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6a6a82',
              }}
              title="Plein écran"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          display: 'flex',
          flex: 1,
          flexDirection: layout === 'vertical' ? 'column' : 'row',
          overflow: 'hidden',
        }}>
          {/* Editor Panel */}
          {layout !== 'preview-only' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              borderRight: layout === 'horizontal' ? '1px solid #333' : 'none',
              borderBottom: layout === 'vertical' ? '1px solid #333' : 'none',
              minWidth: 0,
            }}>
              {/* Mode Selector + Editor Tabs */}
              <div style={{
                display: 'flex',
                backgroundColor: '#0a0a0f',
                borderBottom: '1px solid #333',
              }}>
                {/* Mode Selector - All Languages */}
                <div style={{ 
                  display: 'flex', 
                  borderRight: '1px solid #333', 
                  padding: '0 4px',
                  overflowX: 'auto',
                  gap: '2px'
                }}>
                  {PLAYGROUND_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleModeChange(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '10px 10px',
                        backgroundColor: mode === m.id ? `${m.color}20` : 'transparent',
                        border: 'none',
                        borderBottom: mode === m.id ? `2px solid ${m.color}` : '2px solid transparent',
                        cursor: 'pointer',
                        color: mode === m.id ? m.color : '#6a6a82',
                        fontSize: '11px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                      }}
                      title={m.description}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
                </div>
                
                {/* File Tabs */}
                {currentTabs.map((tab: EditorTab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      backgroundColor: activeTab === tab.id ? '#12121a' : 'transparent',
                      border: 'none',
                      borderBottom: activeTab === tab.id ? '2px solid #f5a623' : '2px solid transparent',
                      cursor: 'pointer',
                      color: activeTab === tab.id ? '#fff' : '#6a6a82',
                      fontSize: '13px',
                      fontWeight: activeTab === tab.id ? 500 : 400,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
                
                {/* Python status indicator */}
                {mode === 'python' && (
                  <div style={{
                    marginLeft: 'auto',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: pythonReady ? '#f5a623' : pythonLoading ? '#f59e0b' : '#6a6a82',
                  }}>
                    {pythonLoading ? '⏳ Chargement...' : pythonReady ? '✅ Prêt' : '🐍 Python'}
                  </div>
                )}
              </div>

              {/* Monaco Editor */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Editor
                  height="100%"
                  language={currentTab.language}
                  value={code[activeTab]}
                  theme={theme}
                  options={EDITOR_OPTIONS}
                  onChange={(value) => handleCodeChange(value, activeTab)}
                />
              </div>
            </div>
          )}

          {/* Preview Panel */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            minWidth: 0,
          }}>
            {/* Preview Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              borderBottom: '1px solid #ddd',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={14} color="#666" />
                <span style={{ fontSize: '12px', color: '#6a6a82', fontWeight: 500 }}>
                  Prévisualisation
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {lastRun && (
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    Mis à jour: {lastRun.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={handleRun}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#e0e0e0',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {/* Iframe Preview */}
            <div style={{ flex: 1, position: 'relative' }}>
              <iframe
                ref={iframeRef}
                key={lastRun?.getTime()}
                srcDoc={generatePreview()}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#fff',
                }}
                title="Preview"
                sandbox="allow-scripts allow-modals"
              />
            </div>

            {/* Console Panel */}
            {showConsole && (
              <div style={{
                height: '150px',
                backgroundColor: '#12121a',
                borderTop: '1px solid #333',
                overflow: 'auto',
                padding: '8px 12px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontSize: '12px', color: '#6a6a82', fontWeight: 500 }}>
                    Console
                  </span>
                  <button
                    onClick={() => setConsoleOutput([])}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#2d2d44',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#6a6a82',
                      fontSize: '11px',
                    }}
                  >
                    Effacer
                  </button>
                </div>
                {consoleOutput.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: line.startsWith('❌') ? '#ef4444' : '#f5a623',
                      padding: '2px 0',
                    }}
                  >
                    {line}
                  </div>
                ))}
                {consoleOutput.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#6a6a82' }}>
                    Les logs console s'afficheront ici...
                  </div>
                )}
              </div>
            )}

            {/* Console Toggle */}
            <button
              onClick={() => setShowConsole(!showConsole)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderTop: '1px solid #ddd',
                cursor: 'pointer',
                color: '#6a6a82',
                fontSize: '12px',
              }}
            >
              <Terminal size={14} />
              Console
              {consoleOutput.length > 0 && (
                <span style={{
                  backgroundColor: '#f5a623',
                  color: '#fff',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                }}>
                  {consoleOutput.length}
                </span>
              )}
              <ChevronDown
                size={14}
                style={{
                  transform: showConsole ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
