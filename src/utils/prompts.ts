/**
 * Prompt Variable Processing
 * Substitutes template variables in system prompts.
 * Adapted from PromptCommander.
 */

const AUTO_VARS = ['date', 'time', 'datetime', 'os', 'clipboard'];

/**
 * Process prompt template variables.
 * Built-in: {{date}}, {{time}}, {{datetime}}, {{os}}, {{clipboard}}
 * Custom: {{key}} from values map
 */
export async function processPromptVariables(
  text: string,
  values?: Record<string, string>,
): Promise<string> {
  if (!text.includes('{{')) return text;

  let result = text;

  // Built-in variables
  result = result.replace(/\{\{date\}\}/gi, new Date().toLocaleDateString('fr-FR'));
  result = result.replace(/\{\{time\}\}/gi, new Date().toLocaleTimeString('fr-FR'));
  result = result.replace(/\{\{datetime\}\}/gi, new Date().toLocaleString('fr-FR'));
  result = result.replace(/\{\{os\}\}/gi, navigator?.platform || 'unknown');

  // Clipboard (async, requires permission)
  if (result.includes('{{clipboard}}')) {
    try {
      const clipText = await navigator.clipboard.readText();
      result = result.replace(/\{\{clipboard\}\}/gi, clipText);
    } catch {
      result = result.replace(/\{\{clipboard\}\}/gi, '(presse-papier inaccessible)');
    }
  }

  // User-defined variables (safe string replacement)
  if (values) {
    for (const [key, value] of Object.entries(values)) {
      // Use split+join instead of regex on user input to prevent ReDoS
      result = result.split(`{{${key}}}`).join(value);
    }
  }

  return result;
}

/**
 * Extract variable names from a template string.
 * Returns unique names excluding auto-variables.
 */
export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  const names = matches.map(m => m.slice(2, -2));
  const unique = [...new Set(names)];
  return unique.filter(n => !AUTO_VARS.includes(n.toLowerCase()));
}
