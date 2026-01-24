import WidgetKit
import SwiftUI

@main
struct LisaWidgetsBundle: WidgetBundle {
    var body: some Widget {
        QuickChatWidget()
        RecentConversationsWidget()
    }
}
