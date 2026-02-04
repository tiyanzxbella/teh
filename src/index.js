const https = require("https")
const http = require("http")
const { EventEmitter } = require("events")
const { createReadStream, statSync, createWriteStream } = require("fs")
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
          "User-Agent": "TehBot/1.0.5 (Modern; High-Performance)",
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
      if (body instanceof Stream) {
        body.pipe(req)
        body.on("end", () => req.end())
        body.on("error", (err) => {
          req.destroy()
          reject(err)
        })
      } else {
        req.write(body)
        req.end()
      }
    })
  }

  async getMe() {
    return this.request("getMe")
  }

  async getUpdates(params = {}) {
    return this.request("getUpdates", {
      offset: this.offset,
      timeout: this.options.pollingTimeout,
      allowed_updates: this.options.allowedUpdates,
      ...params,
    })
  }

  async setWebhook(url, params = {}) {
    return this.request("setWebhook", { url, ...params })
  }

  async deleteWebhook(params = {}) {
    return this.request("deleteWebhook", params)
  }

  async getWebhookInfo() {
    return this.request("getWebhookInfo")
  }

  async sendMessage(chatId, content, options = {}) {
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
    if (handler === undefined) {
      const commandName = typeof cmd === "string" ? (cmd.startsWith("/") ? cmd : `/${cmd}`) : ""
      return this.commands.get(commandName)
    }

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

    const chat =
      update.message?.chat ||
      update.callback_query?.message?.chat ||
      update.my_chat_member?.chat ||
      update.chat_member?.chat ||
      update.chat_join_request?.chat ||
      update.edited_message?.chat ||
      update.channel_post?.chat

    const from =
      update.message?.from ||
      update.callback_query?.from ||
      update.inline_query?.from ||
      update.chosen_inline_result?.from ||
      update.shipping_query?.from ||
      update.pre_checkout_query?.from ||
      update.poll_answer?.user ||
      update.my_chat_member?.from

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

    ctx.send = (content, opts) => {
      const chatId =
        ctx.chat?.id ||
        update.callback_query?.from?.id ||
        update.inline_query?.from?.id ||
        update.message?.from?.id ||
        from?.id

      if (!chatId) {
        console.error("[Teh] Context update without valid chatId destination:", JSON.stringify(update))
        throw new Error("[Teh] Cannot send message: chat_id could not be resolved from this update context")
      }
      return this.sendMessage(chatId, content, opts)
    }

    ctx.reply = (text, opts) => {
      const chatId = ctx.chat?.id || update.callback_query?.from?.id || from?.id
      if (!chatId) {
        throw new Error("[Teh] Cannot reply: chat_id could not be resolved from this update context")
      }
      return this.sendMessage(chatId, text, {
        reply_to_message_id: ctx.message?.message_id,
        ...opts,
      })
    }

    ctx.replyWithPhoto = (photo, opts) => ctx.send({ image: photo, ...opts })
    ctx.replyWithVideo = (video, opts) => ctx.send({ video, ...opts })
    ctx.replyWithAudio = (audio, opts) => ctx.send({ audio, ...opts })
    ctx.replyWithDocument = (doc, opts) => ctx.send({ document: doc, ...opts })

    ctx.answerCallbackQuery = (options = {}) => {
      if (!ctx.callbackQuery?.id) return Promise.resolve(false)
      return this.answerCallbackQuery(ctx.callbackQuery.id, options)
    }

    ctx.editMessageText = (text, options = {}) => {
      if (!ctx.callbackQuery?.message) {
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
    const stream = new Readable({
      read() {},
    })
    const nl = "\r\n"
    ;(async () => {
      try {
        for (const [key, value] of Object.entries(formData)) {
          if (value === undefined || value === null) continue

          stream.push(`--${boundary}${nl}`)
          if (value && typeof value === "object" && (value.data || value instanceof Stream || Buffer.isBuffer(value))) {
            const fileData = value.data || value
            const filename = value.filename || `file_${Date.now()}.jpg`
            const contentType = value.contentType || this._getMime(extname(filename)) || "image/jpeg"

            stream.push(`Content-Disposition: form-data; name="${key}"; filename="${filename}"${nl}`)
            stream.push(`Content-Type: ${contentType}${nl}${nl}`)

            if (fileData instanceof Stream) {
              fileData.pipe(stream, { end: false })
              await new Promise((resolve, reject) => {
                fileData.on("end", resolve)
                fileData.on("error", reject)
              })
            } else {
              stream.push(fileData)
            }
          } else {
            stream.push(`Content-Disposition: form-data; name="${key}"${nl}${nl}`)
            stream.push(String(value))
          }
          stream.push(`${nl}`)
        }
        stream.push(`--${boundary}--${nl}`)
        stream.push(null)
      } catch (err) {
        stream.destroy(err)
      }
    })()
    return stream
  }

  _getMime(ext) {
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".mp4": "video/mp4",
      ".avi": "video/x-msvideo",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".wav": "audio/wav",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".txt": "text/plain",
    }
    return mimeTypes[ext.toLowerCase()] || "application/octet-stream"
  }

  async _prepareFile(source, type) {
    if (typeof source === "string") {
      if (source.startsWith("http://") || source.startsWith("https://")) {
        return source
      }

      try {
        const stat = statSync(source)
        if (stat.isFile()) {
          return {
            data: createReadStream(source),
            filename: basename(source),
            contentType: this._getMime(extname(source)),
          }
        }
      } catch (e) {
        return source
      }
    }

    if (Buffer.isBuffer(source) || source instanceof Stream) {
      return {
        data: source,
        filename: `file_${Date.now()}.jpg`,
        contentType: "image/jpeg",
      }
    }

    return source
  }

  _formatError(response) {
    const error = new Error(response.description || "Telegram API Error")
    error.response = response
    error.errorCode = response.error_code
    return error
  }

  static InlineKeyboard() {
    return new InlineKeyboardBuilder()
  }

  static ReplyKeyboard() {
    return new ReplyKeyboardBuilder()
  }

  static RemoveKeyboard() {
    return { remove_keyboard: true }
  }

  static ForceReply() {
    return { force_reply: true }
  }

  // Payment Methods
  async sendInvoice(chatId, title, description, payload, providerToken, currency, prices, options = {}) {
    return this.request("sendInvoice", {
      chat_id: chatId,
      title,
      description,
      payload,
      provider_token: providerToken,
      currency,
      prices,
      ...options,
    })
  }

  async answerShippingQuery(shippingQueryId, ok, options = {}) {
    return this.request("answerShippingQuery", {
      shipping_query_id: shippingQueryId,
      ok,
      ...options,
    })
  }

  async answerPreCheckoutQuery(preCheckoutQueryId, ok, options = {}) {
    return this.request("answerPreCheckoutQuery", {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...options,
    })
  }

  // Games
  async sendGame(chatId, gameShortName, options = {}) {
    return this.request("sendGame", {
      chat_id: chatId,
      game_short_name: gameShortName,
      ...options,
    })
  }

  async setGameScore(userId, score, options = {}) {
    return this.request("setGameScore", {
      user_id: userId,
      score,
      ...options,
    })
  }

  async getGameHighScores(userId, options = {}) {
    return this.request("getGameHighScores", {
      user_id: userId,
      ...options,
    })
  }

  // Sticker Set Management
  async createNewStickerSet(userId, name, title, stickerFormat, stickers, options = {}) {
    return this.request("createNewStickerSet", {
      user_id: userId,
      name,
      title,
      sticker_format: stickerFormat,
      stickers,
      ...options,
    })
  }

  async addStickerToSet(userId, name, sticker, options = {}) {
    return this.request("addStickerToSet", {
      user_id: userId,
      name,
      sticker,
      ...options,
    })
  }

  async setStickerPositionInSet(sticker, position) {
    return this.request("setStickerPositionInSet", {
      sticker,
      position,
    })
  }

  async deleteStickerFromSet(sticker) {
    return this.request("deleteStickerFromSet", { sticker })
  }

  async setStickerEmojiList(sticker, emojiList) {
    return this.request("setStickerEmojiList", {
      sticker,
      emoji_list: emojiList,
    })
  }

  async setStickerKeywords(sticker, keywords = []) {
    return this.request("setStickerKeywords", {
      sticker,
      keywords,
    })
  }

  async setStickerMaskPosition(sticker, maskPosition = null) {
    return this.request("setStickerMaskPosition", {
      sticker,
      mask_position: maskPosition,
    })
  }

  async getStickerSet(name) {
    return this.request("getStickerSet", { name })
  }

  async uploadStickerFile(userId, sticker, stickerFormat) {
    return this.request("uploadStickerFile", {
      user_id: userId,
      sticker,
      sticker_format: stickerFormat,
    })
  }

  async replaceStickerInSet(userId, name, oldSticker, sticker) {
    return this.request("replaceStickerInSet", {
      user_id: userId,
      name,
      old_sticker: oldSticker,
      sticker,
    })
  }

  async deleteStickerSet(name) {
    return this.request("deleteStickerSet", { name })
  }

  async setStickerSetThumbnail(name, userId, thumbnail = null) {
    return this.request("setStickerSetThumbnail", {
      name,
      user_id: userId,
      thumbnail,
    })
  }

  async setCustomEmojiStickerSetThumbnail(name, customEmojiId = null) {
    return this.request("setCustomEmojiStickerSetThumbnail", {
      name,
      custom_emoji_id: customEmojiId,
    })
  }

  async setStickerSetTitle(name, title) {
    return this.request("setStickerSetTitle", { name, title })
  }

  async setStickerSetDescription(name, description) {
    return this.request("setStickerSetDescription", { name, description })
  }

  // Forum/Topic Management
  async createForumTopic(chatId, name, options = {}) {
    return this.request("createForumTopic", {
      chat_id: chatId,
      name,
      ...options,
    })
  }

  async editForumTopic(chatId, messageThreadId, options = {}) {
    return this.request("editForumTopic", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
      ...options,
    })
  }

  async closeForumTopic(chatId, messageThreadId) {
    return this.request("closeForumTopic", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
    })
  }

  async reopenForumTopic(chatId, messageThreadId) {
    return this.request("reopenForumTopic", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
    })
  }

  async deleteForumTopic(chatId, messageThreadId) {
    return this.request("deleteForumTopic", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
    })
  }

  async unpinAllForumTopicMessages(chatId, messageThreadId) {
    return this.request("unpinAllForumTopicMessages", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
    })
  }

  async editGeneralForumTopic(chatId, name) {
    return this.request("editGeneralForumTopic", {
      chat_id: chatId,
      name,
    })
  }

  async closeGeneralForumTopic(chatId) {
    return this.request("closeGeneralForumTopic", { chat_id: chatId })
  }

  async reopenGeneralForumTopic(chatId) {
    return this.request("reopenGeneralForumTopic", { chat_id: chatId })
  }

  async hideGeneralForumTopic(chatId) {
    return this.request("hideGeneralForumTopic", { chat_id: chatId })
  }

  async unhideGeneralForumTopic(chatId) {
    return this.request("unhideGeneralForumTopic", { chat_id: chatId })
  }

  async getForumTopicIconStickers() {
    return this.request("getForumTopicIconStickers")
  }

  // User Permissions & Rights Management
  async setDefaultAdministratorRights(options = {}) {
    return this.request("setDefaultAdministratorRights", options)
  }

  async getDefaultAdministratorRights(forChannels = false) {
    return this.request("getDefaultAdministratorRights", {
      for_channels: forChannels,
    })
  }

  async setDefaultChatMenuButton(options = {}) {
    return this.request("setDefaultChatMenuButton", options)
  }

  async getDefaultChatMenuButton() {
    return this.request("getDefaultChatMenuButton")
  }

  async setChatMenuButton(chatId = null, options = {}) {
    const params = {}
    if (chatId !== null) params.chat_id = chatId
    return this.request("setChatMenuButton", { ...params, ...options })
  }

  async getChatMenuButton(chatId = null) {
    const params = {}
    if (chatId !== null) params.chat_id = chatId
    return this.request("getChatMenuButton", params)
  }

  // Chat Invite Links Management
  async createChatInviteLink(chatId, options = {}) {
    return this.request("createChatInviteLink", {
      chat_id: chatId,
      ...options,
    })
  }

  async editChatInviteLink(chatId, inviteLink, options = {}) {
    return this.request("editChatInviteLink", {
      chat_id: chatId,
      invite_link: inviteLink,
      ...options,
    })
  }

  async revokeChatInviteLink(chatId, inviteLink) {
    return this.request("revokeChatInviteLink", {
      chat_id: chatId,
      invite_link: inviteLink,
    })
  }

  async approveChatJoinRequest(chatId, userId) {
    return this.request("approveChatJoinRequest", {
      chat_id: chatId,
      user_id: userId,
    })
  }

  async declineChatJoinRequest(chatId, userId) {
    return this.request("declineChatJoinRequest", {
      chat_id: chatId,
      user_id: userId,
    })
  }

  // Chat Boost Management
  async getUserChatBoosts(chatId, userId) {
    return this.request("getUserChatBoosts", {
      chat_id: chatId,
      user_id: userId,
    })
  }

  async getAvailableGifts() {
    return this.request("getAvailableGifts")
  }

  async sendGift(userId, giftId, options = {}) {
    return this.request("sendGift", {
      user_id: userId,
      gift_id: giftId,
      ...options,
    })
  }

  // Message Reactions
  async setMessageReaction(chatId, messageId, reaction = [], options = {}) {
    return this.request("setMessageReaction", {
      chat_id: chatId,
      message_id: messageId,
      reaction,
      ...options,
    })
  }

  async getAvailableReactions() {
    return this.request("getAvailableReactions")
  }

  // Media Group & Carousel
  async sendMediaGroup(chatId, media, options = {}) {
    return this.request("sendMediaGroup", {
      chat_id: chatId,
      media,
      ...options,
    })
  }

  // Scheduled Messages
  async sendScheduledMessage(chatId, content, timestamp, options = {}) {
    const params = {
      chat_id: chatId,
      ...options,
    }

    if (typeof content === "string") {
      params.text = content
    } else {
      Object.assign(params, content)
    }

    params.message_thread_id = timestamp
    return this.request("sendScheduledMessage", params)
  }

  async getScheduledMessages(chatId) {
    return this.request("getScheduledMessages", { chat_id: chatId })
  }

  async deleteScheduledMessage(chatId, messageId) {
    return this.request("deleteScheduledMessage", {
      chat_id: chatId,
      message_id: messageId,
    })
  }

  // User Profile Photos
  async getUserProfilePhotos(userId, options = {}) {
    return this.request("getUserProfilePhotos", {
      user_id: userId,
      ...options,
    })
  }

  async setUserProfilePhoto(userId, photo, options = {}) {
    return this.request("setUserProfilePhoto", {
      user_id: userId,
      photo,
      ...options,
    })
  }

  async deleteUserProfilePhoto(userId, photoId) {
    return this.request("deleteUserProfilePhoto", {
      user_id: userId,
      photo_id: photoId,
    })
  }

  // Commands Management
  async setMyCommands(commands, options = {}) {
    return this.request("setMyCommands", {
      commands,
      ...options,
    })
  }

  async deleteMyCommands(options = {}) {
    return this.request("deleteMyCommands", options)
  }

  async getMyCommands(options = {}) {
    return this.request("getMyCommands", options)
  }

  async setMyDefaultAdministratorRights(options = {}) {
    return this.request("setMyDefaultAdministratorRights", options)
  }

  async getMyDefaultAdministratorRights(options = {}) {
    return this.request("getMyDefaultAdministratorRights", options)
  }

  // Webhook Management
  async setWebhookCertificate(url, certificate, options = {}) {
    return this.request("setWebhook", {
      url,
      certificate,
      ...options,
    })
  }

  async setWebhookIpAddress(ipAddress) {
    return this.request("setWebhook", {
      ip_address: ipAddress,
    })
  }

  // Business Connections
  async getBusinessConnection(businessConnectionId) {
    return this.request("getBusinessConnection", {
      business_connection_id: businessConnectionId,
    })
  }

  // Web App Features
  async sendWebAppData(webAppQueryId, data) {
    return this.request("answerWebAppQuery", {
      web_app_query_id: webAppQueryId,
      result: {
        type: "article",
        id: "1",
        title: "Web App",
        description: data,
        input_message_content: {
          message_text: data,
        },
      },
    })
  }

  // Commands Scoping
  async setMyCommandsScope(commands, scope, options = {}) {
    return this.request("setMyCommands", {
      commands,
      scope,
      ...options,
    })
  }

  async getMyCommandsScope(scope) {
    return this.request("getMyCommands", { scope })
  }

  // Telegram Passport
  async setPassportDataErrors(userId, errors) {
    return this.request("setPassportDataErrors", {
      user_id: userId,
      errors,
    })
  }

  // Inline Query Results Helpers
  static InlineQueryResult = {
    article: (id, title, description, content) => ({
      type: "article",
      id,
      title,
      description,
      input_message_content: content,
    }),
    photo: (id, photoUrl, thumbUrl) => ({
      type: "photo",
      id,
      photo_url: photoUrl,
      thumbnail_url: thumbUrl,
    }),
    gif: (id, gifUrl, thumbUrl) => ({
      type: "gif",
      id,
      gif_url: gifUrl,
      thumbnail_url: thumbUrl,
    }),
    video: (id, videoUrl, mimeType, thumbUrl, title) => ({
      type: "video",
      id,
      video_url: videoUrl,
      mime_type: mimeType,
      thumbnail_url: thumbUrl,
      title,
    }),
    audio: (id, audioUrl, title) => ({
      type: "audio",
      id,
      audio_url: audioUrl,
      title,
    }),
    voice: (id, voiceUrl, title) => ({
      type: "voice",
      id,
      voice_url: voiceUrl,
      title,
    }),
    document: (id, documentUrl, title, mimeType) => ({
      type: "document",
      id,
      document_url: documentUrl,
      title,
      mime_type: mimeType,
    }),
  }

  // Rate Limiting & Retry Logic
  async _executeWithRetry(method, params, maxRetries = 3) {
    let lastError
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.request(method, params)
      } catch (error) {
        lastError = error
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError
  }
}

class InlineKeyboardBuilder {
  constructor() {
    this.keyboard = [[]]
  }

  text(text, callbackData) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      callback_data: callbackData,
    })
    return this
  }

  url(text, url) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      url,
    })
    return this
  }

  login(text, loginUrl) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      login_url: loginUrl,
    })
    return this
  }

  switchInline(text, query = "") {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      switch_inline_query: query,
    })
    return this
  }

  switchInlineCurrent(text, query = "") {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      switch_inline_query_current_chat: query,
    })
    return this
  }

  game(text) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      callback_game: {},
    })
    return this
  }

  pay(text) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      pay: true,
    })
    return this
  }

  row() {
    this.keyboard.push([])
    return this
  }

  build() {
    return { inline_keyboard: this.keyboard }
  }
}

class ReplyKeyboardBuilder {
  constructor() {
    this.keyboard = [[]]
    this.options = {}
  }

  text(text) {
    this.keyboard[this.keyboard.length - 1].push({ text })
    return this
  }

  requestContact(text) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      request_contact: true,
    })
    return this
  }

  requestLocation(text) {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      request_location: true,
    })
    return this
  }

  requestPoll(text, type = "quiz") {
    this.keyboard[this.keyboard.length - 1].push({
      text,
      request_poll: { type },
    })
    return this
  }

  row() {
    this.keyboard.push([])
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
