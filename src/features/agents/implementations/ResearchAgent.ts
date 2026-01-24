/**
 * ResearchAgent: Agent de recherche et veille web
 * Capable de naviguer sur le web pour synthétiser des actualités ou des données spécifiques en temps réel.
 */
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { WebSearchTool } from '../../../tools/WebSearchTool';
import { WebContentReaderTool } from '../../../tools/WebContentReaderTool';
import { aiService } from '../../../services/aiService';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ResearchOutput {
  query: string;
  sources: Array<{ title: string; url: string; summary: string }>;
  synthesis: string;
  timestamp: string;
}

export class ResearchAgent implements BaseAgent {
  name = 'ResearchAgent';
  description = 'Agent de recherche et veille web. Recherche, synthétise et surveille des sujets en temps réel.';
  version = '1.0.0';
  domain: AgentDomain = 'knowledge';
  capabilities = [
    'web_search',
    'content_synthesis',
    'news_monitoring',
    'url_summarization',
    'multi_source_research'
  ];

  private searchTool: WebSearchTool;
  private contentTool: WebContentReaderTool;

  constructor() {
    this.searchTool = new WebSearchTool();
    this.contentTool = new WebContentReaderTool();
  }

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, query, url, urls, topic, maxSources = 5 } = props;

    try {
      switch (intent) {
        case 'search':
          return await this.handleSearch(query, maxSources);

        case 'synthesize':
          return await this.handleSynthesize(urls || [], query);

        case 'monitor':
          return await this.handleMonitor(topic || query);

        case 'summarize':
          return await this.handleSummarize(url || query);

        default:
          // Default: intelligent search with synthesis
          if (query) {
            return await this.handleSearch(query, maxSources);
          }
          return {
            success: false,
            output: null,
            error: 'Intent non reconnu. Utilisez: search, synthesize, monitor, ou summarize'
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
   * Recherche web multi-sources avec synthèse
   */
  private async handleSearch(query: string, maxSources: number): Promise<AgentExecuteResult> {
    if (!query) {
      return { success: false, output: null, error: 'Query requise pour la recherche' };
    }

    // 1. Recherche web
    const searchResult = await this.searchTool.execute({ query });
    if (!searchResult.success) {
      return { success: false, output: null, error: searchResult.error || 'Échec de la recherche' };
    }

    // 2. Extraire les résultats
    const results: SearchResult[] = searchResult.output?.results || [];
    const topResults = results.slice(0, maxSources);

    // 3. Récupérer le contenu de chaque source
    const sources: Array<{ title: string; url: string; summary: string }> = [];

    for (const result of topResults) {
      try {
        const contentResult = await this.contentTool.execute({ url: result.url });
        if (contentResult.success && contentResult.output) {
          sources.push({
            title: result.title,
            url: result.url,
            summary: contentResult.output.summary || contentResult.output.content?.slice(0, 500) || result.snippet
          });
        } else {
          // Utiliser le snippet si le contenu n'est pas accessible
          sources.push({
            title: result.title,
            url: result.url,
            summary: result.snippet
          });
        }
      } catch {
        sources.push({
          title: result.title,
          url: result.url,
          summary: result.snippet
        });
      }
    }

    // 4. Générer la synthèse via LLM
    const synthesis = await this.generateSynthesis(query, sources);

    const output: ResearchOutput = {
      query,
      sources,
      synthesis,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      output,
      metadata: {
        source: 'ResearchAgent',
        confidence: sources.length > 0 ? 0.8 : 0.3
      }
    };
  }

  /**
   * Synthèse de plusieurs URLs
   */
  private async handleSynthesize(urls: string[], context?: string): Promise<AgentExecuteResult> {
    if (!urls || urls.length === 0) {
      return { success: false, output: null, error: 'Au moins une URL requise pour la synthèse' };
    }

    const sources: Array<{ title: string; url: string; summary: string }> = [];

    for (const url of urls) {
      try {
        const contentResult = await this.contentTool.execute({ url });
        if (contentResult.success && contentResult.output) {
          sources.push({
            title: contentResult.output.title || url,
            url,
            summary: contentResult.output.summary || contentResult.output.content?.slice(0, 1000) || ''
          });
        }
      } catch (error) {
        console.warn(`[ResearchAgent] Could not fetch ${url}:`, error);
      }
    }

    if (sources.length === 0) {
      return { success: false, output: null, error: 'Aucune source accessible' };
    }

    const synthesis = await this.generateSynthesis(context || 'Synthèse des sources', sources);

    return {
      success: true,
      output: {
        sources,
        synthesis,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Surveillance de sujet (retourne les dernières actualités)
   */
  private async handleMonitor(topic: string): Promise<AgentExecuteResult> {
    if (!topic) {
      return { success: false, output: null, error: 'Sujet requis pour la surveillance' };
    }

    // Recherche d'actualités récentes
    const newsQuery = `${topic} actualités dernières nouvelles ${new Date().getFullYear()}`;

    const searchResult = await this.searchTool.execute({ query: newsQuery });
    if (!searchResult.success) {
      return { success: false, output: null, error: searchResult.error || 'Échec de la surveillance' };
    }

    const results: SearchResult[] = searchResult.output?.results || [];

    const news = results.slice(0, 10).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet
    }));

    // Générer un résumé des actualités
    const prompt = `Voici les dernières actualités sur "${topic}":\n\n${
      news.map((n, i) => `${i + 1}. ${n.title}\n${n.snippet}`).join('\n\n')
    }\n\nRésume les points clés et tendances principales en 3-4 paragraphes.`;

    let summary = '';
    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      summary = aiResult.text || '';
    } catch {
      summary = 'Résumé non disponible';
    }

    return {
      success: true,
      output: {
        topic,
        news,
        summary,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Résumé d'une URL ou texte
   */
  private async handleSummarize(urlOrText: string): Promise<AgentExecuteResult> {
    if (!urlOrText) {
      return { success: false, output: null, error: 'URL ou texte requis' };
    }

    let contentToSummarize = '';
    let sourceUrl = '';

    // Vérifier si c'est une URL
    if (urlOrText.startsWith('http://') || urlOrText.startsWith('https://')) {
      const contentResult = await this.contentTool.execute({ url: urlOrText });
      if (!contentResult.success) {
        return { success: false, output: null, error: contentResult.error || 'Impossible de lire l\'URL' };
      }
      contentToSummarize = contentResult.output?.content || contentResult.output?.summary || '';
      sourceUrl = urlOrText;
    } else {
      // C'est du texte direct
      contentToSummarize = urlOrText;
    }

    if (!contentToSummarize) {
      return { success: false, output: null, error: 'Aucun contenu à résumer' };
    }

    // Générer le résumé via LLM
    const prompt = `Résume le texte suivant de manière concise et structurée:\n\n${contentToSummarize.slice(0, 10000)}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});

      return {
        success: true,
        output: {
          source: sourceUrl || 'text',
          originalLength: contentToSummarize.length,
          summary: aiResult.text,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération du résumé'
      };
    }
  }

  /**
   * Génère une synthèse à partir des sources
   */
  private async generateSynthesis(
    query: string,
    sources: Array<{ title: string; url: string; summary: string }>
  ): Promise<string> {
    const sourcesText = sources.map((s, i) =>
      `[Source ${i + 1}] ${s.title}\n${s.summary}`
    ).join('\n\n');

    const prompt = `Tu es un expert en recherche et synthèse d'informations.

Question/Sujet: ${query}

Sources disponibles:
${sourcesText}

Génère une synthèse complète et bien structurée qui:
1. Répond directement à la question/sujet
2. Combine les informations des différentes sources
3. Identifie les points de convergence et divergence
4. Mentionne les sources pertinentes [Source N]
5. Reste factuel et objectif

Synthèse:`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      return aiResult.text || 'Synthèse non disponible';
    } catch {
      // Fallback: concaténer les résumés
      return sources.map(s => s.summary).join('\n\n');
    }
  }
}
