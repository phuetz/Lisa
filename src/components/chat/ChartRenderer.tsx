/**
 * ChartRenderer Component
 * Renders charts from structured data in chat messages
 * Uses fixed dimensions to avoid ResponsiveContainer re-render loops during streaming
 */

import React, { useMemo, memo, useRef, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import { type ChartData, DEFAULT_CHART_COLORS } from '../../utils/chartUtils';

interface ChartRendererProps {
  chartData: ChartData;
}

// Fixed chart dimensions to avoid re-render loops
const CHART_WIDTH = 550;
const CHART_HEIGHT = 250;

const ChartRendererComponent: React.FC<ChartRendererProps> = ({ chartData }) => {
  const { type, title, data, xKey, yKey, colors = DEFAULT_CHART_COLORS } = chartData;
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);

  // Delay rendering to avoid re-render loops during streaming
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setIsReady(true);
      }
    }, 100);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);
  
  // Memoize computed values to prevent re-renders
  const { actualXKey, actualYKeys } = useMemo(() => {
    const keys = data.length > 0 ? Object.keys(data[0]) : [];
    const xk = xKey || keys[0] || 'name';
    const yk = yKey 
      ? (Array.isArray(yKey) ? yKey : [yKey])
      : keys.filter(k => k !== xk && typeof data[0]?.[k] === 'number');
    return { actualXKey: xk, actualYKeys: yk };
  }, [data, xKey, yKey]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1a1a26',
    borderRadius: '12px',
    padding: '16px',
    marginTop: '16px',
    marginBottom: '16px',
    overflow: 'hidden'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '12px',
    textAlign: 'center'
  };

  const chartWrapperStyle: React.CSSProperties = {
    width: '100%',
    overflowX: 'auto'
  };

  if (!data || data.length === 0) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#6a6a82', textAlign: 'center' }}>Aucune donnée à afficher</p>
      </div>
    );
  }

  // Wait before rendering to avoid re-render loop
  if (!isReady) {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title || 'Graphique'}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: CHART_HEIGHT }}>
          <div style={{ color: '#6a6a82' }}>Chargement du graphique...</div>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
            <XAxis 
              dataKey={actualXKey} 
              stroke="#6a6a82" 
              tick={{ fill: '#6a6a82', fontSize: 12 }}
            />
            <YAxis stroke="#6a6a82" tick={{ fill: '#6a6a82', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2d2d44' }} />
            {actualYKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
            <XAxis 
              dataKey={actualXKey} 
              stroke="#6a6a82" 
              tick={{ fill: '#6a6a82', fontSize: 12 }}
            />
            <YAxis stroke="#6a6a82" tick={{ fill: '#6a6a82', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2d2d44' }} />
            {actualYKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
            <XAxis 
              dataKey={actualXKey} 
              stroke="#6a6a82" 
              tick={{ fill: '#6a6a82', fontSize: 12 }}
            />
            <YAxis stroke="#6a6a82" tick={{ fill: '#6a6a82', fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2d2d44' }} />
            {actualYKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      case 'pie': {
        const pieDataKey = actualYKeys[0] || 'value';
        return (
          <PieChart width={CHART_WIDTH} height={CHART_HEIGHT}>
            <Pie
              data={data}
              dataKey={pieDataKey}
              nameKey={actualXKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#6a6a82' }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1a1a26', border: '1px solid #2d2d44' }} />
          </PieChart>
        );
      }

      default:
        return <p style={{ color: '#6a6a82' }}>Type de graphique non supporté: {type}</p>;
    }
  };

  return (
    <div style={containerStyle}>
      {title && <div style={titleStyle}>{title}</div>}
      <div style={chartWrapperStyle}>
        {renderChart()}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders during streaming
export const ChartRenderer = memo(ChartRendererComponent);

export default ChartRenderer;
