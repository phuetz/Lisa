import Foundation
import WidgetKit

/// Manages shared data between the main app and widgets
class SharedDataManager {
    static let shared = SharedDataManager()

    private let suiteName = "group.com.lisa.ai"
    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    // MARK: - Conversations

    struct ConversationData: Codable {
        let id: String
        let title: String
        let lastMessage: String
        let timestamp: Double
        let messageCount: Int
    }

    /// Update recent conversations for widget display
    func updateRecentConversations(_ conversations: [ConversationData]) {
        guard let defaults = sharedDefaults,
              let data = try? JSONEncoder().encode(conversations)
        else { return }

        defaults.set(data, forKey: "recent_conversations")

        // Reload widgets
        WidgetCenter.shared.reloadTimelines(ofKind: "RecentConversationsWidget")
    }

    /// Get recent conversations
    func getRecentConversations() -> [ConversationData] {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: "recent_conversations"),
              let conversations = try? JSONDecoder().decode([ConversationData].self, from: data)
        else { return [] }

        return conversations
    }

    // MARK: - Stats

    struct StatsData: Codable {
        let totalConversations: Int
        let totalMessages: Int
        let messagesToday: Int
        let favoriteAgent: String?
        let lastUpdated: Double
    }

    /// Update stats for widget display
    func updateStats(_ stats: StatsData) {
        guard let defaults = sharedDefaults,
              let data = try? JSONEncoder().encode(stats)
        else { return }

        defaults.set(data, forKey: "lisa_stats")
    }

    /// Get current stats
    func getStats() -> StatsData? {
        guard let defaults = sharedDefaults,
              let data = defaults.data(forKey: "lisa_stats"),
              let stats = try? JSONDecoder().decode(StatsData.self, from: data)
        else { return nil }

        return stats
    }

    // MARK: - Quick Actions

    /// Save the last quick action query for suggestions
    func saveQuickAction(_ query: String) {
        guard let defaults = sharedDefaults else { return }

        var actions = defaults.stringArray(forKey: "quick_actions") ?? []
        actions.insert(query, at: 0)
        actions = Array(actions.prefix(10)) // Keep only last 10

        defaults.set(actions, forKey: "quick_actions")
    }

    /// Get recent quick actions
    func getQuickActions() -> [String] {
        sharedDefaults?.stringArray(forKey: "quick_actions") ?? []
    }

    // MARK: - Widget Refresh

    /// Force refresh all Lisa widgets
    func refreshAllWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Refresh specific widget type
    func refreshWidget(kind: String) {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }
}

// MARK: - Notification for App Communication

extension Notification.Name {
    static let widgetDataUpdated = Notification.Name("com.lisa.ai.widgetDataUpdated")
}
