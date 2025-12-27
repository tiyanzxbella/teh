# @mkzz/teh - Lightweight Telegram Bot API

[![npm version](https://img.shields.io/npm/v/teh.svg)](https://www.npmjs.com/package/@mkzz/teh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, high-performance Telegram Bot API module with **zero dependencies**. Built for speed, stability, and simplicity.

## Features

- **Zero Dependencies** - Only native Node.js modules
- **High Performance** - Optimized HTTP requests with connection pooling
- **Full API Coverage** - Complete Telegram Bot API implementation
- **Event-Driven** - Built on Node.js EventEmitter
- **Middleware Support** - Express-style middleware system
- **Smart Rate Limiting** - Automatic request queuing and retry logic
- **Both Polling & Webhooks** - Choose your preferred update method
- **TypeScript Support** - Full TypeScript definitions included
- **Small Bundle Size** - Minimal footprint for fast deployments
- **Clean API** - Intuitive, chainable methods

## Installation

```bash
npm install @mkzz/teh
```

## Quick Start

```javascript
const TelegramBot = require('@mkzz/teh');

const bot = new TelegramBot('YOUR_BOT_TOKEN', {
  polling: true
});

bot.command('start', async (ctx) => {
  await ctx.reply('Hello! Welcome to my bot!');
});

bot.on('text', async (message, ctx) => {
  await ctx.reply(`You said: ${message.text}`);
});
```

## Table of Contents

- [Basic Usage](#basic-usage)
- [Polling vs Webhooks](#polling-vs-webhooks)
- [Sending Messages](#sending-messages)
- [Keyboards](#keyboards)
- [Commands](#commands)
- [Middleware](#middleware)
- [Events](#events)
- [File Handling](#file-handling)
- [Error Handling](#error-handling)
- [API Reference](#api-reference)

## Basic Usage

### Initializing the Bot

```javascript
const TelegramBot = require('@mkzz/teh');

const bot = new TelegramBot('YOUR_BOT_TOKEN', {
  polling: true,
  pollingInterval: 1000,
  pollingTimeout: 30
});
```

### Options

- `polling` (boolean) - Enable long polling (default: false)
- `pollingInterval` (number) - Polling interval in ms (default: 1000)
- `pollingTimeout` (number) - Long polling timeout in seconds (default: 30)
- `webhook` (boolean) - Enable webhook mode (default: false)
- `webhookPort` (number) - Webhook server port (default: 3000)
- `webhookPath` (string) - Webhook URL path (default: '/webhook')
- `requestTimeout` (number) - HTTP request timeout in ms (default: 30000)
- `allowedUpdates` (array) - List of update types to receive

## Polling vs Webhooks

### Polling Mode

```javascript
const bot = new TelegramBot(token, { polling: true });

bot.startPolling();

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});
```

### Webhook Mode

```javascript
const bot = new TelegramBot(token, {
  webhook: true,
  webhookPort: 8443,
  webhookPath: '/bot-webhook'
});

await bot.setWebhook('https://yourdomain.com/bot-webhook');

bot.on('webhook_start', (port) => {
  console.log(`Webhook server started on port ${port}`);
});
```

## Sending Messages

### Text Messages

```javascript
await bot.sendMessage(chatId, 'Hello World!');

await bot.sendMessage(chatId, '*Bold* and _italic_ text', {
  parse_mode: 'Markdown'
});

await bot.sendMessage(chatId, '<b>Bold</b> and <i>italic</i> text', {
  parse_mode: 'HTML'
});
```

### Photos

```javascript
await bot.sendPhoto(chatId, 'https://example.com/image.jpg');

await bot.sendPhoto(chatId, '/path/to/local/image.jpg');

await bot.sendPhoto(chatId, 'file_id_from_telegram');

await bot.sendPhoto(chatId, photoBuffer);
```

### Documents

```javascript
await bot.sendDocument(chatId, '/path/to/document.pdf', {
  caption: 'Here is your document'
});
```

### Other Media Types

```javascript
await bot.sendVideo(chatId, videoPath);
await bot.sendAudio(chatId, audioPath);
await bot.sendVoice(chatId, voicePath);
await bot.sendSticker(chatId, stickerId);
await bot.sendAnimation(chatId, gifPath);
```

### Location

```javascript
await bot.sendLocation(chatId, latitude, longitude);
```

### Contact

```javascript
await bot.sendContact(chatId, '+1234567890', 'John Doe');
```

### Poll

```javascript
await bot.sendPoll(chatId, 'What is your favorite color?', [
  'Red',
  'Blue',
  'Green',
  'Yellow'
]);
```

## Keyboards

### Inline Keyboards

```javascript
const keyboard = TelegramBot.InlineKeyboard()
  .text('Button 1', 'callback_data_1')
  .text('Button 2', 'callback_data_2')
  .row()
  .url('Visit Website', 'https://example.com')
  .build();

await bot.sendMessage(chatId, 'Choose an option:', {
  reply_markup: keyboard
});

bot.on('callback_query', async (query, ctx) => {
  if (query.data === 'callback_data_1') {
    await ctx.answerCallbackQuery({ text: 'You clicked Button 1!' });
    await ctx.editMessageText('You selected Button 1');
  }
});
```

### Reply Keyboards

```javascript
const keyboard = TelegramBot.ReplyKeyboard()
  .text('Option 1')
  .text('Option 2')
  .row()
  .text('Option 3')
  .resize()
  .oneTime()
  .build();

await bot.sendMessage(chatId, 'Select an option:', {
  reply_markup: keyboard
});
```

### Remove Keyboard

```javascript
await bot.sendMessage(chatId, 'Keyboard removed', {
  reply_markup: TelegramBot.RemoveKeyboard()
});
```

### Request Contact/Location

```javascript
const keyboard = TelegramBot.ReplyKeyboard()
  .requestContact('Share Contact')
  .row()
  .requestLocation('Share Location')
  .resize()
  .build();

await bot.sendMessage(chatId, 'Please share your info:', {
  reply_markup: keyboard
});
```

## Commands

### Basic Commands

```javascript
bot.command('start', async (ctx) => {
  await ctx.reply('Welcome! Use /help to see available commands.');
});

bot.command('help', async (ctx) => {
  await ctx.reply('Available commands:\n/start - Start the bot\n/help - Show this message');
});
```

### Multiple Command Aliases

```javascript
bot.command(['info', 'about'], async (ctx) => {
  await ctx.reply('Bot information...');
});
```

### Command with Arguments

```javascript
bot.on('text', async (message, ctx) => {
  if (message.text.startsWith('/greet')) {
    const args = message.text.split(' ').slice(1);
    const name = args.join(' ') || 'stranger';
    await ctx.reply(`Hello, ${name}!`);
  }
});
```

## Middleware

### Basic Middleware

```javascript
bot.use(async (ctx, next) => {
  console.log('Received update:', ctx.update.update_id);
  await next();
});

bot.use(async (ctx, next) => {
  ctx.startTime = Date.now();
  await next();
  const duration = Date.now() - ctx.startTime;
  console.log(`Request took ${duration}ms`);
});
```

### Authentication Middleware

```javascript
const AUTHORIZED_USERS = [123456789, 987654321];

bot.use(async (ctx, next) => {
  if (ctx.from && AUTHORIZED_USERS.includes(ctx.from.id)) {
    await next();
  } else {
    await ctx.reply('You are not authorized to use this bot.');
  }
});
```

### Logging Middleware

```javascript
bot.use(async (ctx, next) => {
  const user = ctx.from?.username || ctx.from?.id || 'unknown';
  const message = ctx.message?.text || 'no text';
  console.log(`[${new Date().toISOString()}] ${user}: ${message}`);
  await next();
});
```

## Events

### Message Events

```javascript
bot.on('message', (message, ctx) => {
  console.log('New message:', message);
});

bot.on('text', async (message, ctx) => {
  console.log('Text message:', message.text);
});

bot.on('photo', async (message, ctx) => {
  console.log('Photo received:', message.photo);
});

bot.on('document', async (message, ctx) => {
  console.log('Document received:', message.document);
});

bot.on('video', async (message, ctx) => {
  console.log('Video received:', message.video);
});

bot.on('sticker', async (message, ctx) => {
  await ctx.reply('Nice sticker!');
});

bot.on('location', async (message, ctx) => {
  const { latitude, longitude } = message.location;
  await ctx.reply(`You are at: ${latitude}, ${longitude}`);
});

bot.on('contact', async (message, ctx) => {
  await ctx.reply(`Contact received: ${message.contact.first_name}`);
});
```

### Update Events

```javascript
bot.on('edited_message', (message, ctx) => {
  console.log('Message edited');
});

bot.on('callback_query', async (query, ctx) => {
  await ctx.answerCallbackQuery();
});

bot.on('inline_query', async (query, ctx) => {
  console.log('Inline query:', query.query);
});
```

### Error Events

```javascript
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error);
});
```

## File Handling

### Download Files

```javascript
bot.on('document', async (message, ctx) => {
  const fileId = message.document.file_id;

  try {
    await bot.downloadFile(fileId, './downloads/document.pdf');
    await ctx.reply('File downloaded successfully!');
  } catch (error) {
    await ctx.reply('Failed to download file.');
  }
});
```

### Get File Info

```javascript
const file = await bot.getFile(fileId);
console.log('File path:', file.file_path);
console.log('File size:', file.file_size);
```

## Error Handling

### Try-Catch Pattern

```javascript
bot.command('start', async (ctx) => {
  try {
    await ctx.reply('Welcome!');
  } catch (error) {
    console.error('Failed to send message:', error);
  }
});
```

### Global Error Handler

```javascript
bot.on('error', (error) => {
  if (error.code === 403) {
    console.error('Bot was blocked by user');
  } else if (error.code === 429) {
    console.error('Rate limit exceeded');
  } else {
    console.error('Unexpected error:', error);
  }
});
```

## API Reference

### Bot Methods

#### Message Methods
- `sendMessage(chatId, text, options)` - Send text message
- `sendPhoto(chatId, photo, options)` - Send photo
- `sendAudio(chatId, audio, options)` - Send audio
- `sendDocument(chatId, document, options)` - Send document
- `sendVideo(chatId, video, options)` - Send video
- `sendAnimation(chatId, animation, options)` - Send animation/GIF
- `sendVoice(chatId, voice, options)` - Send voice message
- `sendVideoNote(chatId, videoNote, options)` - Send video note
- `sendSticker(chatId, sticker, options)` - Send sticker
- `sendLocation(chatId, latitude, longitude, options)` - Send location
- `sendVenue(chatId, latitude, longitude, title, address, options)` - Send venue
- `sendContact(chatId, phoneNumber, firstName, options)` - Send contact
- `sendPoll(chatId, question, options, params)` - Send poll
- `sendDice(chatId, options)` - Send dice
- `sendChatAction(chatId, action)` - Send chat action

#### Edit Methods
- `editMessageText(text, options)` - Edit message text
- `editMessageCaption(options)` - Edit message caption
- `editMessageReplyMarkup(options)` - Edit reply markup
- `deleteMessage(chatId, messageId)` - Delete message

#### Forward Methods
- `forwardMessage(chatId, fromChatId, messageId, options)` - Forward message
- `copyMessage(chatId, fromChatId, messageId, options)` - Copy message

#### Chat Methods
- `getChat(chatId)` - Get chat info
- `getChatAdministrators(chatId)` - Get chat administrators
- `getChatMemberCount(chatId)` - Get member count
- `getChatMember(chatId, userId)` - Get chat member
- `setChatTitle(chatId, title)` - Set chat title
- `setChatDescription(chatId, description)` - Set chat description
- `pinChatMessage(chatId, messageId, options)` - Pin message
- `unpinChatMessage(chatId, options)` - Unpin message
- `unpinAllChatMessages(chatId)` - Unpin all messages
- `leaveChat(chatId)` - Leave chat
- `banChatMember(chatId, userId, options)` - Ban member
- `unbanChatMember(chatId, userId, options)` - Unban member
- `restrictChatMember(chatId, userId, permissions, options)` - Restrict member
- `promoteChatMember(chatId, userId, options)` - Promote member

#### File Methods
- `getFile(fileId)` - Get file info
- `downloadFile(fileId, destination)` - Download file

#### Other Methods
- `getMe()` - Get bot info
- `answerCallbackQuery(callbackQueryId, options)` - Answer callback query
- `answerInlineQuery(inlineQueryId, results, options)` - Answer inline query

### Context Object

The context object (`ctx`) is passed to command handlers and middleware:

```javascript
{
  update,              // Original update object
  bot,                 // Bot instance
  message,             // Message object (if available)
  callbackQuery,       // Callback query (if available)
  inlineQuery,         // Inline query (if available)
  chat,                // Chat object
  from,                // User object
  chatId,              // Chat ID
  reply,               // Reply to current chat
  replyWithPhoto,      // Reply with photo
  replyWithDocument,   // Reply with document
  editMessageText,     // Edit message text
  answerCallbackQuery, // Answer callback query
  deleteMessage        // Delete message
}
```

## Performance Tips

1. **Use Rate Limiting**: The bot automatically handles rate limits with smart retry logic
2. **Batch Requests**: When possible, batch multiple operations
3. **Use Webhooks in Production**: Webhooks are more efficient than polling for production bots
4. **Enable Compression**: Use reverse proxy (nginx) with gzip for webhook endpoints
5. **Connection Pooling**: The module uses optimized HTTP connection handling

## Best Practices

1. **Always Handle Errors**: Use try-catch blocks and error event listeners
2. **Validate User Input**: Always validate and sanitize user input
3. **Use Middleware for Common Tasks**: Authentication, logging, etc.
4. **Set Request Timeouts**: Adjust timeouts based on your needs
5. **Implement Graceful Shutdown**: Clean up resources on exit

```javascript
process.on('SIGINT', () => {
  bot.stopPolling();
  console.log('Bot stopped gracefully');
  process.exit(0);
});
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/kazedevid/teh/issues) page.