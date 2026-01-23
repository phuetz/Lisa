# Intégration MetaHuman avec Unreal Engine 5.6

## Vue d'ensemble

Cette documentation explique comment configurer et utiliser l'intégration MetaHuman avec Unreal Engine 5.6 pour donner à Lisa un avatar 3D réaliste et interactif. Cette version optimise les performances et utilise les dernières fonctionnalités d'UE 5.6.

## Architecture

```
Lisa React App ←→ WebSocket ←→ Unreal Engine 5.6 ←→ MetaHuman Avatar
                                      ↓
                              Lumen + Nanite + Chaos Physics
```

### Composants Principaux

1. **UnrealEngineService** - Service de communication WebSocket avec retry automatique
2. **useUnrealEngine** - Hook React pour l'intégration temps réel
3. **MetaHumanControlsPanel** - Interface de contrôle avancée
4. **MetaHumanStore** - Gestion d'état Zustand avec persistance
5. **MetaHumanRenderer** - Rendu optimisé UE 5.6

## Configuration Unreal Engine 5.6

### Prérequis

- Unreal Engine 5.6 installé
- MetaHuman Creator account
- Plugin WebSocket activé dans UE5.6

### Étapes de Configuration

#### 1. Créer un Projet UE5.6

```bash
# Créer un nouveau projet UE5.6
# Template: Third Person ou Blank
# Target Platform: Desktop
```

#### 2. Installer les Plugins Requis

Dans l'Unreal Editor :
- **Edit → Plugins**
- Activer les plugins suivants :
  - `Web Socket Networking`
  - `MetaHuman`
  - `Live Link`
  - `Audio2Face` (optionnel pour lip sync avancé)

#### 3. Importer MetaHuman

1. Ouvrir **MetaHuman Creator** dans le navigateur
2. Créer ou sélectionner un MetaHuman
3. **Download** → **Unreal Engine**
4. Dans UE5.6 : **Window → MetaHuman → Import MetaHuman**

#### 4. Configurer le WebSocket Server

Créer un Blueprint Actor `BP_MetaHumanController` :

```cpp
// C++ Header (MetaHumanController.h)
UCLASS()
class LISA_API AMetaHumanController : public AActor
{
    GENERATED_BODY()

public:
    AMetaHumanController();

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "WebSocket")
    int32 WebSocketPort = 8080;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MetaHuman")
    class AMetaHumanPawn* MetaHumanPawn;

private:
    class FWebSocketServer* WebSocketServer;
    
    void StartWebSocketServer();
    void StopWebSocketServer();
    void HandleWebSocketMessage(const FString& Message);
    void ProcessMetaHumanCommand(const FString& CommandType, const FString& Data);
};
```

```cpp
// C++ Implementation (MetaHumanController.cpp)
#include "MetaHumanController.h"
#include "WebSocketsModule.h"
#include "IWebSocket.h"

void AMetaHumanController::StartWebSocketServer()
{
    if (!FModuleManager::Get().IsModuleLoaded("WebSockets"))
    {
        FModuleManager::Get().LoadModule("WebSockets");
    }

    // Configuration du serveur WebSocket
    WebSocketServer = FWebSocketServer::Create();
    WebSocketServer->Init(WebSocketPort, TEXT("metahuman"));
    
    WebSocketServer->OnConnectionOpened().AddUObject(this, &AMetaHumanController::OnWebSocketConnected);
    WebSocketServer->OnMessage().AddUObject(this, &AMetaHumanController::HandleWebSocketMessage);
}

void AMetaHumanController::HandleWebSocketMessage(const FString& Message)
{
    // Parser le JSON et traiter les commandes
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);
    
    if (FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        FString CommandType = JsonObject->GetStringField("type");
        FString Data = JsonObject->GetStringField("data");
        
        ProcessMetaHumanCommand(CommandType, Data);
    }
}

void AMetaHumanController::ProcessMetaHumanCommand(const FString& CommandType, const FString& Data)
{
    if (CommandType == "expression")
    {
        // Contrôler les expressions faciales
        SetMetaHumanExpression(Data);
    }
    else if (CommandType == "speech")
    {
        // Contrôler la parole et lip sync
        SetMetaHumanSpeech(Data);
    }
    else if (CommandType == "pose")
    {
        // Contrôler les poses et animations
        SetMetaHumanPose(Data);
    }
    // ... autres commandes
}
```

#### 5. Blueprint Setup

Dans le Blueprint `BP_MetaHumanController` :

1. **Event BeginPlay** → **Start WebSocket Server**
2. **Custom Event: Set Expression** 
   - Input: Expression Name (String), Intensity (Float)
   - Logic: Modifier les Blend Shapes du MetaHuman
3. **Custom Event: Set Speech**
   - Input: Text (String), Audio URL (String)
   - Logic: Jouer l'audio + lip sync
4. **Custom Event: Set Pose**
   - Input: Animation Name (String)
   - Logic: Jouer l'animation

### Configuration des Blend Shapes

Les expressions principales à configurer :

```json
{
  "neutral": { "blendShapes": {} },
  "joy": { 
    "blendShapes": {
      "CTRL_expressions_mouthSmileL": 0.8,
      "CTRL_expressions_mouthSmileR": 0.8,
      "CTRL_expressions_eyeSquintInnerL": 0.3,
      "CTRL_expressions_eyeSquintInnerR": 0.3
    }
  },
  "sadness": {
    "blendShapes": {
      "CTRL_expressions_mouthFrownL": 0.7,
      "CTRL_expressions_mouthFrownR": 0.7,
      "CTRL_expressions_browDownL": 0.5,
      "CTRL_expressions_browDownR": 0.5
    }
  }
}
```

## Utilisation dans Lisa

### Connexion Automatique

L'application Lisa tente automatiquement de se connecter à Unreal Engine au démarrage :

```typescript
// Dans useUnrealEngine hook
useEffect(() => {
  if (!connectionAttempted.current) {
    connectionAttempted.current = true;
    connect().catch(error => {
      console.log('Auto-connect failed, manual connection required:', error);
    });
  }
}, [connect]);
```

### Contrôle Manuel

Le panneau MetaHuman permet de :

1. **Connecter/Déconnecter** Unreal Engine
2. **Tester les expressions** (joie, tristesse, surprise, etc.)
3. **Tester les poses** (salut, réflexion, explication, etc.)
4. **Tester la parole** avec lip sync
5. **Contrôler la caméra** (face, profil, gros plan)
6. **Ajuster l'éclairage** (jour, soir, nuit)

### Intégration avec le Chat

Quand Lisa répond dans le chat, elle peut automatiquement :

```typescript
// Dans useChatInterface
const sendMessage = async (message: string) => {
  // ... traitement du message
  
  // Si connecté à Unreal Engine, faire parler Lisa
  if (unrealEngine.isConnected) {
    unrealEngine.sendSpeech(response);
    unrealEngine.sendExpression('happy', 0.7);
  }
};
```

## API WebSocket

### Format des Messages

Tous les messages suivent ce format JSON :

```json
{
  "type": "expression|speech|pose|animation|blendshape|camera|lighting",
  "data": { /* données spécifiques */ },
  "timestamp": 1234567890,
  "id": "unique-id"
}
```

### Types de Commandes

#### Expression
```json
{
  "type": "expression",
  "data": {
    "name": "joy",
    "intensity": 0.8,
    "duration": 2000,
    "blendMode": "replace"
  }
}
```

#### Speech
```json
{
  "type": "speech",
  "data": {
    "text": "Bonjour, comment allez-vous ?",
    "audioUrl": "http://localhost:3000/audio/speech.wav",
    "voice": "default",
    "visemes": [
      { "time": 0, "viseme": "sil", "intensity": 0 },
      { "time": 100, "viseme": "B", "intensity": 0.8 }
    ]
  }
}
```

#### Pose
```json
{
  "type": "pose",
  "data": {
    "name": "greeting",
    "transition": 0.5,
    "loop": false
  }
}
```

## Dépannage

### Problèmes Courants

1. **Connexion WebSocket échoue**
   - Vérifier que UE5.6 est lancé
   - Vérifier le port 8080 (configurable)
   - Vérifier les plugins WebSocket

2. **MetaHuman ne bouge pas**
   - Vérifier les noms des Blend Shapes
   - Vérifier les animations dans UE5.6
   - Vérifier les logs de la console

3. **Lip Sync ne fonctionne pas**
   - Vérifier l'audio URL
   - Configurer Audio2Face si disponible
   - Vérifier les visemes

### Logs de Debug

Activer les logs détaillés :

```typescript
// Dans UnrealEngineService
console.log('Sent command to Unreal Engine:', command.type);
console.log('Received from Unreal Engine:', message);
```

## Performance

### Optimisations Recommandées

1. **Limitation du taux de rafraîchissement** des blend shapes
2. **Mise en cache** des animations fréquentes
3. **Compression** des messages WebSocket
4. **Pooling** des objets pour éviter le garbage collection

### Métriques à Surveiller

- Latence WebSocket (< 50ms recommandé)
- FPS Unreal Engine (> 30 FPS)
- Utilisation mémoire
- Taille des messages WebSocket

## Évolutions Futures

### Fonctionnalités Prévues

1. **Reconnaissance émotionnelle** automatique
2. **Gestes adaptatifs** basés sur le contexte
3. **Synchronisation audio avancée**
4. **Support multi-MetaHuman**
5. **Intégration réalité virtuelle**

### Intégrations Possibles

- **Azure Cognitive Services** pour l'analyse émotionnelle
- **OpenAI GPT** pour génération de gestes contextuels
- **Eleven Labs** pour synthèse vocale avancée
- **MediaPipe** pour tracking facial en temps réel

---

## Support

Pour toute question ou problème :

1. Consulter les logs de la console
2. Vérifier la documentation Unreal Engine 5.6
3. Tester avec les exemples fournis
4. Contacter l'équipe de développement

**Version**: 1.0.0  
**Dernière mise à jour**: 2025-01-19
