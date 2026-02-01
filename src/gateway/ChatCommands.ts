/**
 * Lisa Chat Commands
 * Slash commands inspired by OpenClaw's /status, /new, /model, etc.
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';
import { getGateway } from './GatewayServer';
import { getSkillsManager } from './SkillsManager';
import { getCronManager } from './CronManager';
import { getWebhookManager } from './WebhookManager';

export interface ChatCommand {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandContext {
  sessionId: string;
  userId: string;
  channelType: string;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
  ephemeral?: boolean; // Only visible to the user
}

export class ChatCommandManager extends BrowserEventEmitter {
  private commands: Map<string, ChatCommand> = new Map();
  private aliases: Map<string, string> = new Map(); // alias -> command name

  constructor() {
    super();
    this.registerBuiltinCommands();
  }

  private registerBuiltinCommands(): void {
    // /help - List all commands
    this.register({
      name: 'help',
      aliases: ['h', '?'],
      description: 'Affiche la liste des commandes disponibles',
      usage: '/help [commande]',
      examples: ['/help', '/help status'],
      handler: async (args) => {
        if (args.length > 0) {
          const cmd = this.getCommand(args[0]);
          if (cmd) {
            return {
              success: true,
              message: `**/${cmd.name}**\n${cmd.description}\n\nUsage: \`${cmd.usage}\`\n\nExemples:\n${cmd.examples.map(e => `• \`${e}\``).join('\n')}`
            };
          }
          return { success: false, message: `Commande inconnue: ${args[0]}` };
        }

        const cmds = Array.from(this.commands.values());
        const helpText = cmds.map(c => `• **/${c.name}** - ${c.description}`).join('\n');
        return {
          success: true,
          message: `📚 **Commandes disponibles**\n\n${helpText}\n\nUtilisez \`/help <commande>\` pour plus de détails.`
        };
      }
    });

    // /status - Show session status
    this.register({
      name: 'status',
      aliases: ['s', 'info'],
      description: 'Affiche le statut de la session courante',
      usage: '/status',
      examples: ['/status'],
      handler: async (_args, context) => {
        const gateway = getGateway();
        const session = gateway.getSession(context.sessionId);
        const stats = gateway.getStats();

        if (!session) {
          return { success: false, message: 'Session non trouvée' };
        }

        return {
          success: true,
          message: `📊 **Statut**\n\n` +
            `**Session:** ${session.id.slice(0, 12)}...\n` +
            `**Channel:** ${session.channelType}\n` +
            `**Status:** ${session.status}\n` +
            `**Modèle:** ${session.metadata.model || 'default'}\n` +
            `**Skills:** ${session.metadata.skills?.length || 0} actifs\n` +
            `**Créée:** ${new Date(session.createdAt).toLocaleString()}\n\n` +
            `**Gateway:** ${stats.sessions} sessions, ${stats.channels} channels`
        };
      }
    });

    // /new - Start new conversation
    this.register({
      name: 'new',
      aliases: ['reset', 'clear', 'nouveau'],
      description: 'Démarre une nouvelle conversation',
      usage: '/new',
      examples: ['/new'],
      handler: async (_args, context) => {
        const gateway = getGateway();
        await gateway.closeSession(context.sessionId);
        
        return {
          success: true,
          message: '🔄 Conversation réinitialisée. Comment puis-je vous aider?'
        };
      }
    });

    // /model - Change or show model
    this.register({
      name: 'model',
      aliases: ['m', 'modele'],
      description: 'Affiche ou change le modèle utilisé',
      usage: '/model [nom_modele]',
      examples: ['/model', '/model gpt-4', '/model claude-3'],
      handler: async (args, context) => {
        const gateway = getGateway();
        const session = gateway.getSession(context.sessionId);

        if (!session) {
          return { success: false, message: 'Session non trouvée' };
        }

        if (args.length === 0) {
          return {
            success: true,
            message: `🤖 Modèle actuel: **${session.metadata.model || 'default'}**\n\nModèles disponibles: gpt-4o, gpt-4, claude-3, gemini-pro`
          };
        }

        const newModel = args[0];
        gateway.updateSession(context.sessionId, { model: newModel });

        return {
          success: true,
          message: `✅ Modèle changé pour **${newModel}**`
        };
      }
    });

    // /skills - List or toggle skills
    this.register({
      name: 'skills',
      aliases: ['sk', 'competences'],
      description: 'Affiche ou gère les skills',
      usage: '/skills [enable|disable] [skill_id]',
      examples: ['/skills', '/skills enable web-search', '/skills disable code-interpreter'],
      handler: async (args, _context) => {
        const skillsManager = getSkillsManager();

        if (args.length === 0) {
          const enabled = skillsManager.listEnabledSkills();
          const all = skillsManager.listSkills();
          const enabledIds = new Set(enabled.map(s => s.id));
          
          return {
            success: true,
            message: `🔧 **Skills**\n\n` +
              `**Actifs (${enabled.length}):** ${enabled.map(s => s.name).join(', ') || 'Aucun'}\n\n` +
              `**Disponibles (${all.length}):**\n${all.map(s => `• ${enabledIds.has(s.id) ? '✅' : '⬜'} ${s.name}`).join('\n')}`
          };
        }

        const action = args[0].toLowerCase();
        const skillId = args[1];

        if (!skillId) {
          return { success: false, message: 'Spécifiez un skill_id' };
        }

        if (action === 'enable') {
          skillsManager.enableSkill(skillId);
          return { success: true, message: `✅ Skill **${skillId}** activé` };
        } else if (action === 'disable') {
          skillsManager.disableSkill(skillId);
          return { success: true, message: `⬜ Skill **${skillId}** désactivé` };
        }

        return { success: false, message: `Action inconnue: ${action}` };
      }
    });

    // /compact - Toggle compact mode
    this.register({
      name: 'compact',
      aliases: ['c'],
      description: 'Active/désactive le mode compact',
      usage: '/compact [on|off]',
      examples: ['/compact', '/compact on'],
      handler: async (args, context) => {
        const gateway = getGateway();
        const session = gateway.getSession(context.sessionId);

        if (!session) {
          return { success: false, message: 'Session non trouvée' };
        }

        const currentCompact = session.metadata.compact || false;
        const newCompact = args.length > 0 
          ? args[0].toLowerCase() === 'on'
          : !currentCompact;

        gateway.updateSession(context.sessionId, { compact: newCompact });

        return {
          success: true,
          message: newCompact 
            ? '📦 Mode compact activé - réponses plus courtes'
            : '📖 Mode normal activé - réponses détaillées'
        };
      }
    });

    // /temperature - Adjust creativity
    this.register({
      name: 'temperature',
      aliases: ['temp', 't'],
      description: 'Ajuste la créativité des réponses (0.0-1.0)',
      usage: '/temperature [valeur]',
      examples: ['/temperature', '/temperature 0.7'],
      handler: async (args, context) => {
        const gateway = getGateway();
        const session = gateway.getSession(context.sessionId);

        if (!session) {
          return { success: false, message: 'Session non trouvée' };
        }

        if (args.length === 0) {
          const temp = session.metadata.temperature ?? 0.7;
          return {
            success: true,
            message: `🌡️ Température actuelle: **${temp}**\n\n0.0 = précis, 1.0 = créatif`
          };
        }

        const temp = parseFloat(args[0]);
        if (isNaN(temp) || temp < 0 || temp > 1) {
          return { success: false, message: 'La température doit être entre 0.0 et 1.0' };
        }

        gateway.updateSession(context.sessionId, { temperature: temp });

        return {
          success: true,
          message: `🌡️ Température réglée à **${temp}**`
        };
      }
    });

    // /export - Export conversation
    this.register({
      name: 'export',
      aliases: ['save', 'download'],
      description: 'Exporte la conversation',
      usage: '/export [format]',
      examples: ['/export', '/export json', '/export markdown'],
      handler: async (args, context) => {
        const format = args[0]?.toLowerCase() || 'markdown';
        
        return {
          success: true,
          message: `📥 Export en cours au format **${format}**...`,
          data: {
            action: 'export',
            format,
            sessionId: context.sessionId
          }
        };
      }
    });

    // /stats - Show usage stats
    this.register({
      name: 'stats',
      aliases: ['usage', 'metrics'],
      description: 'Affiche les statistiques d\'utilisation',
      usage: '/stats',
      examples: ['/stats'],
      handler: async () => {
        const gateway = getGateway();
        const skillsManager = getSkillsManager();
        const cronManager = getCronManager();
        const webhookManager = getWebhookManager();

        const gwStats = gateway.getStats();
        const skillStats = skillsManager.getStats();
        const cronStats = cronManager.getStats();
        const webhookStats = webhookManager.getStats();

        return {
          success: true,
          message: `📈 **Statistiques**\n\n` +
            `**Gateway:**\n` +
            `• Sessions: ${gwStats.sessions}\n` +
            `• Channels: ${gwStats.channels}\n` +
            `• Clients: ${gwStats.clients}\n\n` +
            `**Skills:**\n` +
            `• Total: ${skillStats.total}\n` +
            `• Actifs: ${skillStats.enabled}\n\n` +
            `**Automation:**\n` +
            `• Cron jobs: ${cronStats.total} (${cronStats.enabled} actifs)\n` +
            `• Webhooks: ${webhookStats.total} (${webhookStats.enabled} actifs)\n` +
            `• Exécutions cron: ${cronStats.totalRuns}\n` +
            `• Déclenchements webhook: ${webhookStats.totalTriggers}`
        };
      }
    });

    // /persona - Change assistant persona
    this.register({
      name: 'persona',
      aliases: ['p', 'personnalite'],
      description: 'Change la personnalité de l\'assistant',
      usage: '/persona [nom]',
      examples: ['/persona', '/persona expert', '/persona ami'],
      handler: async (args, context) => {
        const gateway = getGateway();

        const personas: Record<string, string> = {
          'default': 'Assistant IA polyvalent et professionnel',
          'expert': 'Expert technique détaillé et précis',
          'ami': 'Ami chaleureux et conversationnel',
          'coach': 'Coach motivant et encourageant',
          'creative': 'Artiste créatif et imaginatif',
          'teacher': 'Professeur pédagogue et patient'
        };

        if (args.length === 0) {
          return {
            success: true,
            message: `👤 **Personas disponibles**\n\n${Object.entries(personas).map(([k, v]) => `• **${k}**: ${v}`).join('\n')}`
          };
        }

        const persona = args[0].toLowerCase();
        if (!personas[persona]) {
          return { success: false, message: `Persona inconnu: ${persona}` };
        }

        gateway.updateSession(context.sessionId, { 
          customPrompt: `Tu es un ${personas[persona]}.`
        });

        return {
          success: true,
          message: `👤 Persona changé pour **${persona}**`
        };
      }
    });

    // /lang - Change language
    this.register({
      name: 'lang',
      aliases: ['language', 'langue'],
      description: 'Change la langue de l\'assistant',
      usage: '/lang [code]',
      examples: ['/lang', '/lang en', '/lang fr'],
      handler: async (args, context) => {
        const gateway = getGateway();

        const languages: Record<string, string> = {
          'fr': 'Français',
          'en': 'English',
          'es': 'Español',
          'de': 'Deutsch',
          'it': 'Italiano',
          'pt': 'Português',
          'zh': '中文',
          'ja': '日本語'
        };

        if (args.length === 0) {
          return {
            success: true,
            message: `🌍 **Langues disponibles**\n\n${Object.entries(languages).map(([k, v]) => `• **${k}**: ${v}`).join('\n')}`
          };
        }

        const lang = args[0].toLowerCase();
        if (!languages[lang]) {
          return { success: false, message: `Langue inconnue: ${lang}` };
        }

        gateway.updateSession(context.sessionId, { language: lang });

        return {
          success: true,
          message: `🌍 Langue changée pour **${languages[lang]}**`
        };
      }
    });
  }

  // Command registration
  register(command: ChatCommand): void {
    this.commands.set(command.name, command);
    
    for (const alias of command.aliases) {
      this.aliases.set(alias, command.name);
    }
    
    this.emit('command:registered', command);
  }

  unregister(name: string): boolean {
    const command = this.commands.get(name);
    if (!command) return false;

    this.commands.delete(name);
    
    for (const alias of command.aliases) {
      this.aliases.delete(alias);
    }
    
    this.emit('command:unregistered', { name });
    return true;
  }

  getCommand(nameOrAlias: string): ChatCommand | undefined {
    const name = this.aliases.get(nameOrAlias) || nameOrAlias;
    return this.commands.get(name);
  }

  listCommands(): ChatCommand[] {
    return Array.from(this.commands.values());
  }

  // Command execution
  async execute(input: string, context: CommandContext): Promise<CommandResult | null> {
    // Check if input starts with /
    if (!input.startsWith('/')) {
      return null;
    }

    const parts = input.slice(1).split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.getCommand(commandName);
    
    if (!command) {
      return {
        success: false,
        message: `❓ Commande inconnue: /${commandName}\n\nTapez /help pour voir les commandes disponibles.`
      };
    }

    try {
      const result = await command.handler(args, context);
      this.emit('command:executed', { command: command.name, args, context, result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.emit('command:error', { command: command.name, args, context, error });
      return {
        success: false,
        message: `❌ Erreur lors de l'exécution de /${command.name}: ${errorMessage}`
      };
    }
  }

  // Check if input is a command
  isCommand(input: string): boolean {
    return input.startsWith('/');
  }
}

// Singleton
let chatCommandManagerInstance: ChatCommandManager | null = null;

export function getChatCommandManager(): ChatCommandManager {
  if (!chatCommandManagerInstance) {
    chatCommandManagerInstance = new ChatCommandManager();
  }
  return chatCommandManagerInstance;
}

export function resetChatCommandManager(): void {
  if (chatCommandManagerInstance) {
    chatCommandManagerInstance.removeAllListeners();
    chatCommandManagerInstance = null;
  }
}

