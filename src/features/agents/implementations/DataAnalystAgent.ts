/**
 * DataAnalystAgent: Agent d'analyse de données
 * Spécialisé dans l'interprétation de fichiers (CSV, Excel) pour générer des graphiques ou des insights.
 */
import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { aiService } from '../../../services/aiService';

interface DataColumn {
  name: string;
  type: 'number' | 'string' | 'date' | 'boolean';
  values: any[];
}

interface DataStats {
  count: number;
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stdDev?: number;
  nullCount: number;
  uniqueCount: number;
}

interface ColumnAnalysis {
  column: string;
  type: string;
  stats: DataStats;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  data: any[];
  xKey: string;
  yKey: string | string[];
  title: string;
}

interface CorrelationResult {
  column1: string;
  column2: string;
  correlation: number;
}

export class DataAnalystAgent implements BaseAgent {
  name = 'DataAnalystAgent';
  description = 'Agent d\'analyse de données. Interprète CSV/Excel, génère statistiques, graphiques et insights.';
  version = '1.0.0';
  domain: AgentDomain = 'analysis';
  capabilities = [
    'csv_analysis',
    'excel_analysis',
    'statistics',
    'chart_generation',
    'data_insights',
    'correlation_analysis'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, data, csvText, columns, chartType, xColumn, yColumn, question } = props;

    try {
      // Parse data if CSV text provided
      let parsedData = data;
      if (csvText && !data) {
        parsedData = this.parseCSV(csvText);
      }

      if (!parsedData || !Array.isArray(parsedData) || parsedData.length === 0) {
        return {
          success: false,
          output: null,
          error: 'Données requises. Fournissez "data" (array) ou "csvText" (string CSV)'
        };
      }

      switch (intent) {
        case 'analyze':
          return this.handleAnalyze(parsedData, columns);

        case 'visualize':
          return this.handleVisualize(parsedData, chartType, xColumn, yColumn);

        case 'insights':
          return await this.handleInsights(parsedData, question);

        case 'correlations':
          return this.handleCorrelations(parsedData, columns);

        case 'export':
          return this.handleExport(parsedData, props.format || 'json');

        default:
          // Default: full analysis
          return this.handleAnalyze(parsedData, columns);
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
   * Parse CSV text to array of objects
   */
  private parseCSV(csvText: string): Record<string, any>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Detect delimiter
    const delimiter = csvText.includes(';') ? ';' : ',';

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length === headers.length) {
        const row: Record<string, any> = {};
        headers.forEach((header, idx) => {
          let value: any = values[idx];
          // Try to parse as number
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && value.trim() !== '') {
            value = numValue;
          }
          row[header] = value;
        });
        data.push(row);
      }
    }

    return data;
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Analyse statistique complète
   */
  private handleAnalyze(data: Record<string, any>[], columns?: string[]): AgentExecuteResult {
    const columnNames = columns || Object.keys(data[0] || {});
    const analysis: ColumnAnalysis[] = [];

    for (const colName of columnNames) {
      const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined && v !== '');
      const type = this.detectColumnType(values);
      const stats = this.calculateStats(values, type);

      analysis.push({
        column: colName,
        type,
        stats
      });
    }

    // Summary
    const numericColumns = analysis.filter(a => a.type === 'number');
    const categoricalColumns = analysis.filter(a => a.type === 'string');

    return {
      success: true,
      output: {
        rowCount: data.length,
        columnCount: columnNames.length,
        columns: analysis,
        summary: {
          numericColumns: numericColumns.length,
          categoricalColumns: categoricalColumns.length,
          totalNulls: analysis.reduce((sum, a) => sum + a.stats.nullCount, 0)
        }
      },
      metadata: {
        source: 'DataAnalystAgent',
        confidence: 0.95
      }
    };
  }

  /**
   * Detect column type
   */
  private detectColumnType(values: any[]): 'number' | 'string' | 'date' | 'boolean' {
    const sample = values.slice(0, 100);

    // Check for numbers
    const numericCount = sample.filter(v => typeof v === 'number' || !isNaN(parseFloat(v))).length;
    if (numericCount / sample.length > 0.8) return 'number';

    // Check for dates
    const dateCount = sample.filter(v => !isNaN(Date.parse(v))).length;
    if (dateCount / sample.length > 0.8) return 'date';

    // Check for booleans
    const boolValues = ['true', 'false', '1', '0', 'yes', 'no', 'oui', 'non'];
    const boolCount = sample.filter(v => boolValues.includes(String(v).toLowerCase())).length;
    if (boolCount / sample.length > 0.8) return 'boolean';

    return 'string';
  }

  /**
   * Calculate statistics for a column
   */
  private calculateStats(values: any[], type: string): DataStats {
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = values.length - validValues.length;

    const stats: DataStats = {
      count: values.length,
      nullCount,
      uniqueCount: new Set(validValues).size
    };

    if (type === 'number') {
      const numValues = validValues.map(Number).filter(n => !isNaN(n));

      if (numValues.length > 0) {
        stats.mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;
        stats.min = Math.min(...numValues);
        stats.max = Math.max(...numValues);

        // Median
        const sorted = [...numValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        stats.median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

        // Standard deviation
        const squaredDiffs = numValues.map(v => Math.pow(v - stats.mean!, 2));
        stats.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / numValues.length);
      }
    }

    return stats;
  }

  /**
   * Generate chart configuration for Recharts
   */
  private handleVisualize(
    data: Record<string, any>[],
    chartType: string = 'bar',
    xColumn?: string,
    yColumn?: string | string[]
  ): AgentExecuteResult {
    const columns = Object.keys(data[0] || {});

    // Auto-detect columns if not provided
    const xKey = xColumn || columns.find(c => this.detectColumnType(data.map(r => r[c])) === 'string') || columns[0];
    const yKeys = yColumn
      ? (Array.isArray(yColumn) ? yColumn : [yColumn])
      : columns.filter(c => this.detectColumnType(data.map(r => r[c])) === 'number').slice(0, 3);

    if (yKeys.length === 0) {
      return {
        success: false,
        output: null,
        error: 'Aucune colonne numérique trouvée pour la visualisation'
      };
    }

    // Prepare data (aggregate if needed)
    let chartData = data;

    // For categorical x-axis, aggregate
    if (this.detectColumnType(data.map(r => r[xKey])) === 'string') {
      const grouped = new Map<string, Record<string, number>>();

      for (const row of data) {
        const key = String(row[xKey]);
        if (!grouped.has(key)) {
          grouped.set(key, { [xKey]: key } as any);
          yKeys.forEach(y => (grouped.get(key)![y] = 0));
        }
        yKeys.forEach(y => {
          const val = parseFloat(row[y]) || 0;
          grouped.get(key)![y] += val;
        });
      }

      chartData = Array.from(grouped.values());
    }

    // Limit data points for charts
    const maxPoints = chartType === 'pie' ? 10 : 50;
    if (chartData.length > maxPoints) {
      chartData = chartData.slice(0, maxPoints);
    }

    const chartConfig: ChartConfig = {
      type: chartType as ChartConfig['type'],
      data: chartData,
      xKey,
      yKey: yKeys.length === 1 ? yKeys[0] : yKeys,
      title: `${yKeys.join(', ')} par ${xKey}`
    };

    return {
      success: true,
      output: {
        chart: chartConfig,
        rechartsComponent: this.generateRechartsCode(chartConfig)
      }
    };
  }

  /**
   * Generate Recharts component code
   */
  private generateRechartsCode(config: ChartConfig): string {
    const yKeys = Array.isArray(config.yKey) ? config.yKey : [config.yKey];
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

    switch (config.type) {
      case 'bar':
        return `
<BarChart data={data} width={600} height={400}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="${config.xKey}" />
  <YAxis />
  <Tooltip />
  <Legend />
  ${yKeys.map((y, i) => `<Bar dataKey="${y}" fill="${colors[i % colors.length]}" />`).join('\n  ')}
</BarChart>`;

      case 'line':
        return `
<LineChart data={data} width={600} height={400}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="${config.xKey}" />
  <YAxis />
  <Tooltip />
  <Legend />
  ${yKeys.map((y, i) => `<Line type="monotone" dataKey="${y}" stroke="${colors[i % colors.length]}" />`).join('\n  ')}
</LineChart>`;

      case 'pie':
        return `
<PieChart width={400} height={400}>
  <Pie
    data={data}
    dataKey="${yKeys[0]}"
    nameKey="${config.xKey}"
    cx="50%"
    cy="50%"
    outerRadius={150}
    fill="#8884d8"
    label
  >
    {data.map((entry, index) => (
      <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>`;

      case 'area':
        return `
<AreaChart data={data} width={600} height={400}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="${config.xKey}" />
  <YAxis />
  <Tooltip />
  ${yKeys.map((y, i) => `<Area type="monotone" dataKey="${y}" stackId="1" stroke="${colors[i % colors.length]}" fill="${colors[i % colors.length]}" />`).join('\n  ')}
</AreaChart>`;

      case 'scatter':
        return `
<ScatterChart width={600} height={400}>
  <CartesianGrid />
  <XAxis dataKey="${config.xKey}" type="number" />
  <YAxis dataKey="${yKeys[0]}" type="number" />
  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
  <Scatter data={data} fill="#8884d8" />
</ScatterChart>`;

      default:
        return '// Chart type not supported';
    }
  }

  /**
   * Generate insights using LLM
   */
  private async handleInsights(data: Record<string, any>[], question?: string): Promise<AgentExecuteResult> {
    // First get statistical analysis
    const analysisResult = this.handleAnalyze(data);
    if (!analysisResult.success) return analysisResult;

    const analysis = analysisResult.output;

    // Prepare data summary for LLM
    const dataSample = data.slice(0, 5);
    const columnSummary = analysis.columns.map((col: ColumnAnalysis) => {
      if (col.type === 'number') {
        return `- ${col.column}: numérique, moyenne=${col.stats.mean?.toFixed(2)}, min=${col.stats.min}, max=${col.stats.max}`;
      }
      return `- ${col.column}: ${col.type}, ${col.stats.uniqueCount} valeurs uniques`;
    }).join('\n');

    const prompt = `Tu es un expert en analyse de données. Voici un jeu de données:

**Résumé:**
- ${analysis.rowCount} lignes
- ${analysis.columnCount} colonnes

**Colonnes:**
${columnSummary}

**Échantillon (5 premières lignes):**
${JSON.stringify(dataSample, null, 2)}

${question ? `**Question spécifique:** ${question}` : ''}

Génère des insights pertinents:
1. Tendances principales
2. Anomalies ou valeurs aberrantes potentielles
3. Corrélations probables
4. Recommandations pour approfondir l'analyse
${question ? '5. Réponse à la question posée' : ''}`;

    try {
      const aiResult = await aiService.generateResponse(prompt, {});

      return {
        success: true,
        output: {
          statistics: analysis,
          insights: aiResult.text,
          question
        }
      };
    } catch (error) {
      return {
        success: true,
        output: {
          statistics: analysis,
          insights: 'Insights générés automatiquement non disponibles',
          question
        }
      };
    }
  }

  /**
   * Calculate correlations between numeric columns
   */
  private handleCorrelations(data: Record<string, any>[], columns?: string[]): AgentExecuteResult {
    const allColumns = Object.keys(data[0] || {});
    const numericColumns = (columns || allColumns).filter(col =>
      this.detectColumnType(data.map(r => r[col])) === 'number'
    );

    if (numericColumns.length < 2) {
      return {
        success: false,
        output: null,
        error: 'Au moins 2 colonnes numériques requises pour les corrélations'
      };
    }

    const correlations: CorrelationResult[] = [];

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];

        const values1 = data.map(r => parseFloat(r[col1])).filter(v => !isNaN(v));
        const values2 = data.map(r => parseFloat(r[col2])).filter(v => !isNaN(v));

        const correlation = this.pearsonCorrelation(values1, values2);

        correlations.push({
          column1: col1,
          column2: col2,
          correlation: Math.round(correlation * 1000) / 1000
        });
      }
    }

    // Sort by absolute correlation value
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return {
      success: true,
      output: {
        correlations,
        strongPositive: correlations.filter(c => c.correlation > 0.7),
        strongNegative: correlations.filter(c => c.correlation < -0.7)
      }
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Export data in various formats
   */
  private handleExport(data: Record<string, any>[], format: string): AgentExecuteResult {
    switch (format.toLowerCase()) {
      case 'json':
        return {
          success: true,
          output: {
            format: 'json',
            content: JSON.stringify(data, null, 2),
            mimeType: 'application/json'
          }
        };

      case 'csv': {
        const headers = Object.keys(data[0] || {});
        const csvRows = [
          headers.join(','),
          ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
        ];
        return {
          success: true,
          output: {
            format: 'csv',
            content: csvRows.join('\n'),
            mimeType: 'text/csv'
          }
        };
      }

      case 'markdown': {
        const mdHeaders = Object.keys(data[0] || {});
        const mdTable = [
          `| ${mdHeaders.join(' | ')} |`,
          `| ${mdHeaders.map(() => '---').join(' | ')} |`,
          ...data.slice(0, 100).map(row => `| ${mdHeaders.map(h => row[h] ?? '').join(' | ')} |`)
        ];
        return {
          success: true,
          output: {
            format: 'markdown',
            content: mdTable.join('\n'),
            mimeType: 'text/markdown'
          }
        };
      }

      default:
        return {
          success: false,
          output: null,
          error: `Format non supporté: ${format}. Utilisez: json, csv, markdown`
        };
    }
  }
}
