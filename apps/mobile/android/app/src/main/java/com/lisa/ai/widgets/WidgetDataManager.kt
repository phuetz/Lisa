package com.lisa.ai.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * WidgetDataManager - Manages data synchronization between app and widgets
 */
class WidgetDataManager(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("lisa_widget_data", Context.MODE_PRIVATE)

    /**
     * Update recent conversations data for widgets
     */
    fun updateRecentConversations(conversations: List<ConversationData>) {
        val jsonArray = JSONArray()
        conversations.take(5).forEach { conv ->
            val jsonObj = JSONObject().apply {
                put("id", conv.id)
                put("title", conv.title)
                put("lastMessage", conv.lastMessage)
                put("timestamp", conv.timestamp)
            }
            jsonArray.put(jsonObj)
        }

        prefs.edit()
            .putString("recent_conversations", jsonArray.toString())
            .apply()

        // Notify widgets to update
        notifyWidgetUpdate(RecentConversationsWidget::class.java)
    }

    /**
     * Update stats for StatsWidget
     */
    fun updateStats(stats: StatsData) {
        prefs.edit()
            .putInt("total_conversations", stats.totalConversations)
            .putInt("total_messages", stats.totalMessages)
            .putInt("messages_today", stats.messagesToday)
            .putString("favorite_agent", stats.favoriteAgent)
            .apply()

        notifyWidgetUpdate(StatsWidget::class.java)
    }

    /**
     * Get stats from shared preferences
     */
    fun getStats(): StatsData {
        return StatsData(
            totalConversations = prefs.getInt("total_conversations", 0),
            totalMessages = prefs.getInt("total_messages", 0),
            messagesToday = prefs.getInt("messages_today", 0),
            favoriteAgent = prefs.getString("favorite_agent", null)
        )
    }

    /**
     * Notify widgets to update their display
     */
    private fun <T : android.appwidget.AppWidgetProvider> notifyWidgetUpdate(widgetClass: Class<T>) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, widgetClass)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        if (appWidgetIds.isNotEmpty()) {
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, android.R.id.list)
        }
    }

    /**
     * Refresh all widgets
     */
    fun refreshAllWidgets() {
        val appWidgetManager = AppWidgetManager.getInstance(context)

        // Refresh QuickChatWidget
        val quickChatComponent = ComponentName(context, QuickChatWidget::class.java)
        val quickChatIds = appWidgetManager.getAppWidgetIds(quickChatComponent)
        quickChatIds.forEach { id ->
            QuickChatWidget.updateAppWidget(context, appWidgetManager, id)
        }

        // Refresh RecentConversationsWidget
        val recentComponent = ComponentName(context, RecentConversationsWidget::class.java)
        val recentIds = appWidgetManager.getAppWidgetIds(recentComponent)
        recentIds.forEach { id ->
            RecentConversationsWidget.updateAppWidget(context, appWidgetManager, id)
        }

        // Refresh StatsWidget
        val statsComponent = ComponentName(context, StatsWidget::class.java)
        val statsIds = appWidgetManager.getAppWidgetIds(statsComponent)
        statsIds.forEach { id ->
            StatsWidget.updateAppWidget(context, appWidgetManager, id)
        }
    }

    data class ConversationData(
        val id: String,
        val title: String,
        val lastMessage: String,
        val timestamp: String
    )

    data class StatsData(
        val totalConversations: Int,
        val totalMessages: Int,
        val messagesToday: Int,
        val favoriteAgent: String?
    )
}
