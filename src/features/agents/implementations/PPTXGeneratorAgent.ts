/**
 * PPTX Generator Agent
 * Creates PowerPoint presentations using pptxgenjs.
 * Lazy-loads pptxgenjs to avoid impacting bundle size (~40KB).
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../core/types';

export class PPTXGeneratorAgent implements BaseAgent {
  name = 'PPTXGeneratorAgent';
  description = 'Génère des présentations PowerPoint (PPTX) à partir de données structurées';
  version = '1.0.0';
  domain = 'utility';
  capabilities = ['generate_pptx'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { parameters } = props;
    const title = parameters?.title as string;
    const author = (parameters?.author as string) || 'Lisa';
    const slides = parameters?.slides as Array<{ title: string; bullets: string[] }> | undefined;

    if (!title || !slides?.length) {
      return {
        success: false,
        output: null,
        error: 'Les paramètres "title" et "slides" (array de {title, bullets[]}) sont requis',
      };
    }

    try {
      const PptxGenJS = (await import(/* @vite-ignore */ 'pptxgenjs')).default;
      const pptx = new PptxGenJS();

      pptx.author = author;
      pptx.title = title;
      pptx.subject = title;

      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(title, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 2,
        fontSize: 36,
        bold: true,
        color: '1a1a2e',
        align: 'center',
      });
      titleSlide.addText(`Par ${author}`, {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 1,
        fontSize: 18,
        color: '666666',
        align: 'center',
      });

      // Content slides
      for (const slide of slides) {
        const s = pptx.addSlide();
        s.addText(slide.title, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 1,
          fontSize: 28,
          bold: true,
          color: '1a1a2e',
        });

        if (slide.bullets?.length) {
          const bulletText = slide.bullets.map(b => ({
            text: b,
            options: { bullet: true, fontSize: 16, color: '333333', breakLine: true },
          }));
          s.addText(bulletText as Parameters<typeof s.addText>[0], {
            x: 0.5,
            y: 1.5,
            w: 9,
            h: 4,
            valign: 'top',
          });
        }
      }

      // Generate and download
      const fileName = `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.pptx`;
      await pptx.writeFile({ fileName });

      return {
        success: true,
        output: {
          fileName,
          slideCount: slides.length + 1, // +1 for title slide
          message: `Présentation "${title}" générée avec ${slides.length + 1} slides`,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: `Erreur de génération PPTX: ${(error as Error).message}`,
      };
    }
  }
}
