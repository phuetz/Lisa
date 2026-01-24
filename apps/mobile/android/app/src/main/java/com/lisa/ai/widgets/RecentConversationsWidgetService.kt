package com.lisa.ai.widgets

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.lisa.ai.R

/**
 * Service for providing data to RecentConversationsWidget
 */
class RecentConversationsWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return RecentConversationsRemoteViewsFactory(applicationContext)
    }
}

class RecentConversationsRemoteViewsFactory(
    private val context: Context
) : RemoteViewsService.RemoteViewsFactory {

    private var conversations: List<ConversationItem> = emptyList()

    data class ConversationItem(
        val id: String,
        val title: String,
        val lastMessage: String,
        val timestamp: String
    )

    override fun onCreate() {
        // Initialize data
    }

    override fun onDataSetChanged() {
        // Load conversations from shared preferences or database
        conversations = loadConversations()
    }

    private fun loadConversations(): List<ConversationItem> {
        val prefs = context.getSharedPreferences("lisa_widget_data", Context.MODE_PRIVATE)
        val conversationsJson = prefs.getString("recent_conversations", null)

        // Parse JSON and return conversations
        // For now, return empty list - will be populated by widgetService
        return try {
            if (conversationsJson != null) {
                // Parse JSON array
                val items = mutableListOf<ConversationItem>()
                // TODO: Implement JSON parsing
                items
            } else {
                emptyList()
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    override fun onDestroy() {
        conversations = emptyList()
    }

    override fun getCount(): Int = conversations.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_conversation_item)

        if (position < conversations.size) {
            val conversation = conversations[position]
            views.setTextViewText(R.id.conversation_title, conversation.title)
            views.setTextViewText(R.id.conversation_preview, conversation.lastMessage)
            views.setTextViewText(R.id.conversation_timestamp, conversation.timestamp)

            // Set fill-in intent for this item
            val fillInIntent = Intent().apply {
                putExtra(RecentConversationsWidget.EXTRA_CONVERSATION_ID, conversation.id)
            }
            views.setOnClickFillInIntent(R.id.conversation_item_container, fillInIntent)
        }

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = true
}
