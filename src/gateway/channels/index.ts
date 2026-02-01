/**
 * Lisa Gateway Channels - Multi-platform messaging
 *
 * NOTE: Real bot implementations (Discord, Telegram, WhatsApp, Slack)
 * require Node.js and cannot run in the browser.
 *
 * For browser usage, only types are exported.
 * For server usage, import directly from the specific bot file.
 */

// Export types only for browser compatibility
export type { DiscordConfig, DiscordMessage, DiscordState } from './DiscordBot.browser';
export type { TelegramConfig, TelegramMessage, TelegramState } from './TelegramBot.browser';
export type { WhatsAppConfig, WhatsAppMessage, WhatsAppState } from './WhatsAppBot.browser';
export type { SlackConfig, SlackMessage, SlackState } from './SlackBot.browser';

// Export browser stubs (these work in browser, but don't connect to actual services)
export { DiscordBot, getDiscordBot, resetDiscordBot } from './DiscordBot.browser';
export { TelegramBot, getTelegramBot, resetTelegramBot } from './TelegramBot.browser';
export { WhatsAppBot, getWhatsAppBot, resetWhatsAppBot } from './WhatsAppBot.browser';
export { SlackBot, getSlackBot, resetSlackBot } from './SlackBot.browser';

/**
 * For server-side usage (Node.js only), import directly:
 *
 * import { DiscordBot } from './gateway/channels/DiscordBot';
 * import { TelegramBot } from './gateway/channels/TelegramBot';
 * import { WhatsAppBot } from './gateway/channels/WhatsAppBot';
 * import { SlackBot } from './gateway/channels/SlackBot';
 */
