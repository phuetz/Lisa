import { agentRegistry } from '../core/registry';
import { AgentDomains } from '../core/types';
import type { AgentParameter, BaseAgent } from '../core/types';
import { createLogger } from '../../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface pour les résultats d'exécution PowerShell
 */
interface PowerShellResult {
  id: string;
  command: string;
  output: string;
  error: string | null;
  exitCode: number;
  startTime: number;
  endTime: number;
  executionTime: number;
  success: boolean;
}

/**
 * Interface pour les options d'exécution PowerShell
 */
interface PowerShellOptions {
  timeout?: number;
  maxOutputLength?: number;
  workingDirectory?: string;
  hidden?: boolean;
  allowedCommands?: string[];
}

/**
 * PowerShellAgent - Agent pour exécuter des commandes PowerShell de façon sécurisée
 * 
 * Cet agent permet de:
 * - Exécuter des commandes PowerShell avec vérification de sécurité
 * - Obtenir des informations système via PowerShell
 * - Gérer un historique des commandes exécutées
 * - Limiter les commandes aux seules autorisées
 */
export class PowerShellAgent implements BaseAgent {
  name = 'PowerShellAgent';
  description = 'Agent pour exécuter des commandes PowerShell de façon sécurisée';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = ['command-execution', 'system-info', 'file-operations', 'network-operations'];

  // Liste blanche des commandes autorisées (pour la sécurité)
  private allowedCommandPrefixes: string[] = [
    'Get-', // Commandes de lecture (Get-Process, Get-Service, etc.)
    'Select-', // Filtrage (Select-Object)
    'Sort-', // Tri (Sort-Object)
    'Where-', // Filtrage (Where-Object)
    'Format-', // Formatage (Format-Table, Format-List)
    'Measure-', // Mesure (Measure-Object)
    'Group-', // Groupement (Group-Object)
    'ConvertTo-', // Conversion (ConvertTo-Json, ConvertTo-Csv)
    'Export-', // Export (Export-Csv)
    'Test-', // Test (Test-Connection, Test-Path)
    'Invoke-RestMethod', // Appels API REST
    'Invoke-WebRequest', // Requêtes web
    'ping', // Ping
    'ipconfig', // Configuration réseau
    'systeminfo', // Informations système
    'dir', // Liste de répertoire
    'ls', // Alias pour Get-ChildItem
    'hostname', // Nom d'hôte
    'echo', // Affichage
    'whoami', // Utilisateur actuel
    'netstat', // Statistiques réseau
  ];

  // Commandes explicitement interdites pour des raisons de sécurité
  private blockedCommands: string[] = [
    'Remove-', // Suppression (Remove-Item, etc.)
    'Delete', // Suppression
    'Set-', // Modification (Set-Content, etc.)
    'New-', // Création (New-Item, etc.)
    'Start-Process', // Lancement de processus
    'Start-Job', // Lancement de job
    'Invoke-Expression', // Exécution dynamique (danger)
    'Invoke-Command', // Exécution à distance
    'iex', // Alias pour Invoke-Expression
    'IEX', // Variation
    '&', // Appel d'opérateur
    'del', // Suppression
    'rmdir', // Suppression de répertoire
    'rm', // Suppression
    'wget', // Téléchargement
    'curl', // Téléchargement (si pas utilisé pour de la consultation)
    'Compress-', // Compression
    'Expand-', // Décompression
    'shutdown', // Arrêt du système
    'restart', // Redémarrage du système
    'Stop-', // Arrêt (Stop-Process, etc.)
    'kill', // Arrêt de processus
    'taskkill', // Arrêt de tâche
    'format', // Formatage
    'reg', // Registre Windows
    'runas', // Exécution en tant que
    'attrib', // Attributs de fichier
    'move', // Déplacement de fichier
  ];

  private commandHistory: PowerShellResult[] = [];
  private defaultOptions: PowerShellOptions = {
    timeout: 10000, // 10 secondes par défaut
    maxOutputLength: 5000, // Limite la taille de sortie
    workingDirectory: undefined, // Répertoire courant du processus
    hidden: false, // Affiche la console PowerShell
    allowedCommands: [] // Pas de restriction supplémentaire
  };

  private logger = createLogger('PowerShellAgent');

  /**
   * Vérifie si l'agent peut traiter la requête
   * @param query Requête utilisateur
   * @returns Score de confiance entre 0 et 1
   */
  async canHandle(query: string): Promise<number> {
    const powershellKeywords = [
      'powershell', 'commande', 'cmd', 'terminal', 'console', 'exécuter',
      'lancer', 'run', 'execute', 'shell', 'ps', 'pwsh', 'system', 'admin'
    ];

    return this.calculateKeywordMatch(query, powershellKeywords);
  }

  /**
   * Exécute une action PowerShell
   * @param params Paramètres de l'action
   * @returns Résultat de l'action
   */
  async execute(params: any): Promise<any> {
    const { action, ...actionParams } = params;

    try {
      switch (action) {
        case 'executeCommand':
          return await this.executeCommand(actionParams.command, actionParams.options);
        case 'getSystemInfo':
          return await this.getSystemInfo();
        case 'getCommandHistory':
          return this.getCommandHistory(actionParams.limit);
        case 'getLastResult':
          return this.getLastResult();
        default:
          throw new Error(`Action inconnue: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'exécution de l'action PowerShell ${action}:`, error as any);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Retourne les paramètres requis pour une tâche donnée
   * @param task Description de la tâche
   * @returns Liste des paramètres requis
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    const isCommandExecution = task.includes('exécuter') || task.includes('lancer') ||
      task.includes('run') || task.includes('execute') ||
      task.includes('powershell') || task.includes('commande');

    if (isCommandExecution) {
      return [
        { name: 'action', type: 'string', required: true, description: 'Type d\'action PowerShell (executeCommand)' },
        { name: 'command', type: 'string', description: 'Commande PowerShell à exécuter', required: true },
        { name: 'options', type: 'object', description: 'Options d\'exécution', required: false }
      ];
    }

    if (task.includes('système') || task.includes('system') || task.includes('info')) {
      return [
        { name: 'action', type: 'string', required: true, description: 'Type d\'action PowerShell (getSystemInfo)' }
      ];
    }

    return [
      { name: 'action', type: 'string', description: 'Action PowerShell à exécuter', required: true }
    ];
  }

  /**
   * Exécute une commande PowerShell
   * @param command Commande à exécuter
   * @param options Options d'exécution
   * @returns Résultat de l'exécution
   */
  private async executeCommand(command: string, options: PowerShellOptions = {}): Promise<PowerShellResult> {
    const startTime = Date.now();
    const executionId = uuidv4();

    // Vérification de sécurité
    this.validateCommand(command, options);

    // Fusion des options par défaut et fournies
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      // Dans un environnement web, nous ne pouvons pas exécuter directement PowerShell
      // Conformément à BACKEND_REQUIRED.md, cet agent nécessite un backend sécurisé.

      const backendAvailable = false; // TODO: Check for backend connection

      if (!backendAvailable) {
        return {
          id: executionId,
          command,
          output: '',
          error: 'This agent requires backend deployment for security reasons. See BACKEND_REQUIRED.md',
          exitCode: -1,
          startTime,
          endTime: Date.now(),
          executionTime: Date.now() - startTime,
          success: false
        };
      }

      // Code inaccessible tant que le backend n'est pas connecté
      // const result = await this.simulateCommandExecution(command, mergedOptions);

      // return { ... };
      throw new Error('Backend integration not implemented');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur lors de l'exécution de la commande PowerShell: ${command}`, error as any);

      // Enregistrer l'erreur dans l'historique
      const commandResult: PowerShellResult = {
        id: executionId,
        command,
        output: '',
        error: errorMessage,
        exitCode: -1,
        startTime,
        endTime: Date.now(),
        executionTime: Date.now() - startTime,
        success: false
      };

      this.commandHistory.push(commandResult);

      return commandResult;
    }
  }

  /**
   * Simule l'exécution d'une commande PowerShell
   * Dans un vrai environnement, nous utiliserions une API backend ou Node.js
   * @param command Commande à exécuter
   * @param options Options d'exécution
   * @returns Résultat simulé
   */
  private async simulateCommandExecution(command: string, _options: PowerShellOptions): Promise<{ output: string; error: string | null; exitCode: number }> {
    // Cette méthode simule l'exécution de commandes PowerShell
    // Dans une implémentation réelle, elle appellerait un backend ou un service

    this.logger.info(`Simulation d'exécution de commande PowerShell: ${command}`);

    // Créer un délai simulé basé sur la complexité de la commande
    const delay = Math.min(Math.max(command.length * 10, 200), 1000);

    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulation de réponses pour certaines commandes
        if (command.toLowerCase().includes('get-process')) {
          resolve({
            output: `
Handle  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
------  ------    -----      -----     ------     --  -- -----------
    564      28     4520      13456       0.58   3856   1 chrome
    892      51    18952      52640       2.31   7920   1 msedge
    452      19     3700       9120       0.14   2120   1 explorer
    188      14     1820       5640       0.06   1024   1 powershell
            `,
            error: null,
            exitCode: 0
          });
        } else if (command.toLowerCase().includes('get-service')) {
          resolve({
            output: `
Status   Name               DisplayName
------   ----               -----------
Running  AudioEndpointBu... Windows Audio Endpoint Builder
Running  Audiosrv           Windows Audio
Running  BFE                Base Filtering Engine
Stopped  BITS               Background Intelligent Transfer Ser...
Running  BrokerInfrastru... Background Tasks Infrastructure Ser...
            `,
            error: null,
            exitCode: 0
          });
        } else if (command.toLowerCase().includes('systeminfo')) {
          resolve({
            output: `
Host Name:                 DESKTOP-ABC123
OS Name:                   Microsoft Windows 10 Pro
OS Version:                10.0.19044 N/A Build 19044
OS Manufacturer:           Microsoft Corporation
OS Configuration:          Standalone Workstation
OS Build Type:             Multiprocessor Free
System Manufacturer:       Dell Inc.
System Model:              XPS 15 9500
System Type:               x64-based PC
Processor(s):              1 Processor(s) Installed, Intel64 Family 6 Model 165 Stepping 2
BIOS Version:              Dell Inc. 1.5.0, 10/12/2020
Windows Directory:         C:\\Windows
System Directory:          C:\\Windows\\system32
Boot Device:               \\Device\\HarddiskVolume1
Total Physical Memory:     16,384 MB
Available Physical Memory: 8,214 MB
Virtual Memory: Max Size:  32,768 MB
Virtual Memory: Available: 20,125 MB
            `,
            error: null,
            exitCode: 0
          });
        } else if (command.toLowerCase().includes('get-childitem') || command.toLowerCase() === 'dir' || command.toLowerCase() === 'ls') {
          resolve({
            output: `
    Directory: C:\\Users\\patri\\Documents

Mode                LastWriteTime         Length Name
----                -------------         ------ ----
d-----        7/10/2025   9:30 AM                Projects
d-----        7/10/2025  10:15 AM                Reports
-a----        7/10/2025   8:45 AM          12588 budget.xlsx
-a----        7/10/2025   9:10 AM          45621 presentation.pptx
-a----        7/10/2025  10:05 AM           8954 report.docx
            `,
            error: null,
            exitCode: 0
          });
        } else if (command.toLowerCase().includes('ping')) {
          resolve({
            output: `
Envoi d'une requête 'ping' sur google.com [142.250.179.78] avec 32 octets de données :
Réponse de 142.250.179.78 : octets=32 temps=14 ms TTL=128
Réponse de 142.250.179.78 : octets=32 temps=15 ms TTL=128
Réponse de 142.250.179.78 : octets=32 temps=12 ms TTL=128
Réponse de 142.250.179.78 : octets=32 temps=13 ms TTL=128

Statistiques Ping pour 142.250.179.78:
    Paquets : envoyés = 4, reçus = 4, perdus = 0 (perte 0%),
Durée approximative des boucles en millisecondes :
    Minimum = 12ms, Maximum = 15ms, Moyenne = 13ms
            `,
            error: null,
            exitCode: 0
          });
        } else {
          // Commande non reconnue, simulation d'une sortie générique
          resolve({
            output: `Exécution simulée de: ${command}`,
            error: null,
            exitCode: 0
          });
        }
      }, delay);
    });
  }

  /**
   * Obtient des informations système via PowerShell
   * @returns Informations système
   */
  private async getSystemInfo(): Promise<any> {
    // Cette méthode combine plusieurs commandes PowerShell pour obtenir des informations système complètes
    const systemInfoResult = await this.executeCommand('systeminfo');
    const processesResult = await this.executeCommand('Get-Process | Sort-Object -Property CPU -Descending | Select-Object -First 5');
    const servicesResult = await this.executeCommand('Get-Service | Where-Object {$_.Status -eq "Running"} | Select-Object -First 5');

    return {
      systemInfo: systemInfoResult,
      topProcesses: processesResult,
      runningServices: servicesResult,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtient l'historique des commandes exécutées
   * @param limit Limite le nombre de résultats (optionnel)
   * @returns Historique des commandes
   */
  private getCommandHistory(limit?: number): any {
    let history = [...this.commandHistory];

    if (limit && limit > 0) {
      history = history.slice(-limit);
    }

    return {
      count: history.length,
      commands: history
    };
  }

  /**
   * Obtient le résultat de la dernière commande exécutée
   * @returns Dernier résultat
   */
  private getLastResult(): PowerShellResult | null {
    if (this.commandHistory.length === 0) {
      return null;
    }

    return this.commandHistory[this.commandHistory.length - 1];
  }

  /**
   * Valide si une commande est autorisée à être exécutée
   * @param command Commande à valider
   * @param options Options d'exécution
   * @throws Error si la commande est interdite
   */
  private validateCommand(command: string, options: PowerShellOptions): void {
    const normalizedCommand = command.trim().toLowerCase();

    // Vérifier d'abord les commandes bloquées
    for (const blockedCmd of this.blockedCommands) {
      if (normalizedCommand.includes(blockedCmd.toLowerCase())) {
        throw new Error(`Commande non autorisée: ${command} (contient ${blockedCmd})`);
      }
    }

    // Si des commandes spécifiques sont autorisées dans les options, vérifier uniquement celles-là
    if (options.allowedCommands && options.allowedCommands.length > 0) {
      const isExplicitlyAllowed = options.allowedCommands.some(allowed =>
        normalizedCommand.startsWith(allowed.toLowerCase())
      );

      if (!isExplicitlyAllowed) {
        throw new Error(`Commande non autorisée: ${command}`);
      }

      return; // La commande est explicitement autorisée
    }

    // Sinon, vérifier les préfixes autorisés par défaut
    const isAllowed = this.allowedCommandPrefixes.some(prefix =>
      normalizedCommand.startsWith(prefix.toLowerCase())
    );

    if (!isAllowed) {
      throw new Error(`Commande non autorisée: ${command}`);
    }
  }

  /**
   * Calcule le score de correspondance entre une requête et des mots-clés
   * @param query Requête utilisateur
   * @param keywords Liste de mots-clés
   * @returns Score de correspondance (0-1)
   */
  private calculateKeywordMatch(query: string, keywords: string[]): number {
    const words = query.toLowerCase().split(' ');
    const matches = keywords.filter(kw => words.some(w => w.includes(kw.toLowerCase())));
    return Math.min(matches.length / 2, 1); // Score normalisé entre 0 et 1
  }
}

// Enregistrer l'agent dans le registre global
const powershellAgent = new PowerShellAgent();
agentRegistry.register(powershellAgent);

export default powershellAgent;
