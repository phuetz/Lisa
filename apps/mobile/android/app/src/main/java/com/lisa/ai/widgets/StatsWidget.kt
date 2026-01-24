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
 * StatsWidget - Widget showing Lisa usage statistics
 */
class StatsWidget : AppWidgetProvider() {

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
        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_stats)

            // Load stats from WidgetDataManager
            val dataManager = WidgetDataManager(context)
            val stats = dataManager.getStats()

            // Update views with stats
            views.setTextViewText(R.id.stat_conversations, stats.totalConversations.toString())
            views.setTextViewText(R.id.stat_messages, stats.totalMessages.toString())
            views.setTextViewText(R.id.stat_today, stats.messagesToday.toString())
            views.setTextViewText(
                R.id.stat_favorite_agent,
                stats.favoriteAgent ?: "Aucun"
            )

            // Click to open app
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_stats_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
