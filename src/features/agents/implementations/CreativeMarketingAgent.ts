/**
 * CreativeMarketingAgent: Agent créatif et marketing
 * Optimisé pour la génération de contenu structuré (copywriting, planning social media).
 */
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { aiService } from '../../../services/aiService';

interface SocialMediaPost {
  platform: string;
  content: string;
  hashtags: string[];
  characterCount: number;
  maxCharacters: number;
  mediaType?: 'image' | 'video' | 'carousel' | 'text';
  bestTime?: string;
}

interface EmailCampaign {
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  ctaUrl?: string;
}

interface ContentCalendarItem {
  date: string;
  platform: string;
  type: string;
  topic: string;
  content: string;
  status: 'draft' | 'scheduled' | 'published';
}

interface CopywritingResult {
  headline: string;
  subheadline?: string;
  body: string;
  cta: string;
  variations?: string[];
}

const PLATFORM_LIMITS: Record<string, { maxChars: number; bestTimes: string[] }> = {
  twitter: { maxChars: 280, bestTimes: ['9h', '12h', '17h'] },
  linkedin: { maxChars: 3000, bestTimes: ['8h', '10h', '12h'] },
  instagram: { maxChars: 2200, bestTimes: ['11h', '14h', '19h'] },
  facebook: { maxChars: 63206, bestTimes: ['9h', '13h', '16h'] },
  tiktok: { maxChars: 2200, bestTimes: ['12h', '15h', '21h'] },
  threads: { maxChars: 500, bestTimes: ['9h', '12h', '18h'] }
};

export class CreativeMarketingAgent implements BaseAgent {
  name = 'CreativeMarketingAgent';
  description = 'Agent créatif et marketing. Génère du copywriting, des posts social media et des plannings de contenu.';
  version = '1.0.0';
  domain: AgentDomain = 'productivity';
  capabilities = [
    'copywriting',
    'social_media_posts',
    'email_campaigns',
    'content_calendar',
    'headline_generation',
    'hashtag_suggestions'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, topic, platform, platforms, tone, audience, product, startDate, weeks, language = 'fr' } = props;

    try {
      switch (intent) {
        case 'copywriting':
          return await this.handleCopywriting(props);

        case 'socialMedia':
          return await this.handleSocialMedia(topic, platform || platforms, tone, audience, language);

        case 'emailCampaign':
          return await this.handleEmailCampaign(props);

        case 'contentCalendar':
          return await this.handleContentCalendar(topic, platforms, startDate, weeks || 4, language);

        case 'headlines':
          return await this.handleHeadlines(topic || product, audience, tone, language);

        case 'hashtags':
          return await this.handleHashtags(topic, platform, language);

        default:
          if (topic) {
            // Default: generate social media posts
            return await this.handleSocialMedia(topic, platform || ['twitter', 'linkedin', 'instagram'], tone, audience, language);
          }
          return {
            success: false,
            output: null,
            error: 'Intent non reconnu. Utilisez: copywriting, socialMedia, emailCampaign, contentCalendar, headlines, hashtags'
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
   * Génère du copywriting marketing
   */
  private async handleCopywriting(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { topic, product, audience, tone = 'professionnel', format = 'landing_page', language = 'fr' } = props;

    const subject = topic || product;
    if (!subject) {
      return { success: false, output: null, error: 'Sujet ou produit requis' };
    }

    const prompt = `Tu es un expert en copywriting marketing. Génère du contenu persuasif.

**Sujet/Produit:** ${subject}
**Audience cible:** ${audience || 'Grand public'}
**Ton:** ${tone}
**Format:** ${format}
**Langue:** ${language}

Génère:
1. Un titre accrocheur (headline)
2. Un sous-titre explicatif
3. Un corps de texte persuasif (3-4 paragraphes)
4. Un appel à l'action (CTA) fort
5. 3 variations du titre

Utilise les techniques de copywriting:
- AIDA (Attention, Intérêt, Désir, Action)
- Bénéfices avant fonctionnalités
- Preuve sociale si pertinent
- Urgence ou rareté si approprié

Réponds en JSON valide avec cette structure:
{
  "headline": "...",
  "subheadline": "...",
  "body": "...",
  "cta": "...",
  "variations": ["...", "...", "..."]
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});

      // Parse JSON response
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result: CopywritingResult = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: result
        };
      }

      // Fallback: return raw text
      return {
        success: true,
        output: {
          headline: 'Titre à extraire',
          body: aiResult.text,
          cta: 'En savoir plus'
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération du copywriting'
      };
    }
  }

  /**
   * Génère des posts pour réseaux sociaux
   */
  private async handleSocialMedia(
    topic: string,
    platforms: string | string[],
    tone?: string,
    audience?: string,
    language: string = 'fr'
  ): Promise<AgentExecuteResult> {
    if (!topic) {
      return { success: false, output: null, error: 'Sujet requis' };
    }

    const platformList = Array.isArray(platforms) ? platforms : [platforms || 'twitter'];
    const posts: SocialMediaPost[] = [];

    for (const platform of platformList) {
      const platformLower = platform.toLowerCase();
      const limits = PLATFORM_LIMITS[platformLower] || { maxChars: 500, bestTimes: ['12h'] };

      const prompt = `Génère un post ${platformLower} sur le sujet: "${topic}"

**Contraintes:**
- Maximum ${limits.maxChars} caractères
- Ton: ${tone || 'engageant et professionnel'}
- Audience: ${audience || 'Grand public'}
- Langue: ${language}
- Inclus 3-5 hashtags pertinents

**Style par plateforme:**
${platformLower === 'twitter' ? '- Court, percutant, emojis modérés' : ''}
${platformLower === 'linkedin' ? '- Professionnel, valeur ajoutée, histoire ou insight' : ''}
${platformLower === 'instagram' ? '- Visuel, emojis, storytelling, CTA engagement' : ''}
${platformLower === 'facebook' ? '- Conversationnel, question, engagement communauté' : ''}
${platformLower === 'tiktok' ? '- Tendance, authentique, hook accrocheur' : ''}

Réponds en JSON:
{
  "content": "Le texte du post",
  "hashtags": ["hashtag1", "hashtag2"],
  "mediaType": "image|video|carousel|text"
}`;

      try {
        const aiResult = await aiService.generateResponse(prompt, {});
        const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          posts.push({
            platform: platformLower,
            content: parsed.content,
            hashtags: parsed.hashtags || [],
            characterCount: parsed.content.length,
            maxCharacters: limits.maxChars,
            mediaType: parsed.mediaType || 'text',
            bestTime: limits.bestTimes[0]
          });
        }
      } catch {
        posts.push({
          platform: platformLower,
          content: `Post sur ${topic} - Erreur de génération`,
          hashtags: [],
          characterCount: 0,
          maxCharacters: limits.maxChars
        });
      }
    }

    return {
      success: true,
      output: {
        topic,
        posts,
        generatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Génère une campagne email
   */
  private async handleEmailCampaign(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { topic, product, audience, tone = 'professionnel', goal, ctaUrl, language = 'fr' } = props;

    const subject = topic || product;
    if (!subject) {
      return { success: false, output: null, error: 'Sujet ou produit requis' };
    }

    const prompt = `Tu es un expert en email marketing. Génère une campagne email complète.

**Sujet:** ${subject}
**Objectif:** ${goal || 'Engagement et conversion'}
**Audience:** ${audience || 'Clients existants'}
**Ton:** ${tone}
**Langue:** ${language}

Génère:
1. Ligne d'objet accrocheuse (max 50 caractères)
2. Preheader (aperçu, max 100 caractères)
3. Corps de l'email (introduction, valeur, preuve, CTA)
4. Appel à l'action principal
5. 2 variations de l'objet pour A/B testing

Structure le corps avec:
- Accroche personnalisée
- Problème ou opportunité
- Solution ou bénéfice
- Preuve sociale ou garantie
- CTA clair

Réponds en JSON:
{
  "subject": "...",
  "subjectVariations": ["...", "..."],
  "preheader": "...",
  "body": "...",
  "cta": "...",
  "ctaUrl": "${ctaUrl || 'https://...'}"
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: result as EmailCampaign & { subjectVariations: string[] }
        };
      }

      return {
        success: true,
        output: {
          subject: 'Sujet à définir',
          preheader: '',
          body: aiResult.text,
          cta: 'En savoir plus'
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération de l\'email'
      };
    }
  }

  /**
   * Génère un calendrier de contenu
   */
  private async handleContentCalendar(
    topic: string,
    platforms?: string[],
    startDate?: string,
    weeks: number = 4,
    language: string = 'fr'
  ): Promise<AgentExecuteResult> {
    if (!topic) {
      return { success: false, output: null, error: 'Sujet requis' };
    }

    const platformList = platforms || ['twitter', 'linkedin', 'instagram'];
    const start = startDate ? new Date(startDate) : new Date();
    const calendar: ContentCalendarItem[] = [];

    // Generate content ideas for each week
    const prompt = `Tu es un expert en stratégie de contenu social media.

**Thème principal:** ${topic}
**Plateformes:** ${platformList.join(', ')}
**Durée:** ${weeks} semaines
**Langue:** ${language}

Génère un calendrier de contenu avec:
- 3-4 posts par semaine par plateforme
- Variété de formats (éducatif, inspirant, promotionnel, engagement)
- Thèmes cohérents mais variés
- Progression narrative sur les semaines

Pour chaque semaine, propose:
- 1 contenu éducatif/informatif
- 1 contenu engagement/question
- 1 contenu inspirant/témoignage
- 1 contenu promotionnel (si pertinent)

Réponds en JSON avec cette structure:
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Thème de la semaine",
      "content": [
        {
          "day": "Lundi",
          "platform": "linkedin",
          "type": "éducatif",
          "topic": "...",
          "contentIdea": "..."
        }
      ]
    }
  ]
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Transform to flat calendar
        const dayOffsets: Record<string, number> = {
          'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3, 'vendredi': 4, 'samedi': 5, 'dimanche': 6,
          'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3, 'friday': 4, 'saturday': 5, 'sunday': 6
        };

        for (const week of parsed.weeks || []) {
          const weekStart = new Date(start);
          weekStart.setDate(weekStart.getDate() + (week.weekNumber - 1) * 7);

          for (const item of week.content || []) {
            const dayOffset = dayOffsets[item.day?.toLowerCase()] || 0;
            const itemDate = new Date(weekStart);
            itemDate.setDate(itemDate.getDate() + dayOffset);

            calendar.push({
              date: itemDate.toISOString().split('T')[0],
              platform: item.platform,
              type: item.type,
              topic: item.topic,
              content: item.contentIdea,
              status: 'draft'
            });
          }
        }
      }

      return {
        success: true,
        output: {
          topic,
          platforms: platformList,
          startDate: start.toISOString().split('T')[0],
          weeks,
          calendar: calendar.sort((a, b) => a.date.localeCompare(b.date)),
          totalPosts: calendar.length
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération du calendrier'
      };
    }
  }

  /**
   * Génère des titres/headlines
   */
  private async handleHeadlines(
    topic: string,
    audience?: string,
    tone?: string,
    language: string = 'fr'
  ): Promise<AgentExecuteResult> {
    if (!topic) {
      return { success: false, output: null, error: 'Sujet requis' };
    }

    const prompt = `Génère 10 titres accrocheurs pour: "${topic}"

**Audience:** ${audience || 'Grand public'}
**Ton:** ${tone || 'Engageant'}
**Langue:** ${language}

Utilise différentes formules:
- Question intrigante
- Chiffre + bénéfice
- "Comment..."
- Urgence/FOMO
- Curiosité/mystère
- Bénéfice direct
- Négatif inversé ("N'achetez pas avant de...")
- Liste ("5 secrets pour...")
- Défi ("Pouvez-vous...")
- Témoignage

Réponds en JSON:
{
  "headlines": [
    {"text": "...", "formula": "question", "strength": "forte|moyenne|faible"},
    ...
  ]
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            topic,
            headlines: parsed.headlines
          }
        };
      }

      return {
        success: true,
        output: {
          topic,
          headlines: [{ text: aiResult.text, formula: 'raw', strength: 'moyenne' }]
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération des titres'
      };
    }
  }

  /**
   * Génère des hashtags pertinents
   */
  private async handleHashtags(
    topic: string,
    platform?: string,
    language: string = 'fr'
  ): Promise<AgentExecuteResult> {
    if (!topic) {
      return { success: false, output: null, error: 'Sujet requis' };
    }

    const prompt = `Génère des hashtags pertinents pour: "${topic}"

**Plateforme:** ${platform || 'Tous réseaux'}
**Langue:** ${language}

Catégorise les hashtags:
1. **Populaires** (haute visibilité, forte compétition)
2. **Niche** (audience ciblée, moins de compétition)
3. **Marque/Unique** (différenciation)
4. **Tendance** (actualité si pertinent)

Réponds en JSON:
{
  "hashtags": {
    "popular": ["#hashtag1", "#hashtag2"],
    "niche": ["#hashtag3", "#hashtag4"],
    "brand": ["#hashtag5"],
    "trending": ["#hashtag6"]
  },
  "recommended": ["Les 5-7 meilleurs à utiliser ensemble"],
  "tips": "Conseil d'utilisation"
}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});
      const jsonMatch = aiResult.text?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          output: {
            topic,
            platform,
            ...parsed
          }
        };
      }

      return {
        success: true,
        output: {
          topic,
          hashtags: { popular: [], niche: [], brand: [], trending: [] },
          recommended: [],
          tips: aiResult.text
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: 'Erreur lors de la génération des hashtags'
      };
    }
  }
}
