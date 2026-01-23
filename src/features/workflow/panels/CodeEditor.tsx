import React, { useCallback, useEffect, useRef } from 'react';
import useWorkflowStore from '../store/useWorkflowStore';

// Types d'éditeur de code
interface CodeEditorProps {
  value: string;
  onChange: (code: string) => void;
  language?: 'javascript' | 'python' | 'json';
  height?: string;
  readOnly?: boolean;
}

// Composant d'éditeur de code basé sur Monaco Editor avec chargement dynamique
const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language = 'javascript', 
  height = '200px',
  readOnly = false
}) => {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<any>(null);
  const darkMode = useWorkflowStore(state => state.darkMode);

  // Chargement dynamique de Monaco Editor
  useEffect(() => {
    // Éviter de recharger Monaco s'il est déjà chargé
    if (window.monaco) {
      monacoRef.current = window.monaco;
      initMonaco();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/monaco-editor@0.36.1/min/vs/loader.js';
    script.async = true;
    script.onload = () => {
      // @ts-expect-error: Monaco AMD loader 'require' is attached on window at runtime
      window.require.config({
        paths: {
          vs: 'https://unpkg.com/monaco-editor@0.36.1/min/vs'
        }
      });
      
      // @ts-expect-error: Monaco AMD loader 'require' is attached on window at runtime
      window.require(['vs/editor/editor.main'], () => {
        monacoRef.current = window.monaco;
        initMonaco();
      });
    };

    document.body.appendChild(script);

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mise à jour du thème lorsque le mode sombre change
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setTheme(darkMode ? 'vs-dark' : 'vs');
    }
  }, [darkMode]);

  // Mise à jour du contenu de l'éditeur lorsque la valeur change
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (value !== currentValue) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  // Initialisation de Monaco Editor
  const initMonaco = useCallback(() => {
    if (!containerRef.current || editorRef.current) return;

    // Configurer les langages
    const languageMap = {
      'javascript': 'javascript',
      'python': 'python',
      'json': 'json',
    };

    // Créer l'éditeur
    editorRef.current = monacoRef.current.editor.create(containerRef.current, {
      value: value,
      language: languageMap[language],
      theme: darkMode ? 'vs-dark' : 'vs',
      automaticLayout: true,
      minimap: {
        enabled: false
      },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      readOnly: readOnly,
      fontSize: 14,
      tabSize: 2,
    });

    // Événement onChange
    editorRef.current.onDidChangeModelContent(() => {
      const newValue = editorRef.current.getValue();
      if (newValue !== value) {
        onChange(newValue);
      }
    });
  }, [value, language, darkMode, readOnly, onChange]);

  // Rendu de l'éditeur avec fallback
  return (
    <div>
      <div
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: height, 
          border: `1px solid ${darkMode ? '#4B5563' : '#E5E7EB'}`,
          borderRadius: '0.375rem',
        }}
      />
      {!window.monaco && (
        <textarea
          className={`w-full h-full p-2 font-mono text-sm ${
            darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
          } border ${
            darkMode ? 'border-gray-700' : 'border-gray-300'
          } rounded-md`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ height }}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default CodeEditor;
