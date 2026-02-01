/**
 * Lisa Channels - Main exports
 * Multi-channel communication inspired by OpenClaw
 */

export { TelegramChannel, createTelegramChannel } from './TelegramChannel';
export type { TelegramConfig, TelegramMessage } from './TelegramChannel';

export { DiscordChannel, createDiscordChannel } from './DiscordChannel';
export type { DiscordConfig, DiscordMessage } from './DiscordChannel';

export { SlackChannel, createSlackChannel } from './SlackChannel';
export type { SlackConfig, SlackMessage } from './SlackChannel';
