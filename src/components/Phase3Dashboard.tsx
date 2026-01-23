/**
 * 📊 Phase 3 Dashboard - Dashboard d'Autonomie
 * Affiche les workflows, intégrations et supervision
 */

import { useState, useEffect } from 'react';
import { workflowService, type WorkflowDefinition } from '../services/WorkflowService';
import { integrationService, type IntegrationStatus } from '../services/IntegrationService';
import { Activity, Zap, Link as LinkIcon, BarChart3 } from 'lucide-react';

export function Phase3Dashboard() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [stats, setStats] = useState(workflowService.getStats());
  const [integrationStats, setIntegrationStats] = useState(integrationService.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setWorkflows(workflowService.listWorkflows());
      setStats(workflowService.getStats());
      setIntegrationStats(integrationService.getStats());

      // Mettre à jour les statuts des intégrations
      const statuses = integrationService.listIntegrations()
        .map(config => integrationService.getStatus(config.name))
        .filter((s): s is IntegrationStatus => s !== undefined);
      setIntegrations(statuses);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Titre */}
      <div className="flex items-center gap-3">
        <Activity className="w-8 h-8 text-green-500" />
        <h1 className="text-3xl font-bold">Phase 3 - Autonomie</h1>
      </div>

      {/* Statistiques Workflows */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Workflows</p>
          <p className="text-3xl font-bold">{stats.totalWorkflows}</p>
          <p className="text-xs opacity-75">Taux succès: {stats.successRate}%</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Exécutions</p>
          <p className="text-3xl font-bold">{stats.totalExecutions}</p>
          <p className="text-xs opacity-75">Succès: {stats.successful}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Intégrations</p>
          <p className="text-3xl font-bold">{integrationStats.totalIntegrations}</p>
          <p className="text-xs opacity-75">Connectées: {integrationStats.connected}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Durée Moy.</p>
          <p className="text-3xl font-bold">{stats.averageDuration}ms</p>
          <p className="text-xs opacity-75">Erreurs: {stats.totalExecutions - stats.successful}</p>
        </div>
      </div>

      {/* Workflows */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Workflows ({workflows.length})
        </h2>

        {workflows.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun workflow créé</p>
        ) : (
          <div className="space-y-3">
            {workflows.map(wf => (
              <div key={wf.id} className="p-4 border rounded-lg dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{wf.name}</p>
                    <p className="text-xs text-gray-500">{wf.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    wf.parallel
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                      : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  }`}>
                    {wf.parallel ? 'Parallèle' : 'Séquentiel'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{wf.steps.length} étapes</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intégrations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <LinkIcon className="w-5 h-5" />
          Intégrations ({integrations.length})
        </h2>

        {integrations.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune intégration configurée</p>
        ) : (
          <div className="space-y-3">
            {integrations.map(integration => (
              <div key={integration.name} className="p-4 border rounded-lg dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{integration.name}</p>
                    <p className="text-xs text-gray-500">{integration.type}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    integration.connected
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {integration.connected ? 'Connectée' : 'Déconnectée'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-gray-500">Messages</p>
                    <p className="font-semibold">{integration.messageCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Erreurs</p>
                    <p className="font-semibold">{integration.errorCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Uptime</p>
                    <p className="font-semibold">{(integration.uptime / 1000).toFixed(1)}s</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détails */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Détails
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">Workflows</p>
            <p className="text-xs opacity-75">Total: {stats.totalWorkflows}</p>
            <p className="text-xs opacity-75">Exécutions: {stats.totalExecutions}</p>
            <p className="text-xs opacity-75">Succès: {stats.successful}</p>
            <p className="text-xs opacity-75">Échecs: {stats.totalExecutions - stats.successful}</p>
          </div>

          <div>
            <p className="font-semibold">Intégrations</p>
            <p className="text-xs opacity-75">Total: {integrationStats.totalIntegrations}</p>
            <p className="text-xs opacity-75">Connectées: {integrationStats.connected}</p>
            <p className="text-xs opacity-75">Messages: {integrationStats.totalMessages}</p>
            <p className="text-xs opacity-75">Erreurs: {integrationStats.totalErrors}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
