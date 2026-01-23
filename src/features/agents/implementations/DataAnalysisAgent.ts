/**
 * DataAnalysisAgent - Data Analysis and Visualization
 * 
 * Performs statistical analysis, generates visualizations, and identifies trends
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentDomain } from '../core/types';
import { AgentDomains } from '../core/types';

export class DataAnalysisAgent implements BaseAgent {
  name = 'DataAnalysisAgent';
  description = 'Performs data analysis with statistics, visualizations, and trend detection';
  version = '1.0.0';
  domain: AgentDomain = AgentDomains.ANALYSIS;
  capabilities = [
    'statistical_analysis',
    'data_visualization',
    'trend_detection',
    'correlation_analysis',
    'data_summarization',
    'outlier_detection'
  ];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const { intent, parameters } = props;

    try {
      switch (intent) {
        case 'analyze_data':
          return await this.analyzeData(parameters);
        case 'calculate_statistics':
          return await this.calculateStatistics(parameters);
        case 'detect_trends':
          return await this.detectTrends(parameters);
        case 'find_correlations':
          return await this.findCorrelations(parameters);
        case 'detect_outliers':
          return await this.detectOutliers(parameters);
        case 'summarize_dataset':
          return await this.summarizeDataset(parameters);
        default:
          return {
            success: false,
            output: null,
            error: `Unknown intent: ${intent}`,
            metadata: { executionTime: Date.now() - startTime, timestamp: Date.now() }
          };
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: { executionTime: Date.now() - startTime, timestamp: Date.now() }
      };
    }
  }

  private async analyzeData(params: any): Promise<AgentExecuteResult> {
    const { data, analysisType: _analysisType = 'comprehensive' } = params;
    if (!data || !Array.isArray(data)) {
      return { success: false, output: null, error: 'Invalid data array' };
    }

    const stats = this.calculateBasicStats(data);
    const trends = this.identifyTrends(data);

    return {
      success: true,
      output: { statistics: stats, trends, dataPoints: data.length },
      metadata: { source: 'DataAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async calculateStatistics(params: any): Promise<AgentExecuteResult> {
    const { data } = params;
    if (!data || !Array.isArray(data)) {
      return { success: false, output: null, error: 'Invalid data array' };
    }

    const stats = this.calculateBasicStats(data);
    return {
      success: true,
      output: stats,
      metadata: { source: 'DataAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async detectTrends(params: any): Promise<AgentExecuteResult> {
    const { data } = params;
    if (!data || !Array.isArray(data)) {
      return { success: false, output: null, error: 'Invalid data array' };
    }

    const trends = this.identifyTrends(data);
    return {
      success: true,
      output: trends,
      metadata: { source: 'DataAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async findCorrelations(params: any): Promise<AgentExecuteResult> {
    const { dataX, dataY } = params;
    if (!dataX || !dataY || dataX.length !== dataY.length) {
      return { success: false, output: null, error: 'Invalid or mismatched data arrays' };
    }

    const correlation = this.calculateCorrelation(dataX, dataY);
    return {
      success: true,
      output: {
        correlation,
        strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
        direction: correlation > 0 ? 'positive' : 'negative'
      },
      metadata: { source: 'DataAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async detectOutliers(params: any): Promise<AgentExecuteResult> {
    const { data } = params;
    if (!data || !Array.isArray(data)) {
      return { success: false, output: null, error: 'Invalid data array' };
    }

    const outliers = this.findOutliers(data);
    return {
      success: true,
      output: { outliers, count: outliers.length },
      metadata: { source: 'DataAnalysisAgent', timestamp: Date.now() }
    };
  }

  private async summarizeDataset(params: any): Promise<AgentExecuteResult> {
    const { data } = params;
    if (!data || !Array.isArray(data)) {
      return { success: false, output: null, error: 'Invalid data array' };
    }

    const summary = {
      count: data.length,
      ...this.calculateBasicStats(data),
      distribution: this.analyzeDistribution(data)
    };

    return {
      success: true,
      output: summary,
      metadata: { source: 'DataAnalysisAgent', timestamp: Date.now() }
    };
  }

  private calculateBasicStats(data: number[]): any {
    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / data.length;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;

    return {
      min: Math.min(...data),
      max: Math.max(...data),
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev: Math.sqrt(variance),
      sum
    };
  }

  private identifyTrends(data: number[]): any {
    if (data.length < 2) return { trend: 'insufficient_data' };

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((avgSecond - avgFirst) / avgFirst) * 100;

    return {
      trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      changePercent: change.toFixed(2)
    };
  }

  private calculateCorrelation(dataX: number[], dataY: number[]): number {
    const n = dataX.length;
    const meanX = dataX.reduce((a, b) => a + b, 0) / n;
    const meanY = dataY.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = dataX[i] - meanX;
      const dy = dataY[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    return num / Math.sqrt(denX * denY);
  }

  private findOutliers(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.filter(val => val < lowerBound || val > upperBound);
  }

  private analyzeDistribution(data: number[]): any {
    const stats = this.calculateBasicStats(data);
    const skewness = this.calculateSkewness(data, stats.mean, stats.stdDev);

    return {
      type: Math.abs(skewness) < 0.5 ? 'normal' : skewness > 0 ? 'right-skewed' : 'left-skewed',
      skewness
    };
  }

  private calculateSkewness(data: number[], mean: number, stdDev: number): number {
    const n = data.length;
    const sum = data.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  async canHandle(query: string, _context?: unknown): Promise<number> {
    const keywords = [
      'data', 'analyze', 'statistics', 'trend', 'correlation',
      'chart', 'graph', 'visualization', 'dataset', 'outlier',
      'données', 'analyser', 'statistique', 'tendance', 'graphique'
    ];

    const lowerQuery = query.toLowerCase();
    const matches = keywords.filter(keyword => lowerQuery.includes(keyword));
    return matches.length > 0 ? Math.min(matches.length * 0.3, 1.0) : 0.0;
  }
}
