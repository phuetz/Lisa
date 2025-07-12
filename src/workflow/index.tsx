import React from 'react';
import WorkflowPanel from './panels/WorkflowPanel';

/**
 * Point d'entrée principal du module de workflow
 * Expose le composant WorkflowPanel qui intègre tous les sous-composants
 */

const WorkflowEditor: React.FC = () => {
  return <WorkflowPanel />;
};

export default WorkflowEditor;
