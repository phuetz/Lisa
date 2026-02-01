/**
 * Lisa Prompt Templates
 * Reusable prompt templates with variables and categories
 * Inspired by OpenClaw's prompt system
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  content: string;
  variables: PromptVariable[];
  tags: string[];
  isBuiltin: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

export type PromptCategory = 
  | 'general'
  | 'coding'
  | 'writing'
  | 'analysis'
  | 'creative'
  | 'business'
  | 'education'
  | 'translation'
  | 'custom';

export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiline';
  required: boolean;
  defaultValue?: string;
  options?: string[]; // For select type
}

export interface CompiledPrompt {
  content: string;
  variables: Record<string, string>;
  templateId: string;
}

// Built-in templates
const BUILTIN_TEMPLATES: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  {
    name: 'Code Review',
    description: 'Analyse et revue de code avec suggestions d\'amélioration',
    category: 'coding',
    content: `Analyse le code suivant et fournis une revue détaillée:

\`\`\`{{language}}
{{code}}
\`\`\`

Points à évaluer:
1. Qualité et lisibilité du code
2. Bonnes pratiques et patterns
3. Bugs potentiels ou problèmes de sécurité
4. Optimisations possibles
5. Suggestions d'amélioration

{{additional_context}}`,
    variables: [
      { name: 'language', description: 'Langage de programmation', type: 'string', required: true, defaultValue: 'typescript' },
      { name: 'code', description: 'Code à analyser', type: 'multiline', required: true },
      { name: 'additional_context', description: 'Contexte additionnel', type: 'multiline', required: false }
    ],
    tags: ['code', 'review', 'quality'],
    isBuiltin: true
  },
  {
    name: 'Explain Code',
    description: 'Explication détaillée d\'un bout de code',
    category: 'coding',
    content: `Explique ce code de manière {{detail_level}}:

\`\`\`{{language}}
{{code}}
\`\`\`

{{focus_areas}}`,
    variables: [
      { name: 'language', description: 'Langage', type: 'string', required: true },
      { name: 'code', description: 'Code à expliquer', type: 'multiline', required: true },
      { name: 'detail_level', description: 'Niveau de détail', type: 'select', required: true, options: ['simple', 'détaillée', 'technique'], defaultValue: 'détaillée' },
      { name: 'focus_areas', description: 'Points spécifiques à expliquer', type: 'multiline', required: false }
    ],
    tags: ['code', 'explain', 'learning'],
    isBuiltin: true
  },
  {
    name: 'Write Tests',
    description: 'Génère des tests unitaires pour du code',
    category: 'coding',
    content: `Génère des tests {{test_framework}} pour le code suivant:

\`\`\`{{language}}
{{code}}
\`\`\`

Inclure:
- Tests des cas nominaux
- Tests des cas limites
- Tests d'erreur
{{additional_requirements}}`,
    variables: [
      { name: 'language', description: 'Langage', type: 'string', required: true },
      { name: 'code', description: 'Code à tester', type: 'multiline', required: true },
      { name: 'test_framework', description: 'Framework de test', type: 'select', required: true, options: ['Jest', 'Vitest', 'Mocha', 'pytest', 'JUnit'], defaultValue: 'Vitest' },
      { name: 'additional_requirements', description: 'Exigences supplémentaires', type: 'multiline', required: false }
    ],
    tags: ['code', 'tests', 'quality'],
    isBuiltin: true
  },
  {
    name: 'Summarize Text',
    description: 'Résume un texte avec le niveau de détail souhaité',
    category: 'analysis',
    content: `Résume le texte suivant en {{length}}:

{{text}}

Format souhaité: {{format}}
{{focus}}`,
    variables: [
      { name: 'text', description: 'Texte à résumer', type: 'multiline', required: true },
      { name: 'length', description: 'Longueur du résumé', type: 'select', required: true, options: ['une phrase', 'un paragraphe', '3-5 points clés', 'une page'], defaultValue: 'un paragraphe' },
      { name: 'format', description: 'Format de sortie', type: 'select', required: true, options: ['prose', 'bullet points', 'numéroté'], defaultValue: 'bullet points' },
      { name: 'focus', description: 'Points à mettre en avant', type: 'string', required: false }
    ],
    tags: ['summary', 'analysis', 'text'],
    isBuiltin: true
  },
  {
    name: 'Translate',
    description: 'Traduit du texte dans une autre langue',
    category: 'translation',
    content: `Traduis le texte suivant de {{source_lang}} vers {{target_lang}}:

{{text}}

Style: {{style}}
{{notes}}`,
    variables: [
      { name: 'text', description: 'Texte à traduire', type: 'multiline', required: true },
      { name: 'source_lang', description: 'Langue source', type: 'string', required: true, defaultValue: 'français' },
      { name: 'target_lang', description: 'Langue cible', type: 'string', required: true, defaultValue: 'anglais' },
      { name: 'style', description: 'Style de traduction', type: 'select', required: true, options: ['formel', 'informel', 'technique', 'littéraire'], defaultValue: 'formel' },
      { name: 'notes', description: 'Notes spécifiques', type: 'multiline', required: false }
    ],
    tags: ['translation', 'language'],
    isBuiltin: true
  },
  {
    name: 'Creative Writing',
    description: 'Aide à l\'écriture créative',
    category: 'creative',
    content: `Écris {{content_type}} sur le thème: {{theme}}

Ton: {{tone}}
Longueur: {{length}}
Style: {{style}}

Contraintes:
{{constraints}}`,
    variables: [
      { name: 'content_type', description: 'Type de contenu', type: 'select', required: true, options: ['une histoire', 'un poème', 'un dialogue', 'une description', 'un article'], defaultValue: 'une histoire' },
      { name: 'theme', description: 'Thème ou sujet', type: 'string', required: true },
      { name: 'tone', description: 'Ton', type: 'select', required: true, options: ['humoristique', 'dramatique', 'poétique', 'neutre', 'inspirant'], defaultValue: 'neutre' },
      { name: 'length', description: 'Longueur', type: 'select', required: true, options: ['court', 'moyen', 'long'], defaultValue: 'moyen' },
      { name: 'style', description: 'Style d\'écriture', type: 'string', required: false },
      { name: 'constraints', description: 'Contraintes spécifiques', type: 'multiline', required: false }
    ],
    tags: ['creative', 'writing', 'story'],
    isBuiltin: true
  },
  {
    name: 'Email Draft',
    description: 'Rédige un email professionnel',
    category: 'business',
    content: `Rédige un email {{tone}} pour {{purpose}}:

Destinataire: {{recipient}}
Sujet principal: {{subject}}

Points à inclure:
{{points}}

{{signature}}`,
    variables: [
      { name: 'tone', description: 'Ton', type: 'select', required: true, options: ['formel', 'semi-formel', 'amical'], defaultValue: 'formel' },
      { name: 'purpose', description: 'Objectif de l\'email', type: 'string', required: true },
      { name: 'recipient', description: 'Destinataire (rôle/relation)', type: 'string', required: true },
      { name: 'subject', description: 'Sujet principal', type: 'string', required: true },
      { name: 'points', description: 'Points à aborder', type: 'multiline', required: true },
      { name: 'signature', description: 'Signature', type: 'string', required: false }
    ],
    tags: ['email', 'business', 'communication'],
    isBuiltin: true
  },
  {
    name: 'Debug Help',
    description: 'Aide au débogage d\'erreurs',
    category: 'coding',
    content: `J'ai l'erreur suivante:

\`\`\`
{{error_message}}
\`\`\`

Dans ce code ({{language}}):
\`\`\`{{language}}
{{code}}
\`\`\`

Contexte: {{context}}

Aide-moi à:
1. Comprendre l'erreur
2. Identifier la cause
3. Proposer une solution`,
    variables: [
      { name: 'error_message', description: 'Message d\'erreur', type: 'multiline', required: true },
      { name: 'language', description: 'Langage', type: 'string', required: true },
      { name: 'code', description: 'Code concerné', type: 'multiline', required: true },
      { name: 'context', description: 'Contexte additionnel', type: 'multiline', required: false }
    ],
    tags: ['debug', 'error', 'help'],
    isBuiltin: true
  },
  {
    name: 'Explain Concept',
    description: 'Explique un concept de manière pédagogique',
    category: 'education',
    content: `Explique le concept de "{{concept}}" à {{audience}}.

Niveau: {{level}}
Inclure: {{include}}

{{additional_context}}`,
    variables: [
      { name: 'concept', description: 'Concept à expliquer', type: 'string', required: true },
      { name: 'audience', description: 'Public cible', type: 'select', required: true, options: ['un enfant de 10 ans', 'un débutant', 'un étudiant', 'un professionnel'], defaultValue: 'un débutant' },
      { name: 'level', description: 'Niveau de détail', type: 'select', required: true, options: ['basique', 'intermédiaire', 'avancé'], defaultValue: 'intermédiaire' },
      { name: 'include', description: 'Éléments à inclure', type: 'select', required: false, options: ['exemples', 'analogies', 'schémas textuels', 'exercices'], defaultValue: 'exemples' },
      { name: 'additional_context', description: 'Contexte', type: 'multiline', required: false }
    ],
    tags: ['education', 'explain', 'learning'],
    isBuiltin: true
  },
  {
    name: 'Data Analysis',
    description: 'Analyse des données',
    category: 'analysis',
    content: `Analyse les données suivantes:

\`\`\`
{{data}}
\`\`\`

Type d'analyse: {{analysis_type}}
Questions spécifiques:
{{questions}}

Format de sortie souhaité: {{output_format}}`,
    variables: [
      { name: 'data', description: 'Données à analyser', type: 'multiline', required: true },
      { name: 'analysis_type', description: 'Type d\'analyse', type: 'select', required: true, options: ['statistique', 'tendances', 'comparaison', 'anomalies', 'complète'], defaultValue: 'complète' },
      { name: 'questions', description: 'Questions spécifiques', type: 'multiline', required: false },
      { name: 'output_format', description: 'Format de sortie', type: 'select', required: true, options: ['texte', 'tableau', 'bullet points', 'rapport'], defaultValue: 'bullet points' }
    ],
    tags: ['data', 'analysis', 'statistics'],
    isBuiltin: true
  }
];

export class PromptTemplateManager extends BrowserEventEmitter {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    super();
    this.loadBuiltinTemplates();
  }

  private loadBuiltinTemplates(): void {
    for (const template of BUILTIN_TEMPLATES) {
      const id = `tpl_${template.name.toLowerCase().replace(/\s+/g, '_')}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
      });
    }
  }

  // Template CRUD
  createTemplate(template: Omit<PromptTemplate, 'id' | 'isBuiltin' | 'createdAt' | 'updatedAt' | 'usageCount'>): PromptTemplate {
    const id = `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    
    const fullTemplate: PromptTemplate = {
      ...template,
      id,
      isBuiltin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    this.templates.set(id, fullTemplate);
    this.emit('template:created', fullTemplate);
    
    return fullTemplate;
  }

  updateTemplate(id: string, updates: Partial<Omit<PromptTemplate, 'id' | 'isBuiltin' | 'createdAt'>>): PromptTemplate | null {
    const template = this.templates.get(id);
    if (!template || template.isBuiltin) return null;

    Object.assign(template, updates, { updatedAt: new Date() });
    this.emit('template:updated', template);
    
    return template;
  }

  deleteTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template || template.isBuiltin) return false;

    this.templates.delete(id);
    this.emit('template:deleted', { id });
    
    return true;
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  listTemplates(filter?: {
    category?: PromptCategory;
    tag?: string;
    search?: string;
    builtinOnly?: boolean;
    customOnly?: boolean;
  }): PromptTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filter?.category) {
      templates = templates.filter(t => t.category === filter.category);
    }
    if (filter?.tag) {
      templates = templates.filter(t => t.tags.includes(filter.tag!));
    }
    if (filter?.search) {
      const search = filter.search.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search)
      );
    }
    if (filter?.builtinOnly) {
      templates = templates.filter(t => t.isBuiltin);
    }
    if (filter?.customOnly) {
      templates = templates.filter(t => !t.isBuiltin);
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  // Compile template with variables
  compileTemplate(id: string, variables: Record<string, string>): CompiledPrompt | null {
    const template = this.templates.get(id);
    if (!template) return null;

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name] && !variable.defaultValue) {
        throw new Error(`Variable requise manquante: ${variable.name}`);
      }
    }

    // Replace variables in content
    let content = template.content;
    
    for (const variable of template.variables) {
      const value = variables[variable.name] || variable.defaultValue || '';
      content = content.replace(new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g'), value);
    }

    // Increment usage count
    template.usageCount++;
    
    this.emit('template:used', { id, variables });

    return {
      content,
      variables,
      templateId: id
    };
  }

  // Quick compile with partial variables
  quickCompile(id: string, mainVariable: string): CompiledPrompt | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const firstRequired = template.variables.find(v => v.required);
    if (!firstRequired) return null;

    return this.compileTemplate(id, { [firstRequired.name]: mainVariable });
  }

  // Get all categories
  getCategories(): PromptCategory[] {
    return ['general', 'coding', 'writing', 'analysis', 'creative', 'business', 'education', 'translation', 'custom'];
  }

  // Get all tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const template of this.templates.values()) {
      for (const tag of template.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  // Export/Import
  exportTemplates(customOnly: boolean = true): string {
    const templates = customOnly 
      ? Array.from(this.templates.values()).filter(t => !t.isBuiltin)
      : Array.from(this.templates.values());
    
    return JSON.stringify(templates, null, 2);
  }

  importTemplates(json: string): number {
    const templates = JSON.parse(json) as PromptTemplate[];
    let imported = 0;

    for (const template of templates) {
      if (!this.templates.has(template.id)) {
        this.templates.set(template.id, {
          ...template,
          isBuiltin: false,
          createdAt: new Date(template.createdAt),
          updatedAt: new Date()
        });
        imported++;
      }
    }

    this.emit('templates:imported', { count: imported });
    return imported;
  }

  // Stats
  getStats(): {
    total: number;
    builtin: number;
    custom: number;
    totalUsage: number;
    byCategory: Record<string, number>;
  } {
    const templates = Array.from(this.templates.values());
    const byCategory: Record<string, number> = {};

    for (const t of templates) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }

    return {
      total: templates.length,
      builtin: templates.filter(t => t.isBuiltin).length,
      custom: templates.filter(t => !t.isBuiltin).length,
      totalUsage: templates.reduce((sum, t) => sum + t.usageCount, 0),
      byCategory
    };
  }
}

// Singleton
let promptTemplateManagerInstance: PromptTemplateManager | null = null;

export function getPromptTemplateManager(): PromptTemplateManager {
  if (!promptTemplateManagerInstance) {
    promptTemplateManagerInstance = new PromptTemplateManager();
  }
  return promptTemplateManagerInstance;
}

export function resetPromptTemplateManager(): void {
  if (promptTemplateManagerInstance) {
    promptTemplateManagerInstance.removeAllListeners();
    promptTemplateManagerInstance = null;
  }
}

