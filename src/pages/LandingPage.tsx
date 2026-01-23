/**
 * Landing Page - Page d'accueil marketing de Lisa
 * 
 * Promesse centrale: "Construisez des applications vivantes, avec de l'IA qui agit."
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Code2, 
  Brain, 
  Zap, 
  Eye, 
  Mic, 
  Blocks,
  ArrowRight,
  Play,
  CheckCircle2,
  Github,
  Terminal,
  Cpu,
  Globe,
  Smartphone,
  ChevronDown
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

interface PackageCardProps {
  name: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
}

interface DemoStep {
  type: 'user' | 'assistant' | 'code' | 'result';
  content: string;
  language?: string;
}

// ============================================================================
// Components
// ============================================================================

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color }) => (
  <div className="group relative p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:transform hover:scale-[1.02]">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
  </div>
);

const PackageCard: React.FC<PackageCardProps> = ({ name, description, features, icon, color }) => (
  <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-slate-500 transition-all duration-300">
    <div className="flex items-start gap-4 mb-4">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-mono font-semibold text-white">{name}</h3>
        <p className="text-slate-400 text-sm mt-1">{description}</p>
      </div>
    </div>
    <ul className="space-y-2">
      {features.map((feature, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
          <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
          {feature}
        </li>
      ))}
    </ul>
  </div>
);

const TypewriterText: React.FC<{ texts: string[]; className?: string }> = ({ texts, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[currentIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? 30 : 80);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentIndex, texts]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
};

const LiveDemo: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  
  const demoSteps: DemoStep[] = [
    { type: 'user', content: 'Analyse cette image et donne-moi la météo de Paris' },
    { type: 'assistant', content: "Je vais analyser l'image et récupérer la météo..." },
    { type: 'code', content: `import requests
from datetime import datetime

# Appel API météo
response = requests.get(
    "https://api.weather.com/paris"
)
data = response.json()
print(f"🌡️ Paris: {data['temp']}°C")
print(f"☁️ {data['condition']}")`, language: 'python' },
    { type: 'result', content: '🌡️ Paris: 12°C\n☁️ Partiellement nuageux' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % demoSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [demoSteps.length]);

  return (
    <div className="relative rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-sm text-slate-400 ml-2">Lisa AI - Live Demo</span>
      </div>
      <div className="p-4 space-y-3 min-h-[280px]">
        {demoSteps.slice(0, activeStep + 1).map((step, i) => (
          <div
            key={i}
            className={`animate-fadeIn ${
              step.type === 'user' ? 'flex justify-end' : ''
            }`}
          >
            {step.type === 'user' && (
              <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%]">
                {step.content}
              </div>
            )}
            {step.type === 'assistant' && (
              <div className="bg-slate-700 text-white px-4 py-2 rounded-2xl rounded-bl-md max-w-[80%]">
                {step.content}
              </div>
            )}
            {step.type === 'code' && (
              <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-700">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border-b border-slate-700">
                  <Terminal size={12} className="text-emerald-400" />
                  <span className="text-xs text-slate-400">Python</span>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400">Running</span>
                  </div>
                </div>
                <pre className="p-3 text-sm text-slate-300 overflow-x-auto">
                  <code>{step.content}</code>
                </pre>
              </div>
            )}
            {step.type === 'result' && (
              <div className="bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 px-4 py-2 rounded-lg font-mono text-sm whitespace-pre-line">
                {step.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Code2 size={24} className="text-white" />,
      title: 'Code Exécutable',
      description: 'Exécutez Python et JavaScript directement dans le navigateur. Pas de serveur requis.',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
    },
    {
      icon: <Brain size={24} className="text-white" />,
      title: 'Agents Intelligents',
      description: 'Météo, calendrier, recherche web, domotique... Des agents prêts à agir pour vous.',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    },
    {
      icon: <Eye size={24} className="text-white" />,
      title: 'Vision par IA',
      description: "Analysez images et vidéos en temps réel avec MediaPipe et Gemini Vision.",
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    },
    {
      icon: <Mic size={24} className="text-white" />,
      title: 'Audio Intelligent',
      description: 'Transcription vocale, synthèse text-to-speech, et commandes vocales.',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
    },
    {
      icon: <Blocks size={24} className="text-white" />,
      title: 'Multi-Modèles',
      description: 'LM Studio, Gemini, OpenAI, Ollama... Utilisez le LLM de votre choix.',
      color: 'bg-gradient-to-br from-pink-500 to-pink-600',
    },
    {
      icon: <Globe size={24} className="text-white" />,
      title: 'Web & Mobile',
      description: 'Déployez sur le web ou en app native iOS/Android avec Capacitor.',
      color: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    },
  ];

  const packages = [
    {
      name: '@lisa/code-executor',
      description: 'Moteur d\'exécution de code dans le navigateur',
      features: ['Python via Pyodide', 'JavaScript sandboxé', 'Support des packages', 'Outputs riches'],
      icon: <Terminal size={20} className="text-white" />,
      color: 'bg-blue-600',
    },
    {
      name: '@lisa/markdown-renderer',
      description: 'Rendu Markdown intelligent avec extensions',
      features: ['LaTeX / KaTeX', 'Syntax highlighting', 'Mermaid diagrams', 'Code exécutable'],
      icon: <Code2 size={20} className="text-white" />,
      color: 'bg-purple-600',
    },
    {
      name: '@lisa/vision-engine',
      description: 'Analyse visuelle par IA',
      features: ['Détection d\'objets', 'Reconnaissance faciale', 'Segmentation', 'OCR intégré'],
      icon: <Eye size={20} className="text-white" />,
      color: 'bg-emerald-600',
    },
    {
      name: '@lisa/audio-engine',
      description: 'Traitement audio intelligent',
      features: ['Speech-to-Text', 'Text-to-Speech', 'Détection de mots-clés', 'Multi-langues'],
      icon: <Mic size={20} className="text-white" />,
      color: 'bg-orange-600',
    },
  ];

  const scrollToDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 mb-8">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-sm text-slate-300">Nouvelle génération d'applications IA</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Construisez des applications
            </span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              vivantes
            </span>
          </h1>

          {/* Subtitle with typewriter */}
          <p className="text-xl md:text-2xl text-slate-400 mb-4">
            avec de l'IA qui{' '}
            <TypewriterText 
              texts={['agit', 'code', 'voit', 'écoute', 'comprend']} 
              className="text-emerald-400 font-semibold"
            />
          </p>

          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10">
            Lisa combine chat intelligent, exécution de code, agents spécialisés et perception multimodale 
            dans une plateforme unifiée.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/chat')}
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 hover:scale-105"
            >
              Commencer gratuitement
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={scrollToDemo}
              className="flex items-center gap-2 px-8 py-4 bg-slate-800 border border-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-700 transition-all duration-300"
            >
              <Play size={20} />
              Voir la démo
            </button>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <ChevronDown size={32} className="text-slate-600 mx-auto" />
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Une démo vaut mille mots
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Chat, code exécutable, agents intelligents — tout en une seule interface.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <LiveDemo />
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Posez votre question</h3>
                  <p className="text-slate-400">En langage naturel, avec images, fichiers ou voix.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Lisa génère et exécute</h3>
                  <p className="text-slate-400">Code Python, appels API, agents spécialisés — automatiquement.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <span className="font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Résultats en temps réel</h3>
                  <p className="text-slate-400">Graphiques, données, fichiers — tout s'affiche instantanément.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Une plateforme complète pour créer des applications IA de nouvelle génération.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 mb-4">
              <Cpu size={16} className="text-emerald-400" />
              <span className="text-sm text-slate-300">Architecture modulaire</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Des briques réutilisables
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Chaque composant est un package NPM indépendant. Utilisez-les dans vos propres projets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {packages.map((pkg, i) => (
              <PackageCard key={i} {...pkg} />
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="https://github.com/lisa-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors"
            >
              <Github size={20} />
              Voir sur GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Platforms Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Déployez partout
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Web, desktop, mobile — une seule base de code.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <Globe size={24} className="text-blue-400" />
              <span className="font-semibold">Web App</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <Smartphone size={24} className="text-emerald-400" />
              <span className="font-semibold">iOS & Android</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <Cpu size={24} className="text-purple-400" />
              <span className="font-semibold">Desktop</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-r from-emerald-600 to-blue-600 p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIgMC00IDItNCAyczIgMiA0IDJjMiAwIDQtMiA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Prêt à construire le futur ?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                Rejoignez les développeurs qui créent des applications IA de nouvelle génération avec Lisa.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-colors"
                >
                  <Zap size={20} />
                  Démarrer maintenant
                </button>
                <button
                  onClick={() => navigate('/docs')}
                  className="flex items-center gap-2 px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors"
                >
                  Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold">Lisa</span>
          </div>
          
          <p className="text-slate-500 text-sm">
            © 2025 Lisa AI. Construit avec ❤️ pour les développeurs.
          </p>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com/lisa-ai" className="text-slate-400 hover:text-white transition-colors">
              <Github size={20} />
            </a>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
