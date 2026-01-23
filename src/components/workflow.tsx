import React, { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import WorkflowEditor from '../features/workflow';
import useWorkflowStore from '../features/workflow/store/useWorkflowStore';

/**
 * Composant wrapper pour le WorkflowEditor modularisé
 * Cette version utilise l'architecture refactorisée avec:
 * - Store séparé (useWorkflowStore)
 * - Exécuteur de workflow dans un module séparé (WorkflowExecutor)
 * - Composants UI organisés dans des sous-dossiers (panels/, nodes/)
 * - Types fortement typés avec TypeScript
 */

export default function App() {
  const darkMode = useWorkflowStore(state => state.darkMode);
  
  useEffect(() => {
    // Appliquer le mode sombre au body
    if (darkMode) {
      document.body.classList.add('dark');
      document.body.style.backgroundColor = '#111827';
    } else {
      document.body.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
    }
  }, [darkMode]);
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <ReactFlowProvider>
        <WorkflowEditor />
      </ReactFlowProvider>
    </div>
  );
}
