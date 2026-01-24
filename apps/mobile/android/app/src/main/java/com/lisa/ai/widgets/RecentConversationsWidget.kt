package com.lisa.ai.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.lisa.ai.R
import com.lisa.ai.MainActivity

/**
 * RecentConversationsWidget - Widget showing recent conversations
 * Allows quick access to recent chat threads
 */
class RecentConversationsWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget first enabled
    }

    override fun onDisabled(context: Context) {
        // Widget disabled
    }

    companion object {
        const val ACTION_OPEN_CONVERSATION = "com.lisa.ai.widgets.ACTION_OPEN_CONVERSATION"
        const val EXTRA_CONVERSATION_ID = "conversation_id"

        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_recent_conversations)

            // Set up the intent for the list view adapter
            val intent = Intent(context, RecentConversationsWidgetService::class.java)
            views.setRemoteAdapter(R.id.widget_conversations_list, intent)

            // Set up the pending intent template for list items
            val openConversationIntent = Intent(context, MainActivity::class.java).apply {
                action = ACTION_OPEN_CONVERSATION
            }
            val pendingIntentTemplate = PendingIntent.getActivity(
                context,
                0,
                openConversationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.widget_conversations_list, pendingIntentTemplate)

            // Header click opens app
            val headerIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val headerPendingIntent = PendingIntent.getActivity(
                context,
                1,
                headerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_header, headerPendingIntent)

            // Empty view
            views.setEmptyView(R.id.widget_conversations_list, R.id.widget_empty_view)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
