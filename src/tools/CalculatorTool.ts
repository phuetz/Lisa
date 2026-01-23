/**
 * CalculatorTool: Calculs mathématiques avancés
 * Supporte expressions, conversions, et fonctions scientifiques
 */

interface ExecuteProps {
  expression: string;
  precision?: number;
}

interface ExecuteResult {
  success: boolean;
  output?: CalculationResult | null;
  error?: string | null;
}

interface CalculationResult {
  expression: string;
  result: number | string;
  steps?: string[];
  formatted: string;
}

// Safe math evaluation without eval()
function evaluateExpression(expr: string): number {
  // Clean and prepare expression
  const cleaned = expr
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
    .replace(/,/g, '.')
    // Math functions
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/exp\(/g, 'Math.exp(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/floor\(/g, 'Math.floor(')
    .replace(/ceil\(/g, 'Math.ceil(')
    .replace(/round\(/g, 'Math.round(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/pi/g, 'Math.PI')
    .replace(/e(?![xp])/g, 'Math.E')
    // Percentage handling
    .replace(/(\d+)%/g, '($1/100)');

  // Validate - only allow safe characters
  const safePattern = /^[0-9+\-*/().Math,sincoqrtlgexpabflceioundpwPI E]+$/;
  if (!safePattern.test(cleaned)) {
    throw new Error('Expression contient des caractères non autorisés');
  }

  // Evaluate using Function constructor (safer than eval)
  const func = new Function(`"use strict"; return (${cleaned})`);
  const result = func();
  
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Résultat invalide');
  }
  
  return result;
}

// Unit conversions
const CONVERSIONS: Record<string, Record<string, number>> = {
  length: {
    km: 1000,
    m: 1,
    cm: 0.01,
    mm: 0.001,
    mi: 1609.344,
    yd: 0.9144,
    ft: 0.3048,
    in: 0.0254,
  },
  weight: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.453592,
    oz: 0.0283495,
    t: 1000,
  },
  volume: {
    l: 1,
    ml: 0.001,
    gal: 3.78541,
    qt: 0.946353,
    pt: 0.473176,
    cup: 0.236588,
  },
  time: {
    s: 1,
    min: 60,
    h: 3600,
    day: 86400,
    week: 604800,
    month: 2592000,
    year: 31536000,
  },
  data: {
    b: 1,
    kb: 1024,
    mb: 1048576,
    gb: 1073741824,
    tb: 1099511627776,
  },
};

function convertUnits(value: number, from: string, to: string): number | null {
  from = from.toLowerCase();
  to = to.toLowerCase();

  // Temperature special handling
  if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) {
    // Convert to Celsius first
    let celsius: number;
    if (from === 'c') celsius = value;
    else if (from === 'f') celsius = (value - 32) * 5/9;
    else celsius = value - 273.15;

    // Convert from Celsius to target
    if (to === 'c') return celsius;
    if (to === 'f') return celsius * 9/5 + 32;
    return celsius + 273.15;
  }

  // Find conversion category
  for (const category of Object.values(CONVERSIONS)) {
    if (typeof category[from] === 'number' && typeof category[to] === 'number') {
      const baseValue = value * (category[from] as number);
      return baseValue / (category[to] as number);
    }
  }

  return null;
}

function parseConversion(expr: string): { value: number; from: string; to: string } | null {
  // Patterns: "100 km to mi", "50kg en lb", "32°F en °C"
  const patterns = [
    /^([\d.]+)\s*°?(\w+)\s*(?:to|en|in|->|vers)\s*°?(\w+)$/i,
    /^convert\s+([\d.]+)\s*°?(\w+)\s*(?:to|en)\s*°?(\w+)$/i,
  ];

  for (const pattern of patterns) {
    const match = expr.match(pattern);
    if (match) {
      return {
        value: parseFloat(match[1]),
        from: match[2],
        to: match[3],
      };
    }
  }

  return null;
}

// Percentage calculations
function parsePercentage(expr: string): CalculationResult | null {
  // "20% of 150", "150 + 20%", "150 - 20%"
  const ofPattern = /^([\d.]+)%\s*(?:of|de)\s*([\d.]+)$/i;
  const addPattern = /^([\d.]+)\s*\+\s*([\d.]+)%$/;
  const subPattern = /^([\d.]+)\s*-\s*([\d.]+)%$/;

  let match = expr.match(ofPattern);
  if (match) {
    const percent = parseFloat(match[1]);
    const value = parseFloat(match[2]);
    const result = (percent / 100) * value;
    return {
      expression: expr,
      result,
      steps: [`${percent}% × ${value} = ${result}`],
      formatted: `${percent}% de ${value} = **${result}**`,
    };
  }

  match = expr.match(addPattern);
  if (match) {
    const value = parseFloat(match[1]);
    const percent = parseFloat(match[2]);
    const addition = (percent / 100) * value;
    const result = value + addition;
    return {
      expression: expr,
      result,
      steps: [`${value} + ${percent}% = ${value} + ${addition} = ${result}`],
      formatted: `${value} + ${percent}% = **${result}**`,
    };
  }

  match = expr.match(subPattern);
  if (match) {
    const value = parseFloat(match[1]);
    const percent = parseFloat(match[2]);
    const subtraction = (percent / 100) * value;
    const result = value - subtraction;
    return {
      expression: expr,
      result,
      steps: [`${value} - ${percent}% = ${value} - ${subtraction} = ${result}`],
      formatted: `${value} - ${percent}% = **${result}**`,
    };
  }

  return null;
}

export class CalculatorTool {
  name = 'CalculatorTool';
  description = 'Effectuer des calculs mathématiques, conversions d\'unités et pourcentages.';

  async execute({ expression, precision = 6 }: ExecuteProps): Promise<ExecuteResult> {
    if (!expression || typeof expression !== 'string') {
      return { success: false, error: 'Une expression mathématique est requise.', output: null };
    }

    const cleanExpr = expression.trim();

    try {
      // Check for unit conversion
      const conversion = parseConversion(cleanExpr);
      if (conversion) {
        const converted = convertUnits(conversion.value, conversion.from, conversion.to);
        if (converted !== null) {
          const result = Number(converted.toFixed(precision));
          return {
            success: true,
            output: {
              expression: cleanExpr,
              result,
              formatted: `${conversion.value} ${conversion.from} = **${result} ${conversion.to}**`,
            },
          };
        }
        return { success: false, error: `Conversion non supportée: ${conversion.from} vers ${conversion.to}`, output: null };
      }

      // Check for percentage calculation
      const percentage = parsePercentage(cleanExpr);
      if (percentage) {
        percentage.result = Number(Number(percentage.result).toFixed(precision));
        return { success: true, output: percentage };
      }

      // Standard math expression
      const result = evaluateExpression(cleanExpr);
      const roundedResult = Number(result.toFixed(precision));

      return {
        success: true,
        output: {
          expression: cleanExpr,
          result: roundedResult,
          formatted: `${cleanExpr} = **${roundedResult}**`,
        },
      };
    } catch (error) {
      console.error('CalculatorTool execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Expression invalide',
        output: null,
      };
    }
  }

  formatResponse(data: CalculationResult): string {
    let response = `🧮 **Calcul**\n\n`;
    response += data.formatted + '\n';

    if (data.steps && data.steps.length > 0) {
      response += '\n📝 **Étapes:**\n';
      for (const step of data.steps) {
        response += `• ${step}\n`;
      }
    }

    return response;
  }
}

export const calculatorTool = new CalculatorTool();
