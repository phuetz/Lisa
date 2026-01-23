/**
 * HomeBeautiful.tsx
 * 
 * Page d'accueil spectaculaire avec hero animé et présentation de Lisa
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ArrowRight, Brain, Eye, Ear, MessageSquare,
  Workflow, Shield, Zap, Star, Play, ChevronRight
} from 'lucide-react';
import { MeshGradientBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard } from '../components/ui/GlowingCard';

const features = [
  {
    icon: Brain,
    title: '55 Agents Intelligents',
    description: 'Des agents spécialisés pour chaque tâche, de la vision à l\'analyse.',
    color: 'purple',
    link: '/agents-beautiful',
  },
  {
    icon: Eye,
    title: 'Vision Avancée',
    description: 'Détection d\'objets, reconnaissance faciale et analyse de scènes.',
    color: 'blue',
    link: '/vision-beautiful',
  },
  {
    icon: Ear,
    title: 'Audio Intelligent',
    description: 'Classification audio et reconnaissance vocale en temps réel.',
    color: 'cyan',
    link: '/audio-beautiful',
  },
  {
    icon: Workflow,
    title: 'Workflows Automatisés',
    description: 'Créez des automatisations puissantes sans code.',
    color: 'emerald',
    link: '/workflows-beautiful',
  },
];

const stats = [
  { value: '55+', label: 'Agents' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Disponibilité' },
  { value: '<50ms', label: 'Latence' },
];

export default function HomeBeautiful() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsLoaded(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MeshGradientBackground />

      {/* Floating orbs that follow mouse */}
      <div
        className="fixed w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none transition-all duration-1000"
        style={{
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              <span>Nouvelle version 2.0 disponible</span>
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
              <span className="block">Rencontrez</span>
              <span className="animate-gradient-text">Lisa</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Votre assistant IA de nouvelle génération. Intelligent, proactif et 
              toujours là pour vous aider à accomplir l'impossible.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/chat"
                className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-semibold text-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
              >
                <MessageSquare className="w-5 h-5" />
                Commencer à discuter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/dashboard-beautiful"
                className="flex items-center gap-3 px-8 py-4 bg-slate-800/50 border border-slate-700/50 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 hover:border-slate-600 transition-all"
              >
                <Play className="w-5 h-5" />
                Voir le Dashboard
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`text-center transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${(i + 1) * 100}ms` }}
                >
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-slate-600 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-slate-500 rounded-full animate-pulse" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Lisa combine intelligence artificielle avancée et interface intuitive 
                pour vous offrir une expérience unique.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <Link key={feature.title} to={feature.link}>
                  <GlowingCard
                    glowColor={feature.color as 'blue' | 'purple' | 'cyan' | 'emerald'}
                    hover3D
                    className="h-full group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-${feature.color}-500/10 text-${feature.color}-400 group-hover:scale-110 transition-transform`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-slate-400">{feature.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </GlowingCard>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20 px-6 border-t border-slate-800/50">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Shield className="w-6 h-6 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Sécurisé & Privé</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Vos données restent les vôtres
            </h2>
            <p className="text-lg text-slate-400 mb-8">
              Tout est traité localement. Aucune donnée n'est envoyée à des serveurs externes.
              Vous gardez le contrôle total de vos informations.
            </p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400" />
              ))}
              <span className="ml-2 text-slate-400">5.0 - Confiance utilisateurs</span>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <GlowingCard glowColor="purple" className="text-center py-12">
              <Zap className="w-12 h-12 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Prêt à commencer ?
              </h2>
              <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                Découvrez tout le potentiel de Lisa et transformez votre façon de travailler.
              </p>
              <Link
                to="/dashboard-beautiful"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-semibold text-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-2xl shadow-purple-500/30"
              >
                Explorer le Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </GlowingCard>
          </div>
        </section>
      </div>
    </div>
  );
}
