# Problème: Messages non envoyés à LM Studio depuis Android

## Contexte
- App React + Capacitor pour Android
- LM Studio tourne sur le PC (localhost:1234) - fonctionne ✓
- ADB reverse configuré: `adb reverse tcp:1234 tcp:1234` ✓
- Émulateur peut ping 10.0.2.2 (host) ✓

## Symptômes
1. L'utilisateur tape un message et appuie sur Envoyer
2. Le message apparaît dans le chat (côté user)
3. **Aucune requête n'arrive à LM Studio** (pas de logs côté serveur)
4. Pas de réponse assistant, pas d'erreur visible

## Ce qu'on a vérifié
- `networkConfig.ts` utilise `localhost:1234` pour mobile
- `ChatInputMobile.tsx` n'override plus baseURL
- `aiService.ts` a des console.log mais ils n'apparaissent pas dans logcat
- Le modèle par défaut est bien `lmstudio` provider

## Code suspect - ChatInputMobile.tsx handleSend()
```javascript
aiService.updateConfig({
  provider: currentModel.provider as AIProvider,  // 'lmstudio'
  model: currentModel.id,
  temperature,
  maxTokens,
});

if (streamingEnabled) {
  for await (const chunk of aiService.streamMessage(history)) {
    // ...
  }
}
```

## Hypothèses
1. `streamMessage()` n'est jamais appelé
2. Une erreur silencieuse avant l'appel fetch
3. Le provider n'est pas 'lmstudio' au runtime
4. Problème avec le async generator

## Fichiers clés
- `src/components/chat/ChatInputMobile.tsx` - handleSend()
- `src/services/aiService.ts` - streamMessage(), streamLocal()
- `src/config/networkConfig.ts` - getLMStudioUrl()
- `src/store/chatSettingsStore.ts` - selectedModelId

## Question
Pourquoi `aiService.streamMessage()` ou `aiService.streamLocal()` ne semble pas être exécuté quand on envoie un message depuis l'app Android?
