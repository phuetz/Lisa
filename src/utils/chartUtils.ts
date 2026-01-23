/**
 * Chart utilities for parsing and validating chart data
 */

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title?: string;
  data: Array<Record<string, string | number>>;
  xKey?: string;
  yKey?: string | string[];
  colors?: string[];
}

/**
 * Parse chart data from a code block
 * Expected format: ```chart or ```json with chart structure
 * Handles common LLM formatting issues like numeric separators (2_148)
 */
export const parseChartData = (content: string): ChartData | null => {
  try {
    // Clean up common LLM formatting issues
    let cleanContent = content.trim();
    
    // Debug: log what we're trying to parse
    console.log('[parseChartData] Attempting to parse:', cleanContent.substring(0, 100));
    
    // Remove JavaScript-style comments (// comment)
    cleanContent = cleanContent.replace(/\/\/[^\n]*/g, '');
    
    // Remove numeric separators (e.g., 2_148 -> 2148)
    cleanContent = cleanContent.replace(/(\d)_(\d)/g, '$1$2');
    
    // Remove spaces in numbers (e.g., 21 433 -> 21433)
    cleanContent = cleanContent.replace(/(\d)\s+(\d)/g, '$1$2');
    
    // Remove trailing commas before } or ]
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
    
    const parsed = JSON.parse(cleanContent);
    
    // Validate required fields
    if (!parsed.type || !parsed.data || !Array.isArray(parsed.data)) {
      return null;
    }
    
    // Validate chart type
    if (!['line', 'bar', 'pie', 'area'].includes(parsed.type)) {
      return null;
    }
    
    return parsed as ChartData;
  } catch (e) {
    console.warn('[parseChartData] Failed to parse:', e);
    return null;
  }
};

export const DEFAULT_CHART_COLORS = [
  '#10a37f', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];
