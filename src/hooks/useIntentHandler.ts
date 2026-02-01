import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import type { WorkflowStep } from '../store/appStore';
import { agentRegistry } from '../features/agents/core/registry';
import { useSpeechResponder } from './useSpeechResponder';
import type { AgentExecuteProps } from '../features/agents/core/types';
import { useSmallTalk } from './useSmallTalk';
import { useUserWorkflows } from './useUserWorkflows';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useMemory } from './useMemory';

export const useIntentHandler = () => {
  const { i18n } = useTranslation();
  const setPlan = useAppStore(state => state.setPlan);
  const setState = useAppStore(state => state.setState);
  
  // Get AI Model preferences
  const selectedLLM = useAppStore(state => state.selectedLLM);

  // Obtenir les fonctions de gestion des workflows utilisateur
  const { checkTriggerPhrase, executeWorkflow } = useUserWorkflows();
  
  // Get small talk detection
  const { isSmallTalk } = useSmallTalk();
  
  // Get text-to-speech functionality
  const { speakText } = useSpeechSynthesis();
  
  // Get memory functions
  const { storeMemory, retrieveMemories } = useMemory();

  // This hook sets up the speech synthesis engine
  useSpeechResponder();

  const handleIntent = useCallback(async (intent: string, isInternal = false, languageOverride?: string) => {
    try {
      const language = languageOverride ?? i18n.language;
      // Vérifier d'abord si l'intent correspond à un déclencheur de workflow utilisateur
      if (!isInternal) {
        const triggerMatch = await checkTriggerPhrase(intent);
        
        if (triggerMatch.matched && triggerMatch.workflowId) {
          console.log(`Déclencheur de workflow détecté: "${intent}" -> Workflow ID: ${triggerMatch.workflowId}`);
          
          setState({ intent: 'processing' });
          setPlan([{ 
            label: `Exécution du workflow personnalisé (déclencheur: "${intent}")`,
            status: 'running' 
          }]); 
          
          // Exécuter le workflow personnalisé
          const success = await executeWorkflow(triggerMatch.workflowId);
          
          if (success) {
            setPlan(prev => prev?.map(step => ({ ...step, status: 'completed' })) || []);
            speakText('Action terminée avec succès');
          } else {
            setPlan(prev => prev?.map(step => ({ ...step, status: 'failed' })) || []);
            speakText('Erreur lors de l\'exécution de l\'action');
          }
          
          setTimeout(() => setPlan(null), 5000);
          setState({ intent: undefined, listeningActive: false });
          return;
        }
        
        // Vérifier si c'est une commande liée à la mémoire
        const memoryKeywords = ['souviens-toi', 'rappelle-toi', 'n\'oublie pas', 'mémorise'];
        const memoryPhrases = ['tu te souviens', 'souviens-toi que', 'rappelle-moi', 'n\'oublie pas que'];
        
        const lowerIntent = intent.toLowerCase();
        const isMemoryCommand = memoryKeywords.some(kw => lowerIntent.startsWith(kw)) || 
                              memoryPhrases.some(phrase => lowerIntent.includes(phrase));
        
        if (isMemoryCommand) {
          console.log(`Commande de mémoire détectée: "${intent}"`);
          
          setState({ intent: 'processing' });
          setPlan([{ 
            label: `Mémorisation: "${intent}"`,
            status: 'running' 
          }]);
          
          // Utiliser MemoryAgent pour traiter la commande de mémoire
          const memoryAgent = await agentRegistry.getAgentAsync('MemoryAgent');
          
          if (memoryAgent) {
            // Déterminer l'action de mémoire
            let action = 'store';
            let content = '';
            
            if (lowerIntent.includes('rappelle-moi') || lowerIntent.includes('tu te souviens')) {
              action = 'retrieve';
              // Extraire le sujet de la recherche
              const searchTerms = lowerIntent.replace(/^(rappelle-moi|est-ce que tu te souviens)\s*(de|d'|du|des|\w+)\s*/i, '');
              const result = await memoryAgent.execute({
                action,
                query: { text: searchTerms, limit: 3 }
              });
              
              if (result.success && Array.isArray(result.output) && result.output.length > 0) {
                setPlan(prev => prev?.map(step => ({ ...step, status: 'completed' })) || []);
                const memories = result.output;
                const response = `Oui, je me souviens: ${memories.map(m => m.content).join('. ')}`;  
                speakText(response);
                
                // Mettre à jour les compteurs d'accès des mémoires récupérées
                memories.forEach(memory => {
                  memoryAgent.execute({
                    action: 'update',
                    id: memory.id,
                    updates: {
                      accessCount: (memory.accessCount || 0) + 1,
                      lastAccessed: Date.now()
                    }
                  });
                });
              } else {
                setPlan(prev => prev?.map(step => ({ ...step, status: 'completed' })) || []);
                speakText(`Désolé, je ne me souviens pas de ça.`);
              }
            } else {
              // C'est une commande de stockage de mémoire
              // Extraire le contenu à mémoriser
              if (lowerIntent.startsWith('souviens-toi que')) {
                content = intent.substring(16).trim();
              } else if (lowerIntent.startsWith('souviens-toi')) {
                content = intent.substring(12).trim();
              } else if (lowerIntent.startsWith('mémorise')) {
                content = intent.substring(9).trim();
              } else if (lowerIntent.startsWith('n\'oublie pas que')) {
                content = intent.substring(17).trim();
              } else if (lowerIntent.startsWith('n\'oublie pas')) {
                content = intent.substring(13).trim();
              } else {
                content = intent;
              }
              
              const result = await memoryAgent.execute({
                action,
                content,
                type: 'fact',
                tags: ['voice_command'],
                source: 'user_instruction'
              });
              
              if (result.success) {
                setPlan(prev => prev?.map(step => ({ ...step, status: 'completed' })) || []);
                speakText(`J'ai mémorisé : ${content}`);
              } else {
                setPlan(prev => prev?.map(step => ({ ...step, status: 'failed' })) || []);
                speakText('Désolé, je n\'ai pas pu mémoriser cette information');
              }
            }
            
            setTimeout(() => setPlan(null), 5000);
            setState({ intent: undefined, listeningActive: false });
            return;
          }
        }
        
        // Vérifier si c'est du small talk et utiliser SmallTalkAgent le cas échéant
        if (isSmallTalk(intent)) {
          console.log(`Small talk détecté: "${intent}"`);
          
          setState({ intent: 'processing' });
          setPlan([{ 
            label: `Conversation: "${intent}"`,
            status: 'running' 
          }]);
          
          // Utiliser SmallTalkAgent pour traiter le small talk
          const smallTalkAgent = await agentRegistry.getAgentAsync('SmallTalkAgent');
          
          if (smallTalkAgent) {
            const result = await smallTalkAgent.execute({
              request: intent,
              language: i18n.language,
              model: selectedLLM
            });
            
            if (result.success) {
              setPlan(prev => prev?.map(step => ({ ...step, status: 'completed' })) || []);
              speakText(result.output);
              
              // Stocker l'interaction dans la mémoire
              try {
                await storeMemory(`Interaction: ${intent} -> ${result.output}`, {
                  type: 'interaction',
                  tags: ['conversation', 'small_talk']
                });
              } catch (error) {
                console.error('Error storing conversation in memory:', error);
              }
            } else {
              setPlan(prev => prev?.map(step => ({ ...step, status: 'failed' })) || []);
              speakText('Je suis désolée, je ne peux pas répondre à cela pour le moment');
            }
            
            setTimeout(() => setPlan(null), 5000);
            setState({ intent: undefined, listeningActive: false });
            return;
          }
        }
      }
      
      // Si ce n'est pas un déclencheur de workflow utilisateur ni du small talk, continuer avec le PlannerAgent normal
      const planner = await agentRegistry.getAgentAsync('PlannerAgent');
      if (!planner) {
        console.error('PlannerAgent not found!');
        speakText('Erreur lors de l\'exécution de l\'action');
        if (!isInternal) setState({ listeningActive: false });
        return;
      }

      setState({ intent: 'processing' });
      if (!isInternal) {
        setPlan([]); 
      }

      let plannerProps: AgentExecuteProps = { request: intent };
      if (intent.toLowerCase().startsWith('load template')) {
        plannerProps = { request: '', loadFromTemplate: intent.substring(14).trim() };
      } else if (intent.toLowerCase().startsWith('resume checkpoint')) {
        plannerProps = { request: '', resumeFromCheckpointId: intent.substring(18).trim() };
      }

      const result = await planner.execute({
        ...plannerProps,
        language,
        onPlanUpdate: (updatedPlan: WorkflowStep[]) => {
          setPlan(updatedPlan);
        },
      });

      if (result.success) {
        if (!isInternal) speakText('Action terminée avec succès');
        
        // Stocker l'intention et le résultat dans la mémoire
        try {
          await storeMemory(`Commande exécutée: ${intent}`, {
            type: 'interaction',
            tags: ['command', 'planner_execution'],
            metadata: { success: true }
          });
        } catch (error) {
          console.error('Error storing command result in memory:', error);
        }
      } else {
        console.error('PlannerAgent execution failed:', result.error);
        if (!isInternal) speakText('Erreur lors de l\'exécution de l\'action');
        
        // Stocker l'échec dans la mémoire
        try {
          await storeMemory(`Échec d'exécution: ${intent}`, {
            type: 'interaction',
            tags: ['command', 'planner_execution', 'error'],
            metadata: { error: result.error, success: false }
          });
        } catch (error) {
          console.error('Error storing command failure in memory:', error);
        }
      }
    } catch (error) {
      console.error('Error handling intent:', error);
      if (!isInternal) speakText('Erreur lors de l\'exécution de l\'action');
    } finally {
      if (!isInternal) {
        setTimeout(() => setPlan(null), 5000);
        setState({ intent: undefined, listeningActive: false });
      }
    }
  }, [i18n.language, setPlan, setState, speakText, storeMemory, retrieveMemories, isSmallTalk, checkTriggerPhrase, executeWorkflow]);

  return { handleIntent };
};
