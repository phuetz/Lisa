/**
 * Artifact Parser
 * Détecte et extrait les artefacts des messages du chat
 */

import type { ArtifactType, ArtifactData, ArtifactFile } from '../components/chat/Artifact';

interface ParsedContent {
  text: string;
  artifacts: ArtifactData[];
}

// File extension to language mapping
const EXT_TO_LANGUAGE: Record<string, string> = {
  jsx: 'javascript',
  tsx: 'typescript',
  js: 'javascript',
  ts: 'typescript',
  css: 'css',
  html: 'html',
  py: 'python',
  json: 'json',
};

// Patterns pour détecter les artefacts
const ARTIFACT_PATTERNS = [
  // Format explicite: ```artifact:type title
  {
    regex: /```artifact:(\w+)\s+([^\n]+)\n([\s\S]*?)```/g,
    handler: (match: RegExpExecArray): ArtifactData | null => {
      const type = match[1].toLowerCase() as ArtifactType;
      const title = match[2].trim();
      const code = match[3].trim();
      return createArtifact(type, title, code);
    },
  },
  // Format React/JSX complet avec ReactDOM.render ou createRoot
  {
    regex: /```(?:jsx|react)\n([\s\S]*?(?:ReactDOM\.render|createRoot)[\s\S]*?)```/g,
    handler: (match: RegExpExecArray): ArtifactData | null => {
      const code = match[1].trim();
      return createArtifact('react', 'React Component', code);
    },
  },
  // Format HTML complet (avec <!DOCTYPE ou <html)
  {
    regex: /```html\n(<!DOCTYPE[\s\S]*?)```/gi,
    handler: (match: RegExpExecArray): ArtifactData | null => {
      const code = match[1].trim();
      return createArtifact('html', 'HTML Page', code);
    },
  },
  // Format SVG
  {
    regex: /```svg\n(<svg[\s\S]*?<\/svg>)```/gi,
    handler: (match: RegExpExecArray): ArtifactData | null => {
      const code = match[1].trim();
      return createArtifact('svg', 'SVG Image', code);
    },
  },
  // Format Mermaid
  {
    regex: /```mermaid\n([\s\S]*?)```/g,
    handler: (match: RegExpExecArray): ArtifactData | null => {
      const code = match[1].trim();
      return createArtifact('mermaid', 'Diagram', code);
    },
  },
  // Python avec print ou classes
  {
    regex: /```python\n([\s\S]*?(?:print|class |def |import )[\s\S]*?)```/g,
    handler: (match: RegExpExecArray): ArtifactData | null => {
      const code = match[1].trim();
      if (code.length > 100) { // Only for substantial code
        return createArtifact('python', 'Python Script', code);
      }
      return null;
    },
  },
];

// Map type to Monaco language
const TYPE_TO_LANGUAGE: Record<ArtifactType, string> = {
  html: 'html',
  react: 'javascript',
  javascript: 'javascript',
  typescript: 'typescript',
  css: 'css',
  python: 'python',
  svg: 'xml',
  mermaid: 'markdown',
};

function createArtifact(type: ArtifactType, title: string, code: string): ArtifactData {
  return {
    id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    title,
    code,
    language: TYPE_TO_LANGUAGE[type] || 'plaintext',
  };
}

/**
 * Detect file name from code comment (e.g., "// filename.jsx" or CSS block comments)
 */
function extractFileName(code: string): string | null {
  const patterns = [
    /^\/\/\s*(\S+\.\w+)\s*$/m,           // // filename.jsx
    /^\/\*\s*(\S+\.\w+)\s*\*\/\s*$/m,    // /* filename.css */
    /^#\s*(\S+\.\w+)\s*$/m,              // # filename.py
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get language from file extension
 */
function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_LANGUAGE[ext] || 'plaintext';
}

/**
 * Parse un message et extrait les artefacts
 * Supporte les artefacts multi-fichiers
 */
export function parseArtifacts(content: string): ParsedContent {
  const artifacts: ArtifactData[] = [];
  let remainingText = content;

  // First, try to detect multi-file patterns (multiple code blocks with file names)
  const multiFileRegex = /```(\w+)\n(\/\/\s*\S+\.\w+[\s\S]*?)```/g;
  const potentialFiles: ArtifactFile[] = [];
  let multiFileMatch: RegExpExecArray | null;
  const multiFileMatches: string[] = [];
  
  while ((multiFileMatch = multiFileRegex.exec(content)) !== null) {
    const code = multiFileMatch[2].trim();
    const fileName = extractFileName(code);
    if (fileName) {
      potentialFiles.push({
        name: fileName,
        code: code,
        language: getLanguageFromFileName(fileName),
      });
      multiFileMatches.push(multiFileMatch[0]);
    }
  }
  
  // If we found multiple files, group them into one artifact
  if (potentialFiles.length > 1) {
    const mainFile = potentialFiles[0];
    const isReact = potentialFiles.some(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx'));
    
    const multiArtifact: ArtifactData = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: isReact ? 'react' : 'javascript',
      title: mainFile.name.replace(/\.\w+$/, ''),
      code: mainFile.code,
      language: mainFile.language,
      files: potentialFiles,
    };
    
    artifacts.push(multiArtifact);
    
    // Remove all matched blocks from remaining text
    for (const matchStr of multiFileMatches) {
      remainingText = remainingText.replace(matchStr, '');
    }
    remainingText = remainingText.replace(/\n{3,}/g, '\n\n');
    remainingText += `\n[📦 Artefact: ${multiArtifact.title} (${potentialFiles.length} fichiers)]\n`;
  }

  // Then apply single-file patterns
  for (const pattern of ARTIFACT_PATTERNS) {
    let match: RegExpExecArray | null;
    const newRegex = new RegExp(pattern.regex.source, pattern.regex.flags);
    
    while ((match = newRegex.exec(content)) !== null) {
      // Skip if already captured as multi-file
      if (multiFileMatches.includes(match[0])) continue;
      
      const artifact = pattern.handler(match);
      if (artifact) {
        artifacts.push(artifact);
        // Replace artifact code block with placeholder
        remainingText = remainingText.replace(
          match[0],
          `\n[📦 Artefact: ${artifact.title}]\n`
        );
      }
    }
  }

  return {
    text: remainingText.trim(),
    artifacts,
  };
}

/**
 * Détecte si un message contient des artefacts potentiels
 */
export function hasArtifacts(content: string): boolean {
  return ARTIFACT_PATTERNS.some(pattern => pattern.regex.test(content));
}

/**
 * Crée un artefact manuellement
 */
export function createManualArtifact(
  type: ArtifactType,
  title: string,
  code: string
): ArtifactData {
  return createArtifact(type, title, code);
}

export type { ArtifactData, ArtifactType };
