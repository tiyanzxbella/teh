# @mkzz/teh - API Quick Reference

## Installation & Setup

```javascript
const TelegramBot = require('@mkzz/teh');
const bot = new TelegramBot('YOUR_BOT_TOKEN', { polling: true });
```

## Configuration Options

```javascript
{
  polling: true,              // Enable long polling
  pollingInterval: 1000,      // Polling interval in ms
  pollingTimeout: 30,         // Long polling timeout in seconds
  webhook: false,             // Enable webhook mode
  webhookPort: 3000,          // Webhook server port
  webhookPath: '/webhook',    // Webhook URL path
  requestTimeout: 30000,      // HTTP request timeout in ms
  allowedUpdates: []          // Array of update types to receive
}
```

## Core Methods

### Modern Unified Messaging The `sendMessage` method is now unified. You can send text or media by passing an object.

```javascript
// Send text
await bot.sendMessage(chatId, 'Hello world!')

// Send Image
await bot.sendMessage(chatId, { 
  image: './photo.jpg', 
  caption: 'Here's the photo!' 
})

// Send Video
await bot.sendMessage(chatId, { 
  video: fs.createReadStream('./clip.mp4'),
  caption: 'Here's the video!'
})

// Send Buffer
await bot.sendMessage(chatId, { 
  document: Buffer.from('hello'), 
  filename: 'test.txt' 
})
```

### Bot Information
```javascript
await bot.getMe()
```

### Sending Messages
```javascript
// Text
await bot.sendMessage(chatId, 'Hello!', { parse_mode: 'HTML' })

// Photo
await bot.sendPhoto(chatId, photo, { caption: 'Photo' })

// Document
await bot.sendDocument(chatId, document)

// Audio/Video
await bot.sendAudio(chatId, audio)
await bot.sendVideo(chatId, video)
await bot.sendAnimation(chatId, gif)

// Voice/Video Note
await bot.sendVoice(chatId, voice)
await bot.sendVideoNote(chatId, videoNote)

// Sticker
await bot.sendSticker(chatId, sticker)

// Location/Venue/Contact
await bot.sendLocation(chatId, lat, lon)
await bot.sendVenue(chatId, lat, lon, title, address)
await bot.sendContact(chatId, phone, firstName)

// Poll/Dice
await bot.sendPoll(chatId, question, ['A', 'B', 'C'])
await bot.sendDice(chatId, { emoji: '🎲' })

// Chat Action
await bot.sendChatAction(chatId, 'typing')
```

### Message Management
```javascript
// Edit
await bot.editMessageText(text, { chat_id, message_id })
await bot.editMessageCaption({ chat_id, message_id, caption })
await bot.editMessageReplyMarkup({ chat_id, message_id, reply_markup })

// Delete
await bot.deleteMessage(chatId, messageId)

// Forward/Copy
await bot.forwardMessage(toChatId, fromChatId, messageId)
await bot.copyMessage(toChatId, fromChatId, messageId)
```

### Chat Management
```javascript
await bot.getChat(chatId)
await bot.getChatAdministrators(chatId)
await bot.getChatMemberCount(chatId)
await bot.getChatMember(chatId, userId)

await bot.setChatTitle(chatId, title)
await bot.setChatDescription(chatId, description)

await bot.pinChatMessage(chatId, messageId)
await bot.unpinChatMessage(chatId)
await bot.unpinAllChatMessages(chatId)

await bot.leaveChat(chatId)
await bot.banChatMember(chatId, userId)
await bot.unbanChatMember(chatId, userId)
await bot.restrictChatMember(chatId, userId, permissions)
await bot.promoteChatMember(chatId, userId, { can_manage_chat: true })
```

### File Handling
```javascript
const file = await bot.getFile(fileId)
await bot.downloadFile(fileId, './path/to/save.ext')
```

### Queries
```javascript
await bot.answerCallbackQuery(callbackQueryId, { text: 'Done!' })
await bot.answerInlineQuery(inlineQueryId, results)
```

### Webhook
```javascript
await bot.setWebhook('https://your-domain.com/webhook')
await bot.deleteWebhook()
await bot.getWebhookInfo()
```

## Command Handling

```javascript
bot.command('start', async (ctx) => {
  await ctx.reply('Hello!')
})

// Multiple aliases
bot.command(['help', 'info'], async (ctx) => {
  await ctx.reply('Help text')
})
```

## Event Handling

```javascript
// All updates
bot.on('update', (update) => {})

// Messages
bot.on('message', (message, ctx) => {})
bot.on('text', (message, ctx) => {})
bot.on('photo', (message, ctx) => {})
bot.on('document', (message, ctx) => {})
bot.on('video', (message, ctx) => {})
bot.on('audio', (message, ctx) => {})
bot.on('voice', (message, ctx) => {})
bot.on('sticker', (message, ctx) => {})
bot.on('location', (message, ctx) => {})
bot.on('contact', (message, ctx) => {})

// Edits
bot.on('edited_message', (message, ctx) => {})

// Channels
bot.on('channel_post', (message, ctx) => {})
bot.on('edited_channel_post', (message, ctx) => {})

// Queries
bot.on('callback_query', (query, ctx) => {})
bot.on('inline_query', (query, ctx) => {})
bot.on('chosen_inline_result', (result, ctx) => {})

// Polls
bot.on('poll', (poll, ctx) => {})
bot.on('poll_answer', (answer, ctx) => {})

// Chat members
bot.on('my_chat_member', (member, ctx) => {})
bot.on('chat_member', (member, ctx) => {})

// System events
bot.on('polling_start', () => {})
bot.on('polling_stop', () => {})
bot.on('polling_error', (error) => {})
bot.on('webhook_start', (port) => {})
bot.on('webhook_stop', () => {})
bot.on('webhook_error', (error) => {})
bot.on('error', (error) => {})
```

## Middleware

```javascript
bot.use(async (ctx, next) => {
  console.log('Before')
  await next()
  console.log('After')
})

// Auth middleware
bot.use(async (ctx, next) => {
  if (authorizedUsers.includes(ctx.from?.id)) {
    await next()
  } else {
    await ctx.reply('Not authorized')
  }
})
```

## Context Object

```javascript
{
  update,              // Full update object
  bot,                 // Bot instance
  message,             // Message object
  callbackQuery,       // Callback query
  inlineQuery,         // Inline query
  chat,                // Chat object
  from,                // User object
  chatId,              // Chat ID

  // Helper methods
  send: async (content, options) => {}, // Unified sender (Baileys style)
  reply: async (text, options) => {},   // Automatic reply-to-message
  replyWithPhoto: async (photo, options) => {},
  editMessageText: async (text, options) => {},
  answerCallbackQuery: async (options) => {},
  deleteMessage: async () => {}
}
```

## Inline Keyboards

```javascript
const keyboard = TelegramBot.InlineKeyboard()
  .text('Button 1', 'callback_1')
  .text('Button 2', 'callback_2')
  .row()
  .url('Website', 'https://example.com')
  .row()
  .switchInline('Search', 'query')
  .build()

await bot.sendMessage(chatId, 'Choose:', { reply_markup: keyboard })
```

### Inline Keyboard Methods
- `.text(text, callbackData)` - Regular button
- `.url(text, url)` - URL button
- `.login(text, loginUrl)` - Login button
- `.switchInline(text, query)` - Switch to inline mode
- `.switchInlineCurrent(text, query)` - Switch to inline in current chat
- `.game(text)` - Game button
- `.pay(text)` - Payment button
- `.row()` - Start new row
- `.build()` - Build keyboard

## Reply Keyboards

```javascript
const keyboard = TelegramBot.ReplyKeyboard()
  .text('Option 1')
  .text('Option 2')
  .row()
  .requestContact('Share Contact')
  .row()
  .requestLocation('Share Location')
  .resize()
  .oneTime()
  .build()

await bot.sendMessage(chatId, 'Choose:', { reply_markup: keyboard })
```

### Reply Keyboard Methods
- `.text(text)` - Regular button
- `.requestContact(text)` - Request contact
- `.requestLocation(text)` - Request location
- `.requestPoll(text, type)` - Request poll
- `.row()` - Start new row
- `.resize(bool)` - Resize keyboard
- `.oneTime(bool)` - One-time keyboard
- `.selective(bool)` - Selective keyboard
- `.placeholder(text)` - Input placeholder
- `.build()` - Build keyboard

## Remove Keyboard

```javascript
await bot.sendMessage(chatId, 'Removed', {
  reply_markup: TelegramBot.RemoveKeyboard()
})
```

## Force Reply

```javascript
await bot.sendMessage(chatId, 'Reply to this:', {
  reply_markup: TelegramBot.ForceReply()
})
```

## Formatting Options

### Parse Modes
```javascript
{ parse_mode: 'Markdown' }
{ parse_mode: 'MarkdownV2' }
{ parse_mode: 'HTML' }
```

### HTML Formatting
```html
<b>bold</b>
<i>italic</i>
<u>underline</u>
<s>strikethrough</s>
<code>code</code>
<pre>preformatted</pre>
<a href="url">link</a>
```

### Markdown Formatting
```
*bold*
_italic_
`code`
```preformatted```
[link](url)
```

## Common Options

```javascript
{
  parse_mode: 'HTML',
  disable_web_page_preview: true,
  disable_notification: true,
  protect_content: true,
  reply_to_message_id: messageId,
  allow_sending_without_reply: true,
  reply_markup: keyboard
}
```

## Chat Actions

```javascript
await bot.sendChatAction(chatId, action)
```

Available actions:
- `typing`
- `upload_photo`
- `record_video`
- `upload_video`
- `record_voice`
- `upload_voice`
- `upload_document`
- `choose_sticker`
- `find_location`
- `record_video_note`
- `upload_video_note`

## Error Handling

```javascript
bot.on('error', (error) => {
  console.error('Bot error:', error)
})

try {
  await bot.sendMessage(chatId, 'Hello')
} catch (error) {
  if (error.code === 403) {
    console.log('Bot blocked by user')
  } else if (error.code === 429) {
    console.log('Rate limited')
  }
}
```

## File Types

### File ID
```javascript
await bot.sendPhoto(chatId, 'AgACAgIAAxkBAAI...')
```

### URL
```javascript
await bot.sendPhoto(chatId, 'https://example.com/image.jpg')
```

### Local Path
```javascript
await bot.sendPhoto(chatId, '/path/to/image.jpg')
```

### Buffer
```javascript
await bot.sendPhoto(chatId, buffer)
```

## Rate Limiting

The bot automatically handles rate limits with smart retry logic. No manual intervention needed.

## Graceful Shutdown

```javascript
process.on('SIGINT', () => {
  bot.stopPolling()
  process.exit(0)
})
```

## TypeScript Support

```typescript
import TelegramBot, { Context, Message } from '@mkzz/teh'

const bot = new TelegramBot(token, { polling: true })

bot.on('text', (message: Message, ctx: Context) => {
  ctx.reply('Hello!')
})
```

## Performance Tips

1. Use webhooks in production (more efficient than polling)
2. Batch operations when possible
3. Use middleware for common tasks
4. Enable connection pooling (automatic)
5. Set appropriate timeouts

## Best Practices

1. Always handle errors
2. Validate user input
3. Use environment variables for tokens
4. Implement graceful shutdown
5. Use TypeScript for better type safety
6. Log errors and important events
7. Use middleware for authentication
8. Keep bot logic modular
9. Test with real Telegram accounts
10. Monitor rate limits

## Example: Complete Bot

```javascript
const TelegramBot = require('@mkzz/teh')
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })

// Middleware
bot.use(async (ctx, next) => {
  console.log(`[${ctx.from?.username}] ${ctx.message?.text}`)
  await next()
})

// Commands
bot.command('start', async (ctx) => {
  const keyboard = TelegramBot.InlineKeyboard()
    .text('Help', 'help')
    .text('About', 'about')
    .build()

  await ctx.reply('Welcome!', { reply_markup: keyboard })
})

// Events
bot.on('text', async (message, ctx) => {
  await ctx.reply(`You said: ${message.text}`)
})

bot.on('callback_query', async (query, ctx) => {
  await ctx.answerCallbackQuery({ text: 'Received!' })
})

// Error handling
bot.on('error', (error) => {
  console.error('Error:', error)
})

// Graceful shutdown
process.on('SIGINT', () => {
  bot.stopPolling()
  process.exit(0)
})
```

## Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [GitHub Repository](https://github.com/kazedevid/teh)
- [npm Package](https://www.npmjs.com/package/@mkzz/teh)

---

For more detailed examples, see the `/examples` directory in the repository.
