/**
 * SummarizerTool: Résumer du contenu web ou texte
 * Extrait le contenu et génère un résumé
 */

interface ExecuteProps {
  url?: string;
  text?: string;
  maxLength?: number; // Longueur max du résumé en mots
  language?: string;
}

interface ExecuteResult {
  success: boolean;
  output?: SummaryResult | null;
  error?: string | null;
}

interface SummaryResult {
  title?: string;
  source: string;
  summary: string;
  keyPoints: string[];
  wordCount: number;
  readingTime: string;
}

// Extract text from HTML
function extractTextFromHtml(html: string): { title: string; text: string } {
  // Remove scripts and styles
  const cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Get main content (article, main, or body)
  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  
  let content = articleMatch?.[1] || mainMatch?.[1] || cleaned;
  
  // Remove remaining HTML tags
  content = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return { title, text: content };
}

// Simple extractive summarization
function extractiveSummarize(text: string, maxSentences: number = 5): { summary: string; keyPoints: string[] } {
  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500);
  
  if (sentences.length === 0) {
    return { summary: text.slice(0, 500), keyPoints: [] };
  }
  
  // Score sentences based on position and word frequency
  const wordFreq = new Map<string, number>();
  const words = text.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    if (word.length > 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  const scoredSentences = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    let score = 0;
    
    // Word frequency score
    for (const word of sentenceWords) {
      score += wordFreq.get(word) || 0;
    }
    
    // Position score (first and last sentences are often important)
    if (index < 3) score *= 1.5;
    if (index === sentences.length - 1) score *= 1.2;
    
    // Length score (prefer medium-length sentences)
    const idealLength = 20;
    const lengthDiff = Math.abs(sentenceWords.length - idealLength);
    score -= lengthDiff * 0.5;
    
    return { sentence, score, index };
  });
  
  // Sort by score and select top sentences
  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, maxSentences);
  
  // Sort by original position for coherent summary
  topSentences.sort((a, b) => a.index - b.index);
  
  const summary = topSentences.map(s => s.sentence).join('. ') + '.';
  
  // Extract key points (top 3 different sentences)
  const keyPoints = scoredSentences
    .slice(0, 3)
    .map(s => s.sentence.length > 100 ? s.sentence.slice(0, 100) + '...' : s.sentence);
  
  return { summary, keyPoints };
}

// Calculate reading time
function calculateReadingTime(wordCount: number): string {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  
  if (minutes < 1) return 'Moins d\'1 minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

export class SummarizerTool {
  name = 'SummarizerTool';
  description = 'Résumer une page web ou un texte long en points clés.';

  private async fetchUrl(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lisa/1.0; +https://lisa.ai)',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Impossible de charger l'URL: ${response.status}`);
    }
    
    return response.text();
  }

  async execute({ url, text, maxLength = 150 }: ExecuteProps): Promise<ExecuteResult> {
    if (!url && !text) {
      return { success: false, error: 'Une URL ou un texte est requis.', output: null };
    }

    try {
      let content: string;
      let title: string | undefined;
      let source: string;
      
      if (url) {
        // Fetch and extract from URL
        const html = await this.fetchUrl(url);
        const extracted = extractTextFromHtml(html);
        content = extracted.text;
        title = extracted.title;
        source = url;
      } else {
        content = text!;
        source = 'Texte fourni';
      }
      
      if (content.length < 100) {
        return { success: false, error: 'Contenu trop court pour être résumé.', output: null };
      }
      
      // Calculate word count
      const wordCount = content.split(/\s+/).length;
      
      // Generate summary
      const maxSentences = Math.min(Math.ceil(maxLength / 30), 7);
      const { summary, keyPoints } = extractiveSummarize(content, maxSentences);
      
      return {
        success: true,
        output: {
          title,
          source,
          summary,
          keyPoints,
          wordCount,
          readingTime: calculateReadingTime(wordCount),
        },
      };
    } catch (error) {
      console.error('SummarizerTool execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        output: null,
      };
    }
  }

  formatResponse(data: SummaryResult): string {
    let response = '📄 **Résumé**\n\n';
    
    if (data.title) {
      response += `📌 **${data.title}**\n\n`;
    }
    
    response += `${data.summary}\n\n`;
    
    if (data.keyPoints.length > 0) {
      response += '🔑 **Points clés:**\n';
      for (const point of data.keyPoints) {
        response += `• ${point}\n`;
      }
      response += '\n';
    }
    
    response += `📊 ${data.wordCount} mots • ⏱️ ${data.readingTime} de lecture\n`;
    response += `🔗 Source: ${data.source}`;
    
    return response;
  }
}

export const summarizerTool = new SummarizerTool();
