import React, { useCallback, useMemo } from 'react';
import { Node } from 'reactflow';
import useWorkflowStore from '../store/useWorkflowStore';
import { nodeTypes } from '../nodes/nodeTypes';
import CodeEditor from './CodeEditor';

interface NodeConfigPanelProps {
  node: Node;
  onClose: () => void;
}

// Configuration dynamique des champs du nœud
const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }) => {
  const updateNode = useWorkflowStore(state => state.updateNode);
  const darkMode = useWorkflowStore(state => state.darkMode);
  
  const nodeType = node.data.type;
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
  
  // Rendu des champs de configuration selon le schéma
  const renderConfigFields = useMemo(() => {
    if (!nodeInfo?.configSchema) return null;
    
    return Object.entries(nodeInfo.configSchema).map(([key, schema]) => {
      const value = node.data.config?.[key] ?? schema.default ?? '';
      const required = schema.required ? '*' : '';
      
      // Affichage du champ selon son type
      switch (schema.type) {
        case 'string':
          // Éditeur de code pour les champs de code
          if (schema.format === 'code') {
            return (
              <div key={key} className="mb-4">
                <label className={`block mb-2 font-medium ${theme.text}`}>
                  {key} {required}
                </label>
                <CodeEditor
                  value={value as string || ''}
                  language={node.data.config?.language || 'javascript'}
                  onChange={(code) => handleConfigChange(key, code)}
                  height="200px"
                />
              </div>
            );
          }
          
          // Select pour les énumérations
          if (schema.enum) {
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
                  {schema.enum.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {schema.description && (
                  <p className={`mt-1 text-xs ${theme.textSecondary}`}>{schema.description}</p>
                )}
              </div>
            );
          }
          
          // Input texte standard
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
              {schema.description && (
                <p className={`mt-1 text-xs ${theme.textSecondary}`}>{schema.description}</p>
              )}
            </div>
          );
          
        case 'number':
          return (
            <div key={key} className="mb-4">
              <label className={`block mb-2 font-medium ${theme.text}`}>
                {key} {required}
              </label>
              <input
                type="number"
                className={`w-full px-3 py-2 border rounded-md ${theme.input}`}
                value={value as number}
                min={schema.min}
                max={schema.max}
                step={schema.step || 1}
                onChange={(e) => handleConfigChange(key, parseFloat(e.target.value))}
              />
              {schema.description && (
                <p className={`mt-1 text-xs ${theme.textSecondary}`}>{schema.description}</p>
              )}
            </div>
          );
          
        case 'boolean':
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
              {schema.description && (
                <p className={`ml-6 text-xs ${theme.textSecondary}`}>{schema.description}</p>
              )}
            </div>
          );
          
        case 'object':
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
              {schema.description && (
                <p className={`mt-1 text-xs ${theme.textSecondary}`}>{schema.description}</p>
              )}
            </div>
          );
          
        default:
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
      
      <div className="p-4">
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
      </div>
    </div>
  );
};

export default NodeConfigPanel;
