import AppIntents
import Foundation

// MARK: - Ask Lisa Intent

@available(iOS 16.0, *)
struct AskLisaIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Lisa"
    static var description = IntentDescription("Ask Lisa AI a question")

    @Parameter(title: "Question")
    var question: String

    static var parameterSummary: some ParameterSummary {
        Summary("Ask Lisa \(\.$question)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        // This would typically call your AI service
        // For now, we'll return a placeholder
        let response = "I received your question: \(question). Opening Lisa..."

        // Open the app with the question
        if let url = URL(string: "lisa://ask?q=\(question.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
            // Note: In a real implementation, you'd use openURL
        }

        return .result(value: response, dialog: IntentDialog(stringLiteral: response))
    }

    static var openAppWhenRun: Bool = true
}

// MARK: - New Chat Intent

@available(iOS 16.0, *)
struct NewChatIntent: AppIntent {
    static var title: LocalizedStringResource = "New Chat with Lisa"
    static var description = IntentDescription("Start a new conversation with Lisa")

    func perform() async throws -> some IntentResult {
        // Open the app to new chat
        return .result()
    }

    static var openAppWhenRun: Bool = true
}

// MARK: - Voice Mode Intent

@available(iOS 16.0, *)
struct VoiceModeIntent: AppIntent {
    static var title: LocalizedStringResource = "Voice Mode with Lisa"
    static var description = IntentDescription("Start voice conversation with Lisa")

    func perform() async throws -> some IntentResult {
        return .result()
    }

    static var openAppWhenRun: Bool = true
}

// MARK: - Quick Note Intent

@available(iOS 16.0, *)
struct QuickNoteIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Note to Lisa"
    static var description = IntentDescription("Save a quick note with Lisa")

    @Parameter(title: "Note")
    var note: String

    static var parameterSummary: some ParameterSummary {
        Summary("Save note: \(\.$note)")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Save the note
        let response = "Note saved: \(note)"
        return .result(dialog: IntentDialog(stringLiteral: response))
    }

    static var openAppWhenRun: Bool = false
}

// MARK: - App Shortcuts Provider

@available(iOS 16.0, *)
struct LisaShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskLisaIntent(),
            phrases: [
                "Ask \(.applicationName) \(\.$question)",
                "Hey \(.applicationName), \(\.$question)",
                "Tell \(.applicationName) \(\.$question)",
                "Question for \(.applicationName)"
            ],
            shortTitle: "Ask Lisa",
            systemImageName: "message.fill"
        )

        AppShortcut(
            intent: NewChatIntent(),
            phrases: [
                "New chat with \(.applicationName)",
                "Start conversation with \(.applicationName)",
                "Open \(.applicationName)"
            ],
            shortTitle: "New Chat",
            systemImageName: "plus.message.fill"
        )

        AppShortcut(
            intent: VoiceModeIntent(),
            phrases: [
                "Voice mode \(.applicationName)",
                "Talk to \(.applicationName)",
                "Speak with \(.applicationName)"
            ],
            shortTitle: "Voice Mode",
            systemImageName: "mic.fill"
        )

        AppShortcut(
            intent: QuickNoteIntent(),
            phrases: [
                "Quick note \(.applicationName) \(\.$note)",
                "Note to \(.applicationName) \(\.$note)",
                "Remember \(\.$note) in \(.applicationName)"
            ],
            shortTitle: "Quick Note",
            systemImageName: "note.text"
        )
    }
}

// MARK: - Entity for Recent Conversations

@available(iOS 16.0, *)
struct ConversationEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Conversation"
    static var defaultQuery = ConversationQuery()

    var id: String
    var title: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

@available(iOS 16.0, *)
struct ConversationQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [ConversationEntity] {
        // Load conversations from shared data
        let conversations = SharedDataManager.shared.getRecentConversations()
        return conversations
            .filter { identifiers.contains($0.id) }
            .map { ConversationEntity(id: $0.id, title: $0.title) }
    }

    func suggestedEntities() async throws -> [ConversationEntity] {
        let conversations = SharedDataManager.shared.getRecentConversations()
        return conversations.prefix(5).map { ConversationEntity(id: $0.id, title: $0.title) }
    }
}

// MARK: - Open Conversation Intent

@available(iOS 16.0, *)
struct OpenConversationIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Conversation"
    static var description = IntentDescription("Open a specific Lisa conversation")

    @Parameter(title: "Conversation")
    var conversation: ConversationEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Open \(\.$conversation)")
    }

    func perform() async throws -> some IntentResult {
        // Open the specific conversation
        return .result()
    }

    static var openAppWhenRun: Bool = true
}
