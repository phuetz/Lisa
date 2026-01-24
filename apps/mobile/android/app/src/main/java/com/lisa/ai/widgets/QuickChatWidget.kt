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
 * QuickChatWidget - Widget for quick access to Lisa chat
 * Displays a simple input field and quick action buttons
 */
class QuickChatWidget : AppWidgetProvider() {

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
        const val ACTION_OPEN_CHAT = "com.lisa.ai.widgets.ACTION_OPEN_CHAT"
        const val ACTION_VOICE_INPUT = "com.lisa.ai.widgets.ACTION_VOICE_INPUT"
        const val ACTION_NEW_CHAT = "com.lisa.ai.widgets.ACTION_NEW_CHAT"

        internal fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_chat)

            // Open chat intent
            val openChatIntent = Intent(context, MainActivity::class.java).apply {
                action = ACTION_OPEN_CHAT
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openChatPendingIntent = PendingIntent.getActivity(
                context,
                0,
                openChatIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_input_field, openChatPendingIntent)

            // Voice input intent
            val voiceIntent = Intent(context, MainActivity::class.java).apply {
                action = ACTION_VOICE_INPUT
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val voicePendingIntent = PendingIntent.getActivity(
                context,
                1,
                voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_voice_button, voicePendingIntent)

            // New chat intent
            val newChatIntent = Intent(context, MainActivity::class.java).apply {
                action = ACTION_NEW_CHAT
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val newChatPendingIntent = PendingIntent.getActivity(
                context,
                2,
                newChatIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_new_chat_button, newChatPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
