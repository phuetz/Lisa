/**
 * Notebook Utilities
 */

export interface CodeBlock {
  language: string;
  code: string;
  title?: string;
}

/**
 * Extract code blocks from markdown content
 */
export function extractCodeBlocks(content: string): CodeBlock[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: CodeBlock[] = [];
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] || 'python';
    const code = match[2].trim();
    
    if (code.length > 10) {
      blocks.push({ language, code });
    }
  }

  return blocks;
}

/**
 * Check if a message looks like a code generation request
 */
export function isCodeRequest(message: string): boolean {
  const codeKeywords = [
    'code', 'script', 'programme', 'python', 'javascript',
    'fonction', 'function', 'algorithm', 'algorithme',
    'calcul', 'génère', 'generate', 'écris', 'write',
    'créer', 'create', 'implémenter', 'implement'
  ];
  
  const lowerMessage = message.toLowerCase();
  return codeKeywords.some(keyword => lowerMessage.includes(keyword));
}
