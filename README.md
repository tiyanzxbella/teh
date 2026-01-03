# TehBot Library

> High-performance, zero-dependency Telegram Bot API library for Node.js with full Bot API v9.3 support.

[![npm version](https://img.shields.io/npm/v/tehbot-library.svg)](https://www.npmjs.com/package/tehbot-library)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/node/v/tehbot-library)](https://nodejs.org)
[![API Version](https://img.shields.io/badge/Telegram%20Bot%20API-v9.3-blue)](https://core.telegram.org/bots/api)

## Features

- **Zero Dependencies** - Pure Node.js implementation with no external packages
- **Full API v9.3 Coverage** - Support for all latest Telegram Bot API features including Gifts, Forum Topics, Message Drafts, and Payments
- **High Performance** - Direct HTTPS communication with efficient request handling and streaming multipart uploads
- **TypeScript Ready** - Complete type definitions for superior developer experience
- **Flexible Architecture** - Supports both polling and webhooks out of the box
- **Context-Aware** - Simplified message handling with rich context objects
- **Middleware System** - Extensible middleware pipeline for custom logic
- **Keyboard Builders** - Fluent API for creating inline and reply keyboards
- **File Handling** - Seamless upload/download from files, URLs, buffers, and streams

## Installation

```bash
npm install tehbot-library
```

Or using yarn:

```bash
yarn add tehbot-library
```

## Quick Start

```javascript
const TelegramBot = require('tehbot-library');

const bot = new TelegramBot('YOUR_BOT_TOKEN', {
  polling: true
});

// Respond to text messages
bot.on('text', async (message, ctx) => {
  await ctx.reply(`You said: ${message.text}`);
});

// Handle commands
bot.command('/start', async (ctx) => {
  await ctx.send('Welcome! I am your bot.');
});

console.log('Bot is running...');
```

## Core Concepts

### Initialization

Create a bot instance with configuration options:

```javascript
const bot = new TelegramBot('YOUR_BOT_TOKEN', {
  polling: true,              // Enable automatic polling
  pollingInterval: 1000,      // Poll every 1 second
  pollingTimeout: 30,         // Long polling timeout
  webhook: false,             // Use webhooks instead of polling
  webhookPort: 3000,          // Webhook server port
  webhookPath: '/webhook',    // Webhook endpoint path
  requestTimeout: 30000,      // Request timeout in milliseconds
  baseApiUrl: 'https://api.telegram.org',
  apiVersion: '9.3'
});
```

### Polling vs Webhooks

**Polling** (recommended for development):
```javascript
const bot = new TelegramBot(token, { polling: true });

bot.on('polling_start', () => console.log('Polling started'));
bot.on('polling_error', (err) => console.error('Polling error:', err));
```

**Webhooks** (recommended for production):
```javascript
const bot = new TelegramBot(token, {
  webhook: true,
  webhookPort: 8443,
  webhookPath: '/bot-webhook'
});

await bot.setWebhook('https://yourdomain.com/bot-webhook');
```

### Context Object

The context object provides convenient access to update data and helper methods:

```javascript
bot.on('message', async (message, ctx) => {
  // Access update components
  console.log(ctx.message);  // Current message
  console.log(ctx.chat);     // Chat information
  console.log(ctx.from);     // User who sent message
  
  // Helper methods
  await ctx.send('Hello!');
  await ctx.reply('Reply to this message');
  await ctx.replyWithPhoto('photo.jpg');
  await ctx.editMessageText('Updated text');
  await ctx.answerCallbackQuery({ text: 'Success!' });
});
```

### Middleware

Add middleware functions to process updates:

```javascript
// Logger middleware
bot.use(async (ctx, next) => {
  console.log('Update:', ctx.update.update_id);
  await next();
});

// Authentication middleware
bot.use(async (ctx, next) => {
  if (ctx.from?.id === ADMIN_ID) {
    await next();
  } else {
    await ctx.reply('Unauthorized');
  }
});
```

## Sending Messages

### Text Messages

```javascript
// Simple text
await bot.sendMessage(chatId, 'Hello, World!');

// With formatting
await bot.sendMessage(chatId, '**Bold** and *italic*', {
  parse_mode: 'Markdown'
});

// HTML formatting
await bot.sendMessage(chatId, '<b>Bold</b> and <i>italic</i>', {
  parse_mode: 'HTML'
});
```

### Media Messages

```javascript
// Photo
await bot.sendPhoto(chatId, 'photo.jpg', {
  caption: 'Beautiful photo!'
});

// Video
await bot.sendVideo(chatId, 'video.mp4', {
  caption: 'Check this out',
  supports_streaming: true
});

// Document
await bot.sendDocument(chatId, 'report.pdf', {
  caption: 'Monthly report'
});

// Audio
await bot.sendAudio(chatId, 'song.mp3', {
  title: 'Song Title',
  performer: 'Artist Name'
});

// Location
await bot.sendLocation(chatId, 37.7749, -122.4194);

// Poll
await bot.sendPoll(chatId, 'What is your favorite color?', [
  'Red', 'Blue', 'Green', 'Yellow'
]);
```

### Unified sendMessage

Send text or media using a single method:

```javascript
// Text
await bot.sendMessage(chatId, 'Hello!');

// Photo with caption
await bot.sendMessage(chatId, {
  image: 'photo.jpg',
  caption: 'Nice photo'
});

// Video
await bot.sendMessage(chatId, {
  video: 'video.mp4',
  caption: 'Tutorial video'
});
```

## Message Management

```javascript
// Edit message
await bot.editMessageText('Updated text', {
  chat_id: chatId,
  message_id: messageId
});

// Delete message
await bot.deleteMessage(chatId, messageId);

// Forward message
await bot.forwardMessage(toChatId, fromChatId, messageId);

// Copy message (without forward header)
await bot.copyMessage(toChatId, fromChatId, messageId);
```

## Keyboards

### Inline Keyboards

```javascript
const { InlineKeyboardBuilder } = require('tehbot-library');

const keyboard = new InlineKeyboardBuilder()
  .text('Button 1', 'callback_1')
  .text('Button 2', 'callback_2')
  .row()
  .url('Visit Website', 'https://example.com')
  .row()
  .switchInline('Share', 'Check this out!')
  .build();

await bot.sendMessage(chatId, 'Choose an option:', {
  reply_markup: keyboard
});

// Handle button clicks
bot.on('callback_query', async (query, ctx) => {
  if (query.data === 'callback_1') {
    await ctx.answerCallbackQuery({ text: 'Button 1 pressed!' });
    await ctx.editMessageText('You selected Button 1');
  }
});
```

### Reply Keyboards

```javascript
const { ReplyKeyboardBuilder } = require('tehbot-library');

const keyboard = new ReplyKeyboardBuilder()
  .text('Option 1')
  .text('Option 2')
  .row()
  .requestContact('Share Contact')
  .requestLocation('Share Location')
  .row()
  .requestPoll('Create Poll', 'quiz')
  .resize()
  .oneTime()
  .placeholder('Choose an option...')
  .build();

await bot.sendMessage(chatId, 'Select:', {
  reply_markup: keyboard
});
```

## Bot API v9.3 Features

### Message Drafts

Stream partial messages for real-time updates:

```javascript
// Start streaming message
const draft = await bot.sendMessageDraft(chatId, 'Starting...');

// Update progressively
await bot.editMessageText('Processing step 1...', {
  chat_id: chatId,
  message_id: draft.message_id
});

await bot.editMessageText('Final result!', {
  chat_id: chatId,
  message_id: draft.message_id
});
```

### Gifts & Assets

Manage Telegram gifts and digital assets:

```javascript
// Get user's gifts
const gifts = await bot.getUserGifts(userId);

gifts.forEach(gift => {
  console.log(`Gift ID: ${gift.id}`);
  console.log(`Star Count: ${gift.star_count}`);
  console.log(`Premium: ${gift.is_premium}`);
});

// Get chat gifts
const chatGifts = await bot.getChatGifts(chatId);

// Filter blockchain gifts
const blockchainGifts = await bot.getUserGifts(userId, {
  exclude_from_blockchain: false
});
```

### Forum Topics in Private Chats

```javascript
// Send to specific topic
await bot.sendMessage(chatId, 'Topic message', {
  message_thread_id: 123
});

// Edit forum topic
await bot.editForumTopic(chatId, topicId, {
  name: 'Updated Topic Name',
  icon_custom_emoji_id: '5370869711888194012'
});

// Delete forum topic
await bot.deleteForumTopic(chatId, topicId);

// Unpin all topic messages
await bot.unpinAllForumTopicMessages(chatId, topicId);
```

## Payments API

TehBot provides full support for Telegram's Payment API:

```javascript
// Send invoice
await bot.sendInvoice(
  chatId,
  'Premium Subscription',
  '1 month access',
  'premium-payload',
  process.env.PROVIDER_TOKEN,
  'USD',
  [{ label: 'Plan', amount: 999 }]
);

// Answer pre-checkout query
bot.on('pre_checkout_query', async (query) => {
  await bot.answerPreCheckoutQuery(query.id, true);
});

// Handle successful payment
bot.on('successful_payment', async (payment, ctx) => {
  await ctx.reply('✅ Payment successful!');
});

// Telegram Stars
const transactions = await bot.getStarTransactions({ limit: 50 });
await bot.refundStarPayment(userId, chargeId);
```

## Chat Management

```javascript
// Get chat information
const chat = await bot.getChat(chatId);
const memberCount = await bot.getChatMemberCount(chatId);
const admins = await bot.getChatAdministrators(chatId);
const member = await bot.getChatMember(chatId, userId);

// Admin actions
await bot.setChatTitle(chatId, 'New Group Title');
await bot.setChatDescription(chatId, 'Updated description');
await bot.pinChatMessage(chatId, messageId);
await bot.unpinAllChatMessages(chatId);

// Member management
await bot.banChatMember(chatId, userId);
await bot.unbanChatMember(chatId, userId);
await bot.restrictChatMember(chatId, userId, {
  can_send_messages: false
});
await bot.promoteChatMember(chatId, userId, {
  can_delete_messages: true,
  can_restrict_members: true
});
```

## File Handling

```javascript
// Get file info
const file = await bot.getFile(fileId);

// Download file
await bot.downloadFile(fileId, './downloads/file.jpg');

// Upload from various sources
await bot.sendPhoto(chatId, './photo.jpg');                    // Local file
await bot.sendPhoto(chatId, 'https://example.com/photo.jpg'); // URL
await bot.sendPhoto(chatId, buffer);                           // Buffer
await bot.sendPhoto(chatId, stream);                           // Stream
```

## Event Handling

```javascript
bot.on('update', (update) => { /* All updates */ });
bot.on('message', (message, ctx) => { /* All messages */ });
bot.on('text', (message, ctx) => { /* Text messages */ });
bot.on('photo', (message, ctx) => { /* Photo messages */ });
bot.on('video', (message, ctx) => { /* Video messages */ });
bot.on('document', (message, ctx) => { /* Document messages */ });
bot.on('audio', (message, ctx) => { /* Audio messages */ });
bot.on('voice', (message, ctx) => { /* Voice messages */ });
bot.on('sticker', (message, ctx) => { /* Sticker messages */ });
bot.on('location', (message, ctx) => { /* Location messages */ });
bot.on('contact', (message, ctx) => { /* Contact messages */ });

bot.on('callback_query', (query, ctx) => { /* Inline button clicks */ });
bot.on('inline_query', (query, ctx) => { /* Inline mode queries */ });
bot.on('poll', (poll, ctx) => { /* Poll updates */ });
bot.on('poll_answer', (answer, ctx) => { /* Poll answers */ });

bot.on('edited_message', (message, ctx) => { /* Message edits */ });
bot.on('channel_post', (post, ctx) => { /* Channel posts */ });
bot.on('my_chat_member', (member, ctx) => { /* Bot status changes */ });
bot.on('chat_member', (member, ctx) => { /* Member status changes */ });

bot.on('error', (error) => { /* Error handling */ });
bot.on('polling_error', (error) => { /* Polling errors */ });
```

## Error Handling

```javascript
// Global error handler
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

// Try-catch for specific operations
try {
  await bot.sendMessage(chatId, 'Test');
} catch (error) {
  if (error.code === 403) {
    console.log('Bot was blocked by user');
  } else if (error.code === 429) {
    console.log('Rate limited, retry after:', error.parameters.retry_after);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Advanced Usage

### Inline Mode

```javascript
bot.on('inline_query', async (query, ctx) => {
  const results = [
    {
      type: 'article',
      id: '1',
      title: 'Result 1',
      input_message_content: {
        message_text: 'Content 1'
      }
    },
    {
      type: 'photo',
      id: '2',
      photo_url: 'https://example.com/photo.jpg',
      thumbnail_url: 'https://example.com/thumb.jpg'
    }
  ];

  await bot.answerInlineQuery(query.id, results, {
    cache_time: 300
  });
});
```

### Command Routing

```javascript
// Single command
bot.command('/start', async (ctx) => {
  await ctx.send('Welcome!');
});

// Multiple commands
bot.command(['/help', '/support'], async (ctx) => {
  await ctx.send('How can I help you?');
});

// Get command handler
const startHandler = bot.command('/start');
```

### Custom API Requests

```javascript
// Direct API call
const result = await bot.request('getMe');
console.log(result);

// With parameters
const updates = await bot.request('getUpdates', {
  offset: 0,
  limit: 100
});
```

## Documentation

Full documentation is available in the `docs.html` file included in this package. Open it in your browser for complete API reference with examples.

## API Coverage

TehBot supports all Telegram Bot API v9.3 methods including:

- Message sending (text, photos, videos, documents, audio, voice, stickers, locations, venues, contacts, polls, dice)
- Message management (editing, deleting, forwarding, copying)
- Message drafts (streaming partial messages)
- Chat management (info, members, admins, permissions)
- Keyboard builders (inline and reply)
- File handling (upload, download)
- Inline mode
- Callback queries
- Payments
- Gifts and digital assets
- Forum topics in private chats
- Webhooks and polling
- And much more...

## Requirements

- Node.js 12.0 or higher
- A Telegram Bot Token (get one from [@BotFather](https://t.me/botfather))

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

---

**Made with ❤️ for the Telegram Bot community**
