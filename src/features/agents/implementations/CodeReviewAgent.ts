/**
 * CodeReviewAgent: Agent de revue et génération de code
 * Assistant dédié à la revue de code, génération de scripts et refactoring.
 */
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { aiService } from '../../../services/aiService';

interface CodeIssue {
  severity: 'critical' | 'warning' | 'info' | 'suggestion';
  line?: number;
  message: string;
  suggestion?: string;
}

interface CodeReviewResult {
  score: number; // 0-100
  summary: string;
  issues: CodeIssue[];
  strengths: string[];
  improvements: string[];
}

interface RefactorSuggestion {
  original: string;
  refactored: string;
  explanation: string;
  benefits: string[];
}

interface TestCase {
  name: string;
  description: string;
  code: string;
  type: 'unit' | 'integration' | 'e2e';
}

export class CodeReviewAgent implements BaseAgent {
  name = 'CodeReviewAgent';
  description = 'Agent de revue et génération de code. Analyse, génère, refactorise et explique du code.';
  version = '1.0.0';
  domain: AgentDomain = 'analysis';
  capabilities = [
    'code_review',
    'code_generation',
    'code_refactoring',
    'code_explanation',
    'test_generation',
    'security_analysis',
    'performance_analysis'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, code, language, description, requirements, testFramework } = props;

    try {
      switch (intent) {
        case 'review':
          return await this.handleReview(code, language);

        case 'generate':
          return await this.handleGenerate(description, language, requirements);

        case 'refactor':
          return await this.handleRefactor(code, language, props.goals);

        case 'explain':
          return await this.handleExplain(code, language, props.level);

        case 'test':
          return await this.handleGenerateTests(code, language, testFramework);

        case 'security':
          return await this.handleSecurityAnalysis(code, language);

        case 'performance':
          return await this.handlePerformanceAnalysis(code, language);

        default:
          if (code) {
            // Default: review
            return await this.handleReview(code, language);
          }
          if (description) {
            // Generate if description provided
            return await this.handleGenerate(description, language, requirements);
          }
          return {
            success: false,
            output: null,
            error: 'Intent non reconnu. Utilisez: review, generate, refactor, explain, test, security, performance'
          };
      }
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Revue de code complète
   */
  private async handleReview(code: string, language?: string): Promise<AgentExecuteResult> {
    if (!code) {
      return { success: false, output: null, error: 'Code requis pour la revue' };
    }

    const detectedLanguage = language || this.detectLanguage(code);

    const prompt = `Tu es un expert en revue de code ${detectedLanguage}. Analyse ce code en profondeur.

\`\`\`${detectedLanguage}
${code}
\`\`\`

Évalue selon ces critères:
1. **Qualité du code** (lisibilité, conventions, nommage)
2. **Architecture** (design patterns, SOLID, DRY)
3. **Sécurité** (vulnérabilités, inputs non validés)
4. **Performance** (complexité, optimisations possibles)
5. **Maintenabilité** (tests, documentation, modularité)
6. **Bonnes pratiques** (gestion d'erreurs, typage)

Réponds en JSON:
{
  "score": 75,
  "summary": "Résumé en 2-3 phrases",
  "issues": [
    {
      "severity": "critical|warning|info|suggestion",
      "line": 10,
      "message": "Description du problème",
      "suggestion": "Comment corriger"
    }
  ],
  "strengths": ["Point positif 1", "Point positif 2"],
  "improvements": ["Amélioration prioritaire 1", "Amélioration 2"]
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result: CodeReviewResult = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: detectedLanguage,
            linesOfCode: code.split('\n').length,
            ...result
          },
          metadata: {
            confidence: 0.85
          }
        };
      }

      return {
        success: true,
        output: {
          language: detectedLanguage,
          summary: aiResult.text,
          score: 50,
          issues: [],
          strengths: [],
          improvements: []
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la revue de code'
      };
    }
  }

  /**
   * Génération de code
   */
  private async handleGenerate(
    description: string,
    language?: string,
    requirements?: string[]
  ): Promise<AgentExecuteResult> {
    if (!description) {
      return { success: false, output: null, error: 'Description requise' };
    }

    const targetLanguage = language || 'typescript';

    const prompt = `Tu es un expert en développement ${targetLanguage}. Génère du code de qualité production.

**Description:** ${description}

**Langage:** ${targetLanguage}

**Exigences supplémentaires:**
${requirements?.map(r => `- ${r}`).join('\n') || '- Code propre et bien documenté'}

Génère:
1. Le code complet et fonctionnel
2. Les imports nécessaires
3. Les types/interfaces si applicable
4. Des commentaires JSDoc/docstrings
5. Gestion d'erreurs appropriée

Réponds en JSON:
{
  "code": "// Le code ici",
  "imports": ["import ..."],
  "types": "// Types/interfaces si applicable",
  "usage": "// Exemple d'utilisation",
  "dependencies": ["package1", "package2"],
  "notes": "Notes importantes sur l'implémentation"
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: targetLanguage,
            description,
            ...result
          }
        };
      }

      // Extract code from markdown code blocks
      const codeMatch = aiResult.text?.match(/```[\w]*\n([\s\S]*?)```/);
      return {
        success: true,
        output: {
          language: targetLanguage,
          description,
          code: codeMatch ? codeMatch[1] : aiResult.text,
          imports: [],
          dependencies: [],
          notes: ''
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération de code'
      };
    }
  }

  /**
   * Refactoring de code
   */
  private async handleRefactor(
    code: string,
    language?: string,
    goals?: string[]
  ): Promise<AgentExecuteResult> {
    if (!code) {
      return { success: false, output: null, error: 'Code requis' };
    }

    const detectedLanguage = language || this.detectLanguage(code);

    const prompt = `Tu es un expert en refactoring ${detectedLanguage}. Améliore ce code.

**Code original:**
\`\`\`${detectedLanguage}
${code}
\`\`\`

**Objectifs de refactoring:**
${goals?.map(g => `- ${g}`).join('\n') || `- Améliorer la lisibilité
- Réduire la complexité
- Appliquer les bonnes pratiques ${detectedLanguage}
- Optimiser si possible`}

Génère:
1. Le code refactorisé complet
2. Liste des changements effectués
3. Explication de chaque amélioration
4. Bénéfices du refactoring

Réponds en JSON:
{
  "refactored": "// Code refactorisé",
  "changes": [
    {
      "description": "Ce qui a changé",
      "reason": "Pourquoi",
      "benefit": "Bénéfice"
    }
  ],
  "metrics": {
    "complexityBefore": "O(n²)",
    "complexityAfter": "O(n)",
    "linesRemoved": 10,
    "readabilityImproved": true
  }
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: detectedLanguage,
            original: code,
            ...result
          }
        };
      }

      const codeMatch = aiResult.text?.match(/```[\w]*\n([\s\S]*?)```/);
      return {
        success: true,
        output: {
          language: detectedLanguage,
          original: code,
          refactored: codeMatch ? codeMatch[1] : aiResult.text,
          changes: [],
          metrics: {}
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors du refactoring'
      };
    }
  }

  /**
   * Explication de code
   */
  private async handleExplain(
    code: string,
    language?: string,
    level: string = 'intermediate'
  ): Promise<AgentExecuteResult> {
    if (!code) {
      return { success: false, output: null, error: 'Code requis' };
    }

    const detectedLanguage = language || this.detectLanguage(code);

    const levelDescriptions: Record<string, string> = {
      beginner: 'Explique comme à un débutant, avec des analogies simples',
      intermediate: 'Explique avec des termes techniques mais accessibles',
      expert: 'Analyse technique approfondie avec détails d\'implémentation'
    };

    const prompt = `Tu es un professeur de programmation ${detectedLanguage}. Explique ce code.

**Niveau d'explication:** ${levelDescriptions[level] || levelDescriptions.intermediate}

\`\`\`${detectedLanguage}
${code}
\`\`\`

Fournis:
1. Vue d'ensemble (ce que fait le code)
2. Explication ligne par ligne des parties importantes
3. Concepts clés utilisés
4. Cas d'utilisation typiques
5. Pièges potentiels à éviter

Réponds en JSON:
{
  "overview": "Description générale",
  "lineByLine": [
    {"lines": "1-5", "explanation": "..."},
    {"lines": "6-10", "explanation": "..."}
  ],
  "concepts": ["Concept 1", "Concept 2"],
  "useCases": ["Cas 1", "Cas 2"],
  "pitfalls": ["Piège 1", "Piège 2"],
  "relatedTopics": ["Sujet connexe 1"]
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: detectedLanguage,
            level,
            ...result
          }
        };
      }

      return {
        success: true,
        output: {
          language: detectedLanguage,
          level,
          overview: aiResult.text,
          lineByLine: [],
          concepts: [],
          useCases: [],
          pitfalls: []
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de l\'explication'
      };
    }
  }

  /**
   * Génération de tests
   */
  private async handleGenerateTests(
    code: string,
    language?: string,
    framework?: string
  ): Promise<AgentExecuteResult> {
    if (!code) {
      return { success: false, output: null, error: 'Code requis' };
    }

    const detectedLanguage = language || this.detectLanguage(code);

    const defaultFrameworks: Record<string, string> = {
      typescript: 'vitest',
      javascript: 'jest',
      python: 'pytest',
      java: 'junit',
      go: 'testing',
      rust: 'cargo test',
      csharp: 'xunit'
    };

    const testFramework = framework || defaultFrameworks[detectedLanguage] || 'vitest';

    const prompt = `Tu es un expert en tests ${detectedLanguage} avec ${testFramework}. Génère des tests complets.

**Code à tester:**
\`\`\`${detectedLanguage}
${code}
\`\`\`

**Framework de test:** ${testFramework}

Génère:
1. Tests unitaires pour chaque fonction/méthode
2. Tests des cas limites (edge cases)
3. Tests des erreurs attendues
4. Tests d'intégration si pertinent
5. Mocks/stubs si nécessaire

Réponds en JSON:
{
  "tests": [
    {
      "name": "should do something",
      "description": "Test description",
      "code": "test('should...', () => {...})",
      "type": "unit"
    }
  ],
  "setup": "// Code de setup/beforeEach",
  "mocks": "// Mocks nécessaires",
  "coverage": {
    "functions": ["function1", "function2"],
    "edgeCases": ["cas limite 1"],
    "errorCases": ["erreur 1"]
  }
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: detectedLanguage,
            framework: testFramework,
            ...result
          }
        };
      }

      const codeMatch = aiResult.text?.match(/```[\w]*\n([\s\S]*?)```/);
      return {
        success: true,
        output: {
          language: detectedLanguage,
          framework: testFramework,
          tests: [{
            name: 'generated_tests',
            description: 'Tests générés',
            code: codeMatch ? codeMatch[1] : aiResult.text,
            type: 'unit' as const
          }],
          setup: '',
          mocks: ''
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération des tests'
      };
    }
  }

  /**
   * Analyse de sécurité
   */
  private async handleSecurityAnalysis(code: string, language?: string): Promise<AgentExecuteResult> {
    if (!code) {
      return { success: false, output: null, error: 'Code requis' };
    }

    const detectedLanguage = language || this.detectLanguage(code);

    const prompt = `Tu es un expert en sécurité applicative. Analyse ce code pour les vulnérabilités.

\`\`\`${detectedLanguage}
${code}
\`\`\`

Vérifie:
1. **Injection** (SQL, XSS, Command injection)
2. **Authentification** (tokens, sessions, passwords)
3. **Autorisation** (contrôle d'accès, permissions)
4. **Données sensibles** (secrets, PII, encryption)
5. **Validation** (inputs, sanitization)
6. **Dépendances** (packages vulnérables)
7. **Configuration** (headers, CORS, CSP)

Réponds en JSON:
{
  "riskLevel": "critical|high|medium|low|none",
  "vulnerabilities": [
    {
      "type": "XSS|SQLi|etc",
      "severity": "critical|high|medium|low",
      "location": "ligne ou fonction",
      "description": "Description",
      "fix": "Comment corriger",
      "cwe": "CWE-79"
    }
  ],
  "recommendations": ["Recommandation 1"],
  "secureAlternatives": "Code corrigé si vulnérabilités trouvées"
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: detectedLanguage,
            ...result
          }
        };
      }

      return {
        success: true,
        output: {
          language: detectedLanguage,
          riskLevel: 'unknown',
          vulnerabilities: [],
          recommendations: [aiResult.text],
          secureAlternatives: ''
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de l\'analyse de sécurité'
      };
    }
  }

  /**
   * Analyse de performance
   */
  private async handlePerformanceAnalysis(code: string, language?: string): Promise<AgentExecuteResult> {
    if (!code) {
      return { success: false, output: null, error: 'Code requis' };
    }

    const detectedLanguage = language || this.detectLanguage(code);

    const prompt = `Tu es un expert en optimisation de performance ${detectedLanguage}. Analyse ce code.

\`\`\`${detectedLanguage}
${code}
\`\`\`

Analyse:
1. **Complexité algorithmique** (temps et espace)
2. **Boucles** (optimisations possibles)
3. **Mémoire** (allocations, fuites potentielles)
4. **I/O** (opérations bloquantes, batching)
5. **Caching** (opportunités de mise en cache)
6. **Parallélisation** (opportunités async/threads)

Réponds en JSON:
{
  "complexity": {
    "time": "O(n²)",
    "space": "O(n)",
    "explanation": "Explication"
  },
  "bottlenecks": [
    {
      "location": "ligne ou fonction",
      "issue": "Description du problème",
      "impact": "high|medium|low",
      "optimization": "Solution proposée"
    }
  ],
  "optimizations": [
    {
      "current": "Code actuel",
      "optimized": "Code optimisé",
      "improvement": "Amélioration attendue"
    }
  ],
  "recommendations": ["Recommandation 1"]
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            language: detectedLanguage,
            ...result
          }
        };
      }

      return {
        success: true,
        output: {
          language: detectedLanguage,
          complexity: { time: 'Unknown', space: 'Unknown' },
          bottlenecks: [],
          optimizations: [],
          recommendations: [aiResult.text]
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de l\'analyse de performance'
      };
    }
  }

  /**
   * Détecte le langage de programmation
   */
  private detectLanguage(code: string): string {
    const patterns: Array<{ lang: string; patterns: RegExp[] }> = [
      { lang: 'typescript', patterns: [/:\s*(string|number|boolean|any)\b/, /interface\s+\w+/, /type\s+\w+\s*=/, /<\w+>/] },
      { lang: 'javascript', patterns: [/const\s+\w+\s*=/, /function\s+\w+/, /=>\s*{/, /require\(/, /module\.exports/] },
      { lang: 'python', patterns: [/def\s+\w+\(/, /import\s+\w+/, /from\s+\w+\s+import/, /:\s*$/, /self\./] },
      { lang: 'java', patterns: [/public\s+class/, /private\s+\w+/, /void\s+\w+\(/, /System\.out/] },
      { lang: 'go', patterns: [/func\s+\w+\(/, /package\s+\w+/, /import\s+"/, /:=/, /fmt\./] },
      { lang: 'rust', patterns: [/fn\s+\w+\(/, /let\s+mut/, /impl\s+\w+/, /pub\s+fn/, /->.*{/] },
      { lang: 'csharp', patterns: [/using\s+System/, /namespace\s+\w+/, /public\s+void/, /Console\.Write/] },
      { lang: 'php', patterns: [/<\?php/, /\$\w+\s*=/, /function\s+\w+\(/, /echo\s+/, /->/, /::/] },
      { lang: 'ruby', patterns: [/def\s+\w+/, /end$/, /puts\s+/, /class\s+\w+/, /@\w+/] },
      { lang: 'sql', patterns: [/SELECT\s+/i, /FROM\s+/i, /WHERE\s+/i, /INSERT\s+INTO/i, /CREATE\s+TABLE/i] },
      { lang: 'html', patterns: [/<html/i, /<div/i, /<body/i, /<head/i, /<!DOCTYPE/i] },
      { lang: 'css', patterns: [/{\s*[\w-]+\s*:/, /@media/, /\.[\w-]+\s*{/, /#[\w-]+\s*{/] },
      { lang: 'bash', patterns: [/^#!/, /\$\(/, /echo\s+/, /if\s+\[/, /fi$/] }
    ];

    for (const { lang, patterns: langPatterns } of patterns) {
      const matches = langPatterns.filter(p => p.test(code)).length;
      if (matches >= 2) return lang;
    }

    // Default to typescript for this project
    return 'typescript';
  }
}
