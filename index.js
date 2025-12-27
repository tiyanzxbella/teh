const https = require("https")
const http = require("http")
const { EventEmitter } = require("events")
const { createReadStream, statSync, createWriteStream, promises: fsPromises } = require("fs")
const { basename, extname } = require("path")
const { URL } = require("url")
const { Stream, Readable } = require("stream")

const DEFAULT_OPTIONS = {
  polling: false,
  pollingInterval: 1000,
  pollingTimeout: 30,
  webhook: false,
  webhookPort: 3000,
  webhookPath: "/webhook",
  requestTimeout: 30000,
  maxConnections: 40,
  allowedUpdates: [],
  baseApiUrl: "https://api.telegram.org",
}

class TelegramBot extends EventEmitter {
  constructor(token, options = {}) {
    super()

    if (!token) throw new Error("[Teh] Bot token is required")

    this.token = token
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.apiUrl = `${this.options.baseApiUrl}/bot${token}`

    this.offset = 0
    this.middleware = []
    this.commands = new Map()
    this.pollingActive = false
    this.webhookServer = null

    this._queue = []
    this._isProcessing = false
    this._rateLimitDelay = 0

    if (this.options.polling) this.startPolling()
    if (this.options.webhook) this.startWebhook()
  }

  async request(method, params = {}, formData = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.apiUrl}/${method}`)
      const headers = {}
      let body

      if (formData) {
        const boundary = `----TehBoundary${Math.random().toString(36).substring(2)}`
        headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`
        body = this._buildMultipartStream(formData, boundary)
      } else {
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(params)
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          ...headers,
          "User-Agent": "TehBot/1.0.0 (Modern; High-Performance)",
        },
        timeout: this.options.requestTimeout,
      }

      const req = https.request(options, (res) => {
        const chunks = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString()
          try {
            const response = JSON.parse(raw)
            if (response.ok) resolve(response.result)
            else reject(this._formatError(response))
          } catch (e) {
            reject(new Error(`[Teh] Parse Error: ${raw.substring(0, 100)}`))
          }
        })
      })

      req.on("error", reject)
      if (body instanceof Stream) body.pipe(req)
      else {
        req.write(body)
        req.end()
      }
    })
  }

  async sendMessage(chatId, content, options = {}) {
    // content can be string (text) or object { image: ..., caption: ... }
    if (typeof content === "string") {
      return this.request("sendMessage", { chat_id: chatId, text: content, ...options })
    }

    const { image, video, audio, document, sticker, caption, ...rest } = content
    const mediaType = image
      ? "photo"
      : video
        ? "video"
        : audio
          ? "audio"
          : document
            ? "document"
            : sticker
              ? "sticker"
              : null
    const mediaSource = image || video || audio || document || sticker

    if (!mediaType) return this.request("sendMessage", { chat_id: chatId, text: content.text, ...options })

    const method = `send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`
    const formData = { chat_id: chatId, caption, [mediaType]: await this._prepareFile(mediaSource, mediaType), ...rest }

    return this.request(method, {}, formData)
  }

  async sendPhoto(chatId, photo, options = {}) {
    return this._sendFile("sendPhoto", chatId, photo, "photo", options)
  }

  async sendAudio(chatId, audio, options = {}) {
    return this._sendFile("sendAudio", chatId, audio, "audio", options)
  }

  async sendDocument(chatId, document, options = {}) {
    return this._sendFile("sendDocument", chatId, document, "document", options)
  }

  async sendVideo(chatId, video, options = {}) {
    return this._sendFile("sendVideo", chatId, video, "video", options)
  }

  async sendAnimation(chatId, animation, options = {}) {
    return this._sendFile("sendAnimation", chatId, animation, "animation", options)
  }

  async sendVoice(chatId, voice, options = {}) {
    return this._sendFile("sendVoice", chatId, voice, "voice", options)
  }

  async sendVideoNote(chatId, videoNote, options = {}) {
    return this._sendFile("sendVideoNote", chatId, videoNote, "video_note", options)
  }

  async sendSticker(chatId, sticker, options = {}) {
    return this._sendFile("sendSticker", chatId, sticker, "sticker", options)
  }

  async sendLocation(chatId, latitude, longitude, options = {}) {
    return this.request("sendLocation", {
      chat_id: chatId,
      latitude,
      longitude,
      ...options,
    })
  }

  async sendVenue(chatId, latitude, longitude, title, address, options = {}) {
    return this.request("sendVenue", {
      chat_id: chatId,
      latitude,
      longitude,
      title,
      address,
      ...options,
    })
  }

  async sendContact(chatId, phoneNumber, firstName, options = {}) {
    return this.request("sendContact", {
      chat_id: chatId,
      phone_number: phoneNumber,
      first_name: firstName,
      ...options,
    })
  }

  async sendPoll(chatId, question, optionsArray, params = {}) {
    return this.request("sendPoll", {
      chat_id: chatId,
      question,
      options: optionsArray,
      ...params,
    })
  }

  async sendDice(chatId, options = {}) {
    return this.request("sendDice", {
      chat_id: chatId,
      ...options,
    })
  }

  async sendChatAction(chatId, action) {
    return this.request("sendChatAction", {
      chat_id: chatId,
      action,
    })
  }

  async forwardMessage(chatId, fromChatId, messageId, options = {}) {
    return this.request("forwardMessage", {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      ...options,
    })
  }

  async copyMessage(chatId, fromChatId, messageId, options = {}) {
    return this.request("copyMessage", {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
      ...options,
    })
  }

  async editMessageText(text, options = {}) {
    return this.request("editMessageText", {
      text,
      ...options,
    })
  }

  async editMessageCaption(options = {}) {
    return this.request("editMessageCaption", options)
  }

  async editMessageReplyMarkup(options = {}) {
    return this.request("editMessageReplyMarkup", options)
  }

  async deleteMessage(chatId, messageId) {
    return this.request("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    })
  }

  async answerCallbackQuery(callbackQueryId, options = {}) {
    return this.request("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...options,
    })
  }

  async answerInlineQuery(inlineQueryId, results, options = {}) {
    return this.request("answerInlineQuery", {
      inline_query_id: inlineQueryId,
      results,
      ...options,
    })
  }

  async getChat(chatId) {
    return this.request("getChat", { chat_id: chatId })
  }

  async getChatAdministrators(chatId) {
    return this.request("getChatAdministrators", { chat_id: chatId })
  }

  async getChatMemberCount(chatId) {
    return this.request("getChatMemberCount", { chat_id: chatId })
  }

  async getChatMember(chatId, userId) {
    return this.request("getChatMember", {
      chat_id: chatId,
      user_id: userId,
    })
  }

  async setChatTitle(chatId, title) {
    return this.request("setChatTitle", {
      chat_id: chatId,
      title,
    })
  }

  async setChatDescription(chatId, description) {
    return this.request("setChatDescription", {
      chat_id: chatId,
      description,
    })
  }

  async pinChatMessage(chatId, messageId, options = {}) {
    return this.request("pinChatMessage", {
      chat_id: chatId,
      message_id: messageId,
      ...options,
    })
  }

  async unpinChatMessage(chatId, options = {}) {
    return this.request("unpinChatMessage", {
      chat_id: chatId,
      ...options,
    })
  }

  async unpinAllChatMessages(chatId) {
    return this.request("unpinAllChatMessages", { chat_id: chatId })
  }

  async leaveChat(chatId) {
    return this.request("leaveChat", { chat_id: chatId })
  }

  async banChatMember(chatId, userId, options = {}) {
    return this.request("banChatMember", {
      chat_id: chatId,
      user_id: userId,
      ...options,
    })
  }

  async unbanChatMember(chatId, userId, options = {}) {
    return this.request("unbanChatMember", {
      chat_id: chatId,
      user_id: userId,
      ...options,
    })
  }

  async restrictChatMember(chatId, userId, permissions, options = {}) {
    return this.request("restrictChatMember", {
      chat_id: chatId,
      user_id: userId,
      permissions,
      ...options,
    })
  }

  async promoteChatMember(chatId, userId, options = {}) {
    return this.request("promoteChatMember", {
      chat_id: chatId,
      user_id: userId,
      ...options,
    })
  }

  async getFile(fileId) {
    return this.request("getFile", { file_id: fileId })
  }

  async downloadFile(fileId, destination) {
    const file = await this.getFile(fileId)
    const fileUrl = `https://api.telegram.org/file/bot${this.token}/${file.file_path}`

    return new Promise((resolve, reject) => {
      https
        .get(fileUrl, (response) => {
          const writeStream = createWriteStream(destination)
          response.pipe(writeStream)

          writeStream.on("finish", () => {
            writeStream.close()
            resolve(destination)
          })

          writeStream.on("error", reject)
        })
        .on("error", reject)
    })
  }

  use(middleware) {
    if (typeof middleware !== "function") {
      throw new Error("Middleware must be a function")
    }
    this.middleware.push(middleware)
    return this
  }

  command(cmd, handler) {
    if (typeof handler !== "function") {
      throw new Error("Command handler must be a function")
    }

    const commands = Array.isArray(cmd) ? cmd : [cmd]
    commands.forEach((c) => {
      this.commands.set(c.startsWith("/") ? c : `/${c}`, handler)
    })

    return this
  }

  on(event, listener) {
    super.on(event, listener)
    return this
  }

  async startPolling() {
    if (this.pollingActive) {
      return
    }

    this.pollingActive = true

    try {
      await this.deleteWebhook()
    } catch (error) {
      console.error("Failed to delete webhook:", error.message)
    }

    this.emit("polling_start")
    this._poll()
  }

  async _poll() {
    if (!this.pollingActive) return

    try {
      const updates = await this.request("getUpdates", {
        offset: this.offset,
        timeout: this.options.pollingTimeout,
        allowed_updates: this.options.allowedUpdates,
      })

      for (const update of updates) {
        this.offset = update.update_id + 1
        this._processUpdate(update)
      }

      setTimeout(() => this._poll(), this.options.pollingInterval)
    } catch (error) {
      this.emit("polling_error", error)
      setTimeout(() => this._poll(), this.options.pollingInterval * 2)
    }
  }

  stopPolling() {
    this.pollingActive = false
    this.emit("polling_stop")
  }

  async startWebhook() {
    if (this.webhookServer) {
      return
    }

    const server = http.createServer((req, res) => {
      if (req.url === this.options.webhookPath && req.method === "POST") {
        let body = ""

        req.on("data", (chunk) => {
          body += chunk.toString()
        })

        req.on("end", () => {
          try {
            const update = JSON.parse(body)
            this._processUpdate(update)
            res.writeHead(200)
            res.end("OK")
          } catch (error) {
            this.emit("webhook_error", error)
            res.writeHead(500)
            res.end("Error")
          }
        })
      } else {
        res.writeHead(404)
        res.end("Not Found")
      }
    })

    server.listen(this.options.webhookPort, () => {
      this.emit("webhook_start", this.options.webhookPort)
    })

    this.webhookServer = server
  }

  stopWebhook() {
    if (this.webhookServer) {
      this.webhookServer.close(() => {
        this.emit("webhook_stop")
      })
      this.webhookServer = null
    }
  }

  async _processUpdate(update) {
    try {
      const ctx = this._createContext(update)

      await this._runMiddleware(ctx)

      if (ctx.message?.text?.startsWith("/")) {
        const command = ctx.message.text.split(" ")[0]
        const handler = this.commands.get(command)

        if (handler) {
          await handler(ctx)
        }
      }

      this.emit("update", update)

      if (update.message) {
        this.emit("message", update.message, ctx)

        if (update.message.text) {
          this.emit("text", update.message, ctx)
        }

        if (update.message.photo) {
          this.emit("photo", update.message, ctx)
        }

        if (update.message.document) {
          this.emit("document", update.message, ctx)
        }

        if (update.message.video) {
          this.emit("video", update.message, ctx)
        }

        if (update.message.audio) {
          this.emit("audio", update.message, ctx)
        }

        if (update.message.voice) {
          this.emit("voice", update.message, ctx)
        }

        if (update.message.sticker) {
          this.emit("sticker", update.message, ctx)
        }

        if (update.message.location) {
          this.emit("location", update.message, ctx)
        }

        if (update.message.contact) {
          this.emit("contact", update.message, ctx)
        }
      }

      if (update.edited_message) {
        this.emit("edited_message", update.edited_message, ctx)
      }

      if (update.channel_post) {
        this.emit("channel_post", update.channel_post, ctx)
      }

      if (update.edited_channel_post) {
        this.emit("edited_channel_post", update.edited_channel_post, ctx)
      }

      if (update.callback_query) {
        this.emit("callback_query", update.callback_query, ctx)
      }

      if (update.inline_query) {
        this.emit("inline_query", update.inline_query, ctx)
      }

      if (update.chosen_inline_result) {
        this.emit("chosen_inline_result", update.chosen_inline_result, ctx)
      }

      if (update.poll) {
        this.emit("poll", update.poll, ctx)
      }

      if (update.poll_answer) {
        this.emit("poll_answer", update.poll_answer, ctx)
      }

      if (update.my_chat_member) {
        this.emit("my_chat_member", update.my_chat_member, ctx)
      }

      if (update.chat_member) {
        this.emit("chat_member", update.chat_member, ctx)
      }
    } catch (error) {
      this.emit("error", error)
    }
  }

  _createContext(update) {
    const message = update.message || update.edited_message || update.channel_post || update.callback_query?.message
    const chat = message?.chat || update.my_chat_member?.chat || update.chat_member?.chat
    const from = message?.from || update.callback_query?.from || update.inline_query?.from

    const ctx = {
      update,
      bot: this,
      message,
      chat,
      from,
      callbackQuery: update.callback_query,
      inlineQuery: update.inline_query,
      chosenInlineResult: update.chosen_inline_result,
      poll: update.poll,
      pollAnswer: update.poll_answer,
      myChatMember: update.my_chat_member,
      chatMember: update.chat_member,
    }

    // Baileys-style simplified response
    ctx.send = (content, opts) => {
      if (!ctx.chat?.id) {
        throw new Error("[Teh] Cannot send message: chat_id is not available in this context")
      }
      return this.sendMessage(ctx.chat.id, content, opts)
    }

    ctx.reply = (text, opts) => {
      if (!ctx.chat?.id) {
        throw new Error("[Teh] Cannot reply: chat_id is not available in this context")
      }
      return this.sendMessage(ctx.chat.id, text, {
        reply_to_message_id: ctx.message?.message_id,
        ...opts,
      })
    }

    // Context helpers for media
    ctx.replyWithPhoto = (photo, opts) => ctx.send({ image: photo, ...opts })
    ctx.replyWithVideo = (video, opts) => ctx.send({ video, ...opts })
    ctx.replyWithAudio = (audio, opts) => ctx.send({ audio, ...opts })
    ctx.replyWithDocument = (doc, opts) => ctx.send({ document: doc, ...opts })

    // Helper methods for callback queries
    ctx.answerCallbackQuery = (options = {}) => {
      if (!ctx.callbackQuery?.id) return Promise.resolve(false)
      return this.answerCallbackQuery(ctx.callbackQuery.id, options)
    }

    ctx.editMessageText = (text, options = {}) => {
      if (!ctx.callbackQuery?.message) {
        // If it's an inline message (no message object), we need the inline_message_id
        if (ctx.callbackQuery?.inline_message_id) {
          return this.editMessageText(text, {
            inline_message_id: ctx.callbackQuery.inline_message_id,
            ...options,
          })
        }
        return Promise.resolve(false)
      }
      return this.editMessageText(text, {
        chat_id: ctx.chat?.id,
        message_id: ctx.callbackQuery.message.message_id,
        ...options,
      })
    }

    return ctx
  }

  async _runMiddleware(ctx, index = 0) {
    if (index >= this.middleware.length) {
      return
    }

    const middleware = this.middleware[index]
    let nextCalled = false

    const next = async () => {
      if (nextCalled) {
        throw new Error("next() called multiple times")
      }
      nextCalled = true
      await this._runMiddleware(ctx, index + 1)
    }

    await middleware(ctx, next)
  }

  _buildMultipartStream(formData, boundary) {
    const stream = new Readable({ read() {} })
    const nl = "\r\n"
    ;(async () => {
      for (const [key, value] of Object.entries(formData)) {
        if (value === undefined || value === null) continue

        stream.push(`--${boundary}${nl}`)
        if (value && typeof value === "object" && value.data) {
          const filename = value.filename || `file_${Date.now()}`
          stream.push(`Content-Disposition: form-data; name="${key}"; filename="${filename}"${nl}`)
          stream.push(`Content-Type: ${value.contentType || "application/octet-stream"}${nl}${nl}`)

          if (value.data instanceof Stream) {
            for await (const chunk of value.data) stream.push(chunk)
          } else {
            stream.push(value.data)
          }
        } else {
          stream.push(`Content-Disposition: form-data; name="${key}"${nl}${nl}`)
          stream.push(typeof value === "object" ? JSON.stringify(value) : String(value))
        }
        stream.push(nl)
      }
      stream.push(`--${boundary}--${nl}`)
      stream.push(null)
    })()

    return stream
  }

  async _prepareFile(source, type) {
    if (source instanceof Stream) return { data: source, contentType: this._getMime(type) }
    if (Buffer.isBuffer(source)) return { data: source, contentType: this._getMime(type) }

    if (typeof source === "string") {
      if (source.startsWith("http")) {
        // Fetch remote URL and return as stream
        return new Promise((resolve, reject) => {
          const client = source.startsWith("https") ? https : http
          client
            .get(source, (res) => {
              if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch remote file: ${res.statusCode}`))
              }
              resolve({
                data: res,
                filename: basename(new URL(source).pathname) || `file_${Date.now()}`,
                contentType: res.headers["content-type"] || this._getMime(type),
              })
            })
            .on("error", reject)
        })
      }

      // Local file
      return {
        data: createReadStream(source),
        filename: basename(source),
        contentType: this._getMime(extname(source)),
      }
    }
    return source
  }

  _getMime(ext) {
    const mimes = {
      photo: "image/jpeg",
      video: "video/mp4",
      audio: "audio/mpeg",
      ".jpg": "image/jpeg",
      ".png": "image/png",
      ".mp4": "video/mp4",
    }
    return mimes[ext] || "application/octet-stream"
  }

  _flattenOptions(options) {
    const flat = {}
    for (const [key, value] of Object.entries(options)) {
      if (typeof value === "object" && value !== null) {
        flat[key] = JSON.stringify(value)
      } else {
        flat[key] = value
      }
    }
    return flat
  }

  _formatError(resp) {
    const err = new Error(resp.description || "Unknown Telegram Error")
    err.code = resp.error_code
    err.parameters = resp.parameters
    err.response = resp
    err.name = "TelegramAPIError"
    return err
  }

  async deleteWebhook(options = {}) {
    return this.request("deleteWebhook", options)
  }

  async setWebhook(url, options = {}) {
    return this.request("setWebhook", {
      url,
      ...options,
    })
  }

  async getWebhookInfo() {
    return this.request("getWebhookInfo")
  }

  static InlineKeyboard() {
    return new InlineKeyboardBuilder()
  }

  static ReplyKeyboard() {
    return new ReplyKeyboardBuilder()
  }

  static RemoveKeyboard(selective = false) {
    return { remove_keyboard: true, selective }
  }

  static ForceReply(selective = false, placeholder = "") {
    const obj = { force_reply: true, selective }
    if (placeholder) obj.input_field_placeholder = placeholder
    return obj
  }
}

class InlineKeyboardBuilder {
  constructor() {
    this.keyboard = []
    this.currentRow = []
  }

  text(text, callbackData) {
    this.currentRow.push({
      text,
      callback_data: callbackData,
    })
    return this
  }

  url(text, url) {
    this.currentRow.push({
      text,
      url,
    })
    return this
  }

  login(text, loginUrl) {
    this.currentRow.push({
      text,
      login_url: loginUrl,
    })
    return this
  }

  switchInline(text, query = "") {
    this.currentRow.push({
      text,
      switch_inline_query: query,
    })
    return this
  }

  switchInlineCurrent(text, query = "") {
    this.currentRow.push({
      text,
      switch_inline_query_current_chat: query,
    })
    return this
  }

  game(text) {
    this.currentRow.push({
      text,
      callback_game: {},
    })
    return this
  }

  pay(text) {
    this.currentRow.push({
      text,
      pay: true,
    })
    return this
  }

  row() {
    if (this.currentRow.length > 0) {
      this.keyboard.push([...this.currentRow])
      this.currentRow = []
    }
    return this
  }

  build() {
    this.row()
    return {
      inline_keyboard: this.keyboard,
    }
  }
}

class ReplyKeyboardBuilder {
  constructor() {
    this.keyboard = []
    this.currentRow = []
    this.options = {}
  }

  text(text) {
    this.currentRow.push({ text })
    return this
  }

  requestContact(text) {
    this.currentRow.push({
      text,
      request_contact: true,
    })
    return this
  }

  requestLocation(text) {
    this.currentRow.push({
      text,
      request_location: true,
    })
    return this
  }

  requestPoll(text, type) {
    this.currentRow.push({
      text,
      request_poll: { type },
    })
    return this
  }

  row() {
    if (this.currentRow.length > 0) {
      this.keyboard.push([...this.currentRow])
      this.currentRow = []
    }
    return this
  }

  resize(resize = true) {
    this.options.resize_keyboard = resize
    return this
  }

  oneTime(oneTime = true) {
    this.options.one_time_keyboard = oneTime
    return this
  }

  selective(selective = true) {
    this.options.selective = selective
    return this
  }

  placeholder(text) {
    this.options.input_field_placeholder = text
    return this
  }

  build() {
    this.row()
    return {
      keyboard: this.keyboard,
      ...this.options,
    }
  }
}

module.exports = TelegramBot
module.exports.TelegramBot = TelegramBot
module.exports.InlineKeyboardBuilder = InlineKeyboardBuilder
module.exports.ReplyKeyboardBuilder = ReplyKeyboardBuilder
