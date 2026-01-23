import React, { useCallback, useMemo } from 'react';
import type { Node } from 'reactflow';
import useWorkflowStore from '../store/useWorkflowStore';
import { nodeTypes } from '../nodes/nodeTypes';
import { getNodeConfigComponent } from '../nodeConfigRegistry';
import CodeEditor from './CodeEditor';
import { z } from 'zod';

interface NodeConfigPanelProps {
  node: Node;
  onClose: () => void;
}

// Configuration dynamique des champs du nœud
const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }) => {
  const updateNode = useWorkflowStore(state => state.updateNode);
  const executionResults = useWorkflowStore(state => state.executionResults);
  const darkMode = useWorkflowStore(state => state.darkMode);
  const [activeTab, setActiveTab] = React.useState('config');
  
  const nodeType = node.data.type;
  // Cherche un panneau de config spécifique enregistré
  const SpecificConfigPanel = getNodeConfigComponent(nodeType);
  const nodeInfo = nodeTypes[nodeType];
  
  // Thème et styles
  const theme = darkMode ? {
    panel: 'bg-gray-800 text-white',
    header: 'bg-gray-700',
    input: 'bg-gray-700 border-gray-600 text-white',
    button: 'bg-blue-600 hover:bg-blue-700',
    secondaryButton: 'bg-gray-600 hover:bg-gray-700',
    text: 'text-white',
    textSecondary: 'text-gray-300',
  } : {
    panel: 'bg-white text-gray-800',
    header: 'bg-gray-50',
    input: 'bg-white border-gray-300 text-gray-800',
    button: 'bg-blue-500 hover:bg-blue-600',
    secondaryButton: 'bg-gray-200 hover:bg-gray-300',
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
  };
  
  // Mise à jour de la config du nœud
  const handleConfigChange = useCallback((key: string, value: any) => {
    updateNode(node.id, { 
      config: { 
        ...node.data.config, 
        [key]: value 
      } 
    });
  }, [node, updateNode]);
  
  // Mise à jour du nom/label du nœud
  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateNode(node.id, { label: e.target.value });
  }, [node, updateNode]);
  
  // Rendu des champs de configuration selon le schéma Zod
  const renderConfigFields = useMemo(() => {
    if (!nodeInfo?.configSchema) return null;

    // Iterate over the Zod schema to render fields
    return Object.entries(nodeInfo.configSchema.shape).map(([key, schema]) => {
      const currentSchema = schema as z.ZodAny; // Cast to ZodAny to access properties
      const value = node.data.config?.[key] ?? currentSchema.default ?? '';
      const isOptional = currentSchema.isOptional();
      const isNullable = currentSchema.isNullable();
      const required = isOptional || isNullable ? '' : '*' ; // Adjust required logic
      const description = currentSchema.description; // Zod's .describe() method

      // Determine the base schema type
      let baseSchema = currentSchema;
      while (baseSchema instanceof z.ZodOptional || baseSchema instanceof z.ZodNullable) {
        baseSchema = baseSchema.unwrap();
      }

      const typeName = baseSchema._def.typeName;

      switch (typeName) {
        case z.ZodString.name: {
          const stringSchema = baseSchema as z.ZodString;
          const isCode = stringSchema._def.metadata?.format === 'code';
          const isExpression = stringSchema._def.metadata?.expression === true;
          const isEnum = stringSchema._def.enum !== undefined;

          if (isCode || isExpression) {
            return (
              <div key={key} className="mb-4">
                <label className={`block mb-2 font-medium ${theme.text}`}>
                  {key} {required}
                </label>
                <CodeEditor
                  value={value as string || ''}
                  language={isCode ? (node.data.config?.language || 'javascript') : 'javascript'}
                  onChange={(code) => handleConfigChange(key, code)}
                  height="200px"
                />
                {description && (
                  <p className={`mt-1 text-xs ${theme.textSecondary}`}>{description}</p>
                )}
              </div>
            );
          } else if (isEnum) {
            return (
              <div key={key} className="mb-4">
                <label className={`block mb-2 font-medium ${theme.text}`}>
                  {key} {required}
                </label>
                <select
                  className={`w-full px-3 py-2 border rounded-md ${theme.input}`}
                  value={value as string}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                >
                  {stringSchema._def.enum.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {description && (
                  <p className={`mt-1 text-xs ${theme.textSecondary}`}>{description}</p>
                )}
              </div>
            );
          } else {
            return (
              <div key={key} className="mb-4">
                <label className={`block mb-2 font-medium ${theme.text}`}>
                  {key} {required}
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md ${theme.input}`}
                  value={value as string}
                  onChange={(e) => handleConfigChange(key, e.target.value)}
                />
                {description && (
                  <p className={`mt-1 text-xs ${theme.textSecondary}`}>{description}</p>
                )}
              </div>
            );
          }
        }

        case z.ZodNumber.name: {
          const numberSchema = baseSchema as z.ZodNumber;
          return (
            <div key={key} className="mb-4">
              <label className={`block mb-2 font-medium ${theme.text}`}>
                {key} {required}
              </label>
              <input
                type="number"
                className={`w-full px-3 py-2 border rounded-md ${theme.input}`}
                value={value as number}
                min={numberSchema._def.checks.find((c: any) => c.kind === 'min')?.value}
                max={numberSchema._def.checks.find((c: any) => c.kind === 'max')?.value}
                step={numberSchema._def.checks.find((c: any) => c.kind === 'step')?.value || 1}
                onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}
              />
              {description && (
                <p className={`mt-1 text-xs ${theme.textSecondary}`}>{description}</p>
              )}
            </div>
          );
        }

        case z.ZodBoolean.name: {
          return (
            <div key={key} className="mb-4 flex items-center">
              <input
                type="checkbox"
                id={`${node.id}-${key}`}
                className="w-4 h-4 mr-2"
                checked={!!value}
                onChange={(e) => handleConfigChange(key, e.target.checked)}
              />
              <label
                htmlFor={`${node.id}-${key}`}
                className={`font-medium ${theme.text}`}
              >
                {key} {required}
              </label>
              {description && (
                <p className={`ml-6 text-xs ${theme.textSecondary}`}>{description}</p>
              )}
            </div>
          );
        }

        case z.ZodObject.name: {
          return (
            <div key={key} className="mb-4">
              <label className={`block mb-2 font-medium ${theme.text}`}>
                {key} {required}
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${theme.input}`}
                value={typeof value === 'object' ? JSON.stringify(value, null, 2) : '{}'}
                rows={5}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleConfigChange(key, parsed);
                  } catch {
                    // Ignorer les erreurs de parsing pendant la frappe
                  }
                }}
              />
              {description && (
                <p className={`mt-1 text-xs ${theme.textSecondary}`}>{description}</p>
              )}
            </div>
          );
        }

        case z.ZodArray.name: {
          // For arrays, we'll render a textarea for JSON input for simplicity
          return (
            <div key={key} className="mb-4">
              <label className={`block mb-2 font-medium ${theme.text}`}>
                {key} {required}
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${theme.input}`}
                value={Array.isArray(value) ? JSON.stringify(value, null, 2) : '[]'}
                rows={5}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (Array.isArray(parsed)) {
                      handleConfigChange(key, parsed);
                    } else {
                      // Handle invalid array input
                    }
                  } catch {
                    // Ignore parsing errors during typing
                  }
                }}
              />
              {description && (
                <p className={`mt-1 text-xs ${theme.textSecondary}`}>{description}</p>
              )}
            </div>
          );
        }

        default:
          console.warn(`Unsupported Zod type: ${typeName} for key: ${key}`);
          return null;
      }
    });
  }, [node, nodeInfo, handleConfigChange, theme]);
  
  // Rendu des exemples disponibles
  const renderExamples = useMemo(() => {
    if (!nodeInfo?.examples || nodeInfo.examples.length === 0) return null;
    
    return (
      <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className={`font-bold ${theme.text} mb-2`}>Exemples</h3>
        <div className="space-y-2">
          {nodeInfo.examples.map((example, index) => (
            <button
              key={index}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm 
                ${theme.secondaryButton} transition-colors`}
              onClick={() => updateNode(node.id, { config: example.config })}
            >
              <div className="font-medium">{example.title}</div>
              <div className={`text-xs ${theme.textSecondary}`}>{example.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }, [nodeInfo, updateNode, node.id, theme]);
  
  // Si un panneau spécifique existe, délègue entièrement le rendu
  if (SpecificConfigPanel) {
    return <SpecificConfigPanel node={node} onClose={onClose} />;
  }

  return (
    <div 
      className={`w-80 border-l overflow-y-auto h-full ${theme.panel} border-gray-200 dark:border-gray-700`}
    >
      {/* En-tête du panneau */}
      <div className={`p-4 border-b flex justify-between items-center ${theme.header} border-gray-200 dark:border-gray-700`}>
        <h2 className="font-bold">Configuration du nœud</h2>
        <button 
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'config' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          onClick={() => setActiveTab('config')}
        >
          Configuration
        </button>
        <button
          className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'data' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          onClick={() => setActiveTab('data')}
        >
          Données
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'config' && (
          <>
            {/* Type de nœud et description */}
            <div className="mb-6">
              <div className={`font-medium ${theme.textSecondary} text-sm mb-1`}>
                Type de nœud
              </div>
              <div className={`font-bold text-lg ${theme.text}`}>
                {nodeInfo?.name || nodeType}
              </div>
              <div className={`mt-1 text-sm ${theme.textSecondary}`}>
                {nodeInfo?.description || ''}
              </div>
            </div>
            
            {/* Nom du nœud */}
            <div className="mb-6">
              <label className={`block mb-2 font-medium ${theme.text}`}>
                Nom du nœud
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-md ${theme.input}`}
                value={node.data.label}
                onChange={handleLabelChange}
              />
            </div>
            
            {/* Champs de configuration dynamiques */}
            <div>{renderConfigFields}</div>
            
            {/* Exemples prédéfinis */}
            {renderExamples}
          </>
        )}
        {activeTab === 'data' && (
          <div className="mt-4">
            <h3 className={`font-bold ${theme.text} mb-2`}>Données d'exécution</h3>
            <pre className={`p-2 rounded-md overflow-auto text-xs ${theme.input}`}>
              {JSON.stringify(executionResults[node.id], null, 2) || 'Aucune donnée d\'exécution pour ce nœud.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeConfigPanel;
