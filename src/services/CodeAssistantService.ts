/**
 * 💻 Code Assistant Service - Assistant Code
 * CodeInterpreterAgent + GitHubAgent pour review et génération de tests
 */

import { agentRegistry } from '../features/agents/core/registry';

export interface CodeReview {
  id: string;
  filename: string;
  language: string;
  timestamp: Date;
  status: 'pending' | 'reviewing' | 'completed' | 'error';
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  metrics?: CodeMetrics;
  error?: string;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  line: number;
  column?: number;
  message: string;
  rule?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface CodeSuggestion {
  type: 'refactor' | 'performance' | 'security' | 'style' | 'test';
  title: string;
  description: string;
  originalCode?: string;
  suggestedCode?: string;
  line?: number;
}

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  maintainability: number;
  testCoverage?: number;
}

export interface GeneratedTest {
  id: string;
  targetFile: string;
  testFile: string;
  framework: 'jest' | 'vitest' | 'mocha';
  tests: TestCase[];
  timestamp: Date;
}

export interface TestCase {
  name: string;
  description: string;
  code: string;
  type: 'unit' | 'integration' | 'e2e';
}

class CodeAssistantServiceImpl {
  private reviews: Map<string, CodeReview> = new Map();
  private generatedTests: Map<string, GeneratedTest> = new Map();

  /**
   * Analyser du code pour review
   */
  async reviewCode(
    code: string,
    filename: string,
    options: { checkSecurity?: boolean; checkPerformance?: boolean } = {}
  ): Promise<CodeReview> {
    const { checkSecurity = true, checkPerformance = true } = options;

    const review: CodeReview = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename,
      language: this.detectLanguage(filename),
      timestamp: new Date(),
      status: 'pending',
      issues: [],
      suggestions: [],
    };

    this.reviews.set(review.id, review);

    try {
      review.status = 'reviewing';

      // Analyse statique basique
      review.issues = this.performStaticAnalysis(code, review.language);

      // Métriques de code
      review.metrics = this.calculateMetrics(code);

      // Suggestions de refactoring
      review.suggestions = this.generateSuggestions(code, review.language, {
        checkSecurity,
        checkPerformance,
      });

      // Utiliser CodeInterpreterAgent si disponible
      const codeAgent = await agentRegistry.getAgentAsync('CodeInterpreterAgent');
      if (codeAgent) {
        const result = await codeAgent.execute({
          intent: 'analyze',
          code,
          language: review.language,
        });

        if (result.success && result.output) {
          if (result.output.issues) {
            review.issues.push(...result.output.issues);
          }
          if (result.output.suggestions) {
            review.suggestions.push(...result.output.suggestions);
          }
        }
      }

      review.status = 'completed';
    } catch (error) {
      review.status = 'error';
      review.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    this.reviews.set(review.id, review);
    return review;
  }

  /**
   * Détecter le langage de programmation
   */
  private detectLanguage(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
    };
    return languageMap[ext || ''] || 'unknown';
  }

  /**
   * Analyse statique basique
   */
  private performStaticAnalysis(code: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Lignes trop longues
      if (line.length > 120) {
        issues.push({
          type: 'warning',
          line: lineNum,
          message: `Ligne trop longue (${line.length} caractères, max recommandé: 120)`,
          rule: 'max-line-length',
          severity: 'minor',
        });
      }

      // Console.log en production (JS/TS)
      if (['javascript', 'typescript'].includes(language)) {
        if (line.includes('console.log') && !line.trim().startsWith('//')) {
          issues.push({
            type: 'warning',
            line: lineNum,
            message: 'console.log trouvé - à supprimer en production',
            rule: 'no-console',
            severity: 'minor',
          });
        }

        // TODO comments
        if (line.includes('TODO') || line.includes('FIXME')) {
          issues.push({
            type: 'info',
            line: lineNum,
            message: 'TODO/FIXME trouvé',
            rule: 'no-warning-comments',
            severity: 'minor',
          });
        }

        // any type
        if (line.includes(': any') || line.includes('<any>')) {
          issues.push({
            type: 'warning',
            line: lineNum,
            message: 'Type "any" utilisé - préférer un type spécifique',
            rule: 'no-explicit-any',
            severity: 'major',
          });
        }
      }

      // Mots de passe hardcodés (tous langages)
      if (/password\s*=\s*['"][^'"]+['"]/i.test(line)) {
        issues.push({
          type: 'error',
          line: lineNum,
          message: 'Mot de passe potentiellement hardcodé détecté',
          rule: 'no-hardcoded-credentials',
          severity: 'critical',
        });
      }
    });

    return issues;
  }

  /**
   * Calculer les métriques de code
   */
  private calculateMetrics(code: string): CodeMetrics {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);

    // Complexité cyclomatique simplifiée
    const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?'];
    let complexity = 1;
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) complexity += matches.length;
    });

    // Score de maintenabilité (simplifié)
    const avgLineLength = nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / nonEmptyLines.length;
    const maintainability = Math.max(0, Math.min(100, 
      100 - (complexity * 2) - (avgLineLength > 80 ? 10 : 0) - (nonEmptyLines.length > 300 ? 20 : 0)
    ));

    return {
      linesOfCode: nonEmptyLines.length,
      complexity,
      maintainability: Math.round(maintainability),
    };
  }

  /**
   * Générer des suggestions
   */
  private generateSuggestions(
    code: string,
    language: string,
    options: { checkSecurity?: boolean; checkPerformance?: boolean }
  ): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];

    if (['javascript', 'typescript'].includes(language)) {
      // Suggestion: utiliser const au lieu de let
      if (code.includes('let ') && !/let\s+\w+\s*=/.test(code)) {
        suggestions.push({
          type: 'style',
          title: 'Préférer const à let',
          description: 'Utilisez const pour les variables qui ne sont pas réassignées.',
        });
      }

      // Suggestion: async/await au lieu de .then()
      if (code.includes('.then(') && !code.includes('async ')) {
        suggestions.push({
          type: 'refactor',
          title: 'Utiliser async/await',
          description: 'Préférez async/await aux chaînes de .then() pour une meilleure lisibilité.',
        });
      }

      // Suggestion sécurité: innerHTML
      if (options.checkSecurity && code.includes('innerHTML')) {
        suggestions.push({
          type: 'security',
          title: 'Éviter innerHTML',
          description: 'innerHTML peut exposer à des attaques XSS. Utilisez textContent ou des méthodes DOM sécurisées.',
        });
      }

      // Suggestion performance: éviter les re-renders
      if (options.checkPerformance && code.includes('useState') && code.includes('useEffect')) {
        suggestions.push({
          type: 'performance',
          title: 'Optimiser les re-renders React',
          description: 'Vérifiez les dépendances de useEffect et utilisez useMemo/useCallback si nécessaire.',
        });
      }
    }

    return suggestions;
  }

  /**
   * Générer des tests automatiques
   */
  async generateTests(
    code: string,
    filename: string,
    framework: 'jest' | 'vitest' | 'mocha' = 'vitest'
  ): Promise<GeneratedTest> {
    const language = this.detectLanguage(filename);
    const testFilename = filename.replace(/\.(ts|js|tsx|jsx)$/, `.test.$1`);

    const generatedTest: GeneratedTest = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      targetFile: filename,
      testFile: testFilename,
      framework,
      tests: [],
      timestamp: new Date(),
    };

    // Extraire les fonctions exportées
    const exportedFunctions = this.extractExportedFunctions(code, language);

    // Générer des tests pour chaque fonction
    exportedFunctions.forEach(func => {
      generatedTest.tests.push({
        name: `should test ${func.name}`,
        description: `Test unitaire pour la fonction ${func.name}`,
        code: this.generateTestCode(func, framework),
        type: 'unit',
      });
    });

    this.generatedTests.set(generatedTest.id, generatedTest);
    return generatedTest;
  }

  /**
   * Extraire les fonctions exportées
   */
  private extractExportedFunctions(
    code: string,
    _language: string
  ): { name: string; params: string[]; isAsync: boolean }[] {
    const functions: { name: string; params: string[]; isAsync: boolean }[] = [];

    // Regex pour les fonctions exportées (simplifié)
    const exportFunctionRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    const exportConstRegex = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;

    let match;
    while ((match = exportFunctionRegex.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: match[2].split(',').map(p => p.trim()).filter(Boolean),
        isAsync: code.substring(match.index, match.index + 20).includes('async'),
      });
    }

    while ((match = exportConstRegex.exec(code)) !== null) {
      functions.push({
        name: match[1],
        params: [],
        isAsync: code.substring(match.index, match.index + 30).includes('async'),
      });
    }

    return functions;
  }

  /**
   * Générer le code de test
   */
  private generateTestCode(
    func: { name: string; params: string[]; isAsync: boolean },
    framework: string
  ): string {
    const asyncPrefix = func.isAsync ? 'async ' : '';
    const awaitPrefix = func.isAsync ? 'await ' : '';

    if (framework === 'vitest' || framework === 'jest') {
      return `
describe('${func.name}', () => {
  it('should work correctly', ${asyncPrefix}() => {
    // Arrange
    const input = /* TODO: add test input */;
    
    // Act
    const result = ${awaitPrefix}${func.name}(input);
    
    // Assert
    expect(result).toBeDefined();
    // TODO: add more specific assertions
  });

  it('should handle edge cases', ${asyncPrefix}() => {
    // TODO: add edge case tests
  });
});`.trim();
    }

    return `// TODO: Generate test for ${func.name}`;
  }

  /**
   * Obtenir une review par ID
   */
  getReview(id: string): CodeReview | undefined {
    return this.reviews.get(id);
  }

  /**
   * Obtenir toutes les reviews
   */
  getAllReviews(): CodeReview[] {
    return Array.from(this.reviews.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Obtenir les tests générés
   */
  getGeneratedTests(id: string): GeneratedTest | undefined {
    return this.generatedTests.get(id);
  }
}

// Export singleton
export const codeAssistantService = new CodeAssistantServiceImpl();
