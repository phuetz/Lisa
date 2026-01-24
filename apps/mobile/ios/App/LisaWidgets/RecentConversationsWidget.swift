import WidgetKit
import SwiftUI

// MARK: - Recent Conversations Widget

struct ConversationItem: Identifiable {
    let id: String
    let title: String
    let lastMessage: String
    let timestamp: Date
}

struct RecentConversationsEntry: TimelineEntry {
    let date: Date
    let conversations: [ConversationItem]
}

struct RecentConversationsProvider: TimelineProvider {
    func placeholder(in context: Context) -> RecentConversationsEntry {
        RecentConversationsEntry(date: Date(), conversations: sampleConversations)
    }

    func getSnapshot(in context: Context, completion: @escaping (RecentConversationsEntry) -> Void) {
        let entry = RecentConversationsEntry(date: Date(), conversations: loadConversations())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RecentConversationsEntry>) -> Void) {
        let entry = RecentConversationsEntry(date: Date(), conversations: loadConversations())
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadConversations() -> [ConversationItem] {
        // Load from shared UserDefaults (App Group)
        guard let sharedDefaults = UserDefaults(suiteName: "group.com.lisa.ai"),
              let data = sharedDefaults.data(forKey: "recent_conversations"),
              let conversations = try? JSONDecoder().decode([StoredConversation].self, from: data)
        else {
            return sampleConversations
        }

        return conversations.map { conv in
            ConversationItem(
                id: conv.id,
                title: conv.title,
                lastMessage: conv.lastMessage,
                timestamp: Date(timeIntervalSince1970: conv.timestamp)
            )
        }
    }

    private var sampleConversations: [ConversationItem] {
        [
            ConversationItem(id: "1", title: "Weather Today", lastMessage: "It's sunny with 22°C", timestamp: Date()),
            ConversationItem(id: "2", title: "Recipe Ideas", lastMessage: "Try this pasta recipe...", timestamp: Date().addingTimeInterval(-3600)),
            ConversationItem(id: "3", title: "Code Help", lastMessage: "Here's how to fix it...", timestamp: Date().addingTimeInterval(-7200))
        ]
    }
}

struct StoredConversation: Codable {
    let id: String
    let title: String
    let lastMessage: String
    let timestamp: Double
}

struct RecentConversationsWidgetEntryView: View {
    var entry: RecentConversationsProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            Color(hex: "1a1a1a")

            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Image(systemName: "clock.arrow.circlepath")
                        .foregroundColor(Color(hex: "10a37f"))
                    Text("Recent Chats")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }
                .padding(.bottom, 4)

                // Conversations list
                if entry.conversations.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "bubble.left.and.bubble.right")
                                .font(.largeTitle)
                                .foregroundColor(.gray)
                            Text("No recent chats")
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    Spacer()
                } else {
                    ForEach(entry.conversations.prefix(maxItems)) { conversation in
                        Link(destination: URL(string: "lisa://conversation/\(conversation.id)")!) {
                            ConversationRow(conversation: conversation)
                        }
                    }
                }

                Spacer()
            }
            .padding()
        }
    }

    private var maxItems: Int {
        switch family {
        case .systemSmall: return 2
        case .systemMedium: return 3
        case .systemLarge: return 6
        default: return 3
        }
    }
}

struct ConversationRow: View {
    let conversation: ConversationItem

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(hex: "10a37f"))
                .frame(width: 32, height: 32)
                .overlay(
                    Text(String(conversation.title.prefix(1)))
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(conversation.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(1)

                Text(conversation.lastMessage)
                    .font(.caption)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }

            Spacer()

            Text(timeAgo(from: conversation.timestamp))
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
    }

    private func timeAgo(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

struct RecentConversationsWidget: Widget {
    let kind: String = "RecentConversationsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RecentConversationsProvider()) { entry in
            RecentConversationsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Recent Chats")
        .description("Quick access to your recent Lisa conversations.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview

struct RecentConversationsWidget_Previews: PreviewProvider {
    static var previews: some View {
        RecentConversationsWidgetEntryView(
            entry: RecentConversationsEntry(
                date: Date(),
                conversations: [
                    ConversationItem(id: "1", title: "Weather", lastMessage: "Sunny today", timestamp: Date()),
                    ConversationItem(id: "2", title: "Code Help", lastMessage: "Fixed the bug", timestamp: Date().addingTimeInterval(-3600))
                ]
            )
        )
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
