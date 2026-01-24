import WidgetKit
import SwiftUI

// MARK: - Quick Chat Widget

struct QuickChatEntry: TimelineEntry {
    let date: Date
    let placeholder: String
}

struct QuickChatProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickChatEntry {
        QuickChatEntry(date: Date(), placeholder: "Ask Lisa anything...")
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickChatEntry) -> Void) {
        let entry = QuickChatEntry(date: Date(), placeholder: "Ask Lisa anything...")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickChatEntry>) -> Void) {
        let entry = QuickChatEntry(date: Date(), placeholder: "Ask Lisa anything...")
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct QuickChatWidgetEntryView: View {
    var entry: QuickChatProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "1a1a1a"), Color(hex: "2d2d2d")]),
                startPoint: .top,
                endPoint: .bottom
            )

            VStack(spacing: 12) {
                // Header
                HStack {
                    Image(systemName: "message.fill")
                        .foregroundColor(Color(hex: "10a37f"))
                    Text("Lisa")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }

                // Input field appearance
                HStack {
                    Text(entry.placeholder)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                    Spacer()
                    Image(systemName: "arrow.up.circle.fill")
                        .foregroundColor(Color(hex: "10a37f"))
                        .font(.title2)
                }
                .padding(12)
                .background(Color(hex: "404040"))
                .cornerRadius(20)

                if family != .systemSmall {
                    // Quick actions
                    HStack(spacing: 8) {
                        QuickActionButton(icon: "mic.fill", label: "Voice")
                        QuickActionButton(icon: "plus.circle.fill", label: "New")
                        QuickActionButton(icon: "clock.fill", label: "Recent")
                    }
                }
            }
            .padding()
        }
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(Color(hex: "10a37f"))
            Text(label)
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(hex: "404040"))
        .cornerRadius(8)
    }
}

struct QuickChatWidget: Widget {
    let kind: String = "QuickChatWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickChatProvider()) { entry in
            QuickChatWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Quick Chat")
        .description("Start a conversation with Lisa instantly.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview

struct QuickChatWidget_Previews: PreviewProvider {
    static var previews: some View {
        QuickChatWidgetEntryView(entry: QuickChatEntry(date: Date(), placeholder: "Ask Lisa anything..."))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
