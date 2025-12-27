import { EventEmitter } from "events"
import type { ReadableStream } from "stream"

export interface BotOptions {
  polling?: boolean
  pollingInterval?: number
  pollingTimeout?: number
  webhook?: boolean
  webhookPort?: number
  webhookPath?: string
  requestTimeout?: number
  maxConnections?: number
  allowedUpdates?: string[]
  baseApiUrl?: string
}

export interface User {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface Chat {
  id: number
  type: "private" | "group" | "supergroup" | "channel"
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface Message {
  message_id: number
  from?: User
  sender_chat?: Chat
  date: number
  chat: Chat
  forward_from?: User
  forward_from_chat?: Chat
  forward_from_message_id?: number
  forward_signature?: string
  forward_sender_name?: string
  forward_date?: number
  reply_to_message?: Message
  via_bot?: User
  edit_date?: number
  text?: string
  entities?: MessageEntity[]
  caption?: string
  caption_entities?: MessageEntity[]
  photo?: PhotoSize[]
  audio?: Audio
  document?: Document
  animation?: Animation
  video?: Video
  voice?: Voice
  video_note?: VideoNote
  sticker?: Sticker
  location?: Location
  venue?: Venue
  contact?: Contact
  poll?: Poll
  dice?: Dice
  new_chat_members?: User[]
  left_chat_member?: User
  new_chat_title?: string
  new_chat_photo?: PhotoSize[]
  delete_chat_photo?: boolean
  group_chat_created?: boolean
  supergroup_chat_created?: boolean
  channel_chat_created?: boolean
  migrate_to_chat_id?: number
  migrate_from_chat_id?: number
  pinned_message?: Message
}

export interface MessageEntity {
  type: string
  offset: number
  length: number
  url?: string
  user?: User
  language?: string
}

export interface PhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface Audio {
  file_id: string
  file_unique_id: string
  duration: number
  performer?: string
  title?: string
  mime_type?: string
  file_size?: number
  thumb?: PhotoSize
}

export interface Document {
  file_id: string
  file_unique_id: string
  thumb?: PhotoSize
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface Video {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  thumb?: PhotoSize
  mime_type?: string
  file_size?: number
}

export interface Animation {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  thumb?: PhotoSize
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface Voice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

export interface VideoNote {
  file_id: string
  file_unique_id: string
  length: number
  duration: number
  thumb?: PhotoSize
  file_size?: number
}

export interface Sticker {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  is_animated: boolean
  is_video: boolean
  thumb?: PhotoSize
  emoji?: string
  set_name?: string
  mask_position?: MaskPosition
  file_size?: number
}

export interface MaskPosition {
  point: string
  x_shift: number
  y_shift: number
  scale: number
}

export interface Location {
  longitude: number
  latitude: number
  horizontal_accuracy?: number
  live_period?: number
  heading?: number
  proximity_alert_radius?: number
}

export interface Venue {
  location: Location
  title: string
  address: string
  foursquare_id?: string
  foursquare_type?: string
}

export interface Contact {
  phone_number: string
  first_name: string
  last_name?: string
  user_id?: number
  vcard?: string
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  total_voter_count: number
  is_closed: boolean
  is_anonymous: boolean
  type: string
  allows_multiple_answers: boolean
}

export interface PollOption {
  text: string
  voter_count: number
}

export interface Dice {
  emoji: string
  value: number
}

export interface Update {
  update_id: number
  message?: Message
  edited_message?: Message
  channel_post?: Message
  edited_channel_post?: Message
  inline_query?: InlineQuery
  chosen_inline_result?: ChosenInlineResult
  callback_query?: CallbackQuery
  poll?: Poll
  poll_answer?: PollAnswer
  my_chat_member?: ChatMemberUpdated
  chat_member?: ChatMemberUpdated
}

export interface InlineQuery {
  id: string
  from: User
  query: string
  offset: string
  chat_type?: string
  location?: Location
}

export interface ChosenInlineResult {
  result_id: string
  from: User
  location?: Location
  inline_message_id?: string
  query: string
}

export interface CallbackQuery {
  id: string
  from: User
  message?: Message
  inline_message_id?: string
  chat_instance: string
  data?: string
  game_short_name?: string
}

export interface PollAnswer {
  poll_id: string
  user: User
  option_ids: number[]
}

export interface ChatMemberUpdated {
  chat: Chat
  from: User
  date: number
  old_chat_member: ChatMember
  new_chat_member: ChatMember
  invite_link?: ChatInviteLink
}

export interface ChatMember {
  user: User
  status: string
  custom_title?: string
  is_anonymous?: boolean
  can_be_edited?: boolean
  can_manage_chat?: boolean
  can_post_messages?: boolean
  can_edit_messages?: boolean
  can_delete_messages?: boolean
  can_manage_video_chats?: boolean
  can_restrict_members?: boolean
  can_promote_members?: boolean
  can_change_info?: boolean
  can_invite_users?: boolean
  can_pin_messages?: boolean
  is_member?: boolean
  can_send_messages?: boolean
  can_send_media_messages?: boolean
  can_send_polls?: boolean
  can_send_other_messages?: boolean
  can_add_web_page_previews?: boolean
  until_date?: number
}

export interface ChatInviteLink {
  invite_link: string
  creator: User
  creates_join_request: boolean
  is_primary: boolean
  is_revoked: boolean
  name?: string
  expire_date?: number
  member_limit?: number
  pending_join_request_count?: number
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][]
}

export interface InlineKeyboardButton {
  text: string
  url?: string
  callback_data?: string
  switch_inline_query?: string
  switch_inline_query_current_chat?: string
  callback_game?: any
  pay?: boolean
  login_url?: any
}

export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][]
  resize_keyboard?: boolean
  one_time_keyboard?: boolean
  selective?: boolean
  input_field_placeholder?: string
}

export interface KeyboardButton {
  text: string
  request_contact?: boolean
  request_location?: boolean
  request_poll?: KeyboardButtonPollType
}

export interface KeyboardButtonPollType {
  type?: string
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true
  selective?: boolean
}

export interface ForceReply {
  force_reply: true
  selective?: boolean
  input_field_placeholder?: string
}

export interface SendMessageOptions {
  parse_mode?: "Markdown" | "MarkdownV2" | "HTML"
  entities?: MessageEntity[]
  disable_web_page_preview?: boolean
  disable_notification?: boolean
  protect_content?: boolean
  reply_to_message_id?: number
  allow_sending_without_reply?: boolean
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply
}

export interface SendPhotoOptions extends SendMessageOptions {
  caption?: string
  caption_entities?: MessageEntity[]
}

export interface SendDocumentOptions extends SendMessageOptions {
  caption?: string
  caption_entities?: MessageEntity[]
  disable_content_type_detection?: boolean
}

export interface SendMediaContent {
  text?: string
  image?: string | Buffer | ReadableStream
  video?: string | Buffer | ReadableStream
  audio?: string | Buffer | ReadableStream
  document?: string | Buffer | ReadableStream
  sticker?: string | Buffer | ReadableStream
  caption?: string
  [key: string]: any
}

export interface Context {
  update: Update
  bot: TelegramBot
  message?: Message
  callbackQuery?: CallbackQuery
  inlineQuery?: InlineQuery
  chosenInlineResult?: ChosenInlineResult
  poll?: Poll
  pollAnswer?: PollAnswer
  myChatMember?: ChatMemberUpdated
  chatMember?: ChatMemberUpdated
  chat?: Chat
  from?: User
  chatId?: number
  send: (content: string | SendMediaContent, options?: any) => Promise<Message>
  reply: (text: string, options?: any) => Promise<Message>
  replyWithPhoto: (photo: string | Buffer, options?: SendPhotoOptions) => Promise<Message>
  replyWithVideo: (video: string | Buffer, options?: any) => Promise<Message>
  replyWithAudio: (audio: string | Buffer, options?: any) => Promise<Message>
  replyWithDocument: (document: string | Buffer, options?: SendDocumentOptions) => Promise<Message>
  editMessageText: (text: string, options?: any) => Promise<Message | boolean>
  answerCallbackQuery: (options?: any) => Promise<boolean>
}

export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void> | void
export type CommandHandler = (ctx: Context) => Promise<void> | void

export class InlineKeyboardBuilder {
  constructor()
  text(text: string, callbackData: string): this
  url(text: string, url: string): this
  login(text: string, loginUrl: any): this
  switchInline(text: string, query?: string): this
  switchInlineCurrent(text: string, query?: string): this
  game(text: string): this
  pay(text: string): this
  row(): this
  build(): InlineKeyboardMarkup
}

export class ReplyKeyboardBuilder {
  constructor()
  text(text: string): this
  requestContact(text: string): this
  requestLocation(text: string): this
  requestPoll(text: string, type?: string): this
  row(): this
  resize(resize?: boolean): this
  oneTime(oneTime?: boolean): this
  selective(selective?: boolean): this
  placeholder(text: string): this
  build(): ReplyKeyboardMarkup
}

export class TelegramBot extends EventEmitter {
  constructor(token: string, options?: BotOptions)

  request(method: string, params?: any, formData?: any): Promise<any>
  queuedRequest(method: string, params?: any, formData?: any): Promise<any>

  getMe(): Promise<User>
  getUpdates(params?: any): Promise<Update[]>
  setWebhook(url: string, params?: any): Promise<boolean>
  deleteWebhook(params?: any): Promise<boolean>
  getWebhookInfo(): Promise<any>

  sendMessage(chatId: number | string, content: string | SendMediaContent, options?: any): Promise<Message>
  sendPhoto(chatId: number | string, photo: string | Buffer, options?: SendPhotoOptions): Promise<Message>
  sendAudio(chatId: number | string, audio: string | Buffer, options?: any): Promise<Message>
  sendDocument(chatId: number | string, document: string | Buffer, options?: SendDocumentOptions): Promise<Message>
  sendVideo(chatId: number | string, video: string | Buffer, options?: any): Promise<Message>
  sendAnimation(chatId: number | string, animation: string | Buffer, options?: any): Promise<Message>
  sendVoice(chatId: number | string, voice: string | Buffer, options?: any): Promise<Message>
  sendVideoNote(chatId: number | string, videoNote: string | Buffer, options?: any): Promise<Message>
  sendSticker(chatId: number | string, sticker: string | Buffer, options?: any): Promise<Message>
  sendLocation(chatId: number | string, latitude: number, longitude: number, options?: any): Promise<Message>
  sendVenue(
    chatId: number | string,
    latitude: number,
    longitude: number,
    title: string,
    address: string,
    options?: any,
  ): Promise<Message>
  sendContact(chatId: number | string, phoneNumber: string, firstName: string, options?: any): Promise<Message>
  sendPoll(chatId: number | string, question: string, options: string[], params?: any): Promise<Message>
  sendDice(chatId: number | string, options?: any): Promise<Message>
  sendChatAction(chatId: number | string, action: string): Promise<boolean>

  forwardMessage(
    chatId: number | string,
    fromChatId: number | string,
    messageId: number,
    options?: any,
  ): Promise<Message>
  copyMessage(chatId: number | string, fromChatId: number | string, messageId: number, options?: any): Promise<any>

  editMessageText(text: string, options?: any): Promise<Message | boolean>
  editMessageCaption(options?: any): Promise<Message | boolean>
  editMessageReplyMarkup(options?: any): Promise<Message | boolean>
  deleteMessage(chatId: number | string, messageId: number): Promise<boolean>

  answerCallbackQuery(callbackQueryId: string, options?: any): Promise<boolean>
  answerInlineQuery(inlineQueryId: string, results: any[], options?: any): Promise<boolean>

  getChat(chatId: number | string): Promise<Chat>
  getChatAdministrators(chatId: number | string): Promise<ChatMember[]>
  getChatMemberCount(chatId: number | string): Promise<number>
  getChatMember(chatId: number | string, userId: number): Promise<ChatMember>

  setChatTitle(chatId: number | string, title: string): Promise<boolean>
  setChatDescription(chatId: number | string, description: string): Promise<boolean>

  pinChatMessage(chatId: number | string, messageId: number, options?: any): Promise<boolean>
  unpinChatMessage(chatId: number | string, options?: any): Promise<boolean>
  unpinAllChatMessages(chatId: number | string): Promise<boolean>

  leaveChat(chatId: number | string): Promise<boolean>
  banChatMember(chatId: number | string, userId: number, options?: any): Promise<boolean>
  unbanChatMember(chatId: number | string, userId: number, options?: any): Promise<boolean>
  restrictChatMember(chatId: number | string, userId: number, permissions: any, options?: any): Promise<boolean>
  promoteChatMember(chatId: number | string, userId: number, options?: any): Promise<boolean>

  getFile(fileId: string): Promise<any>
  downloadFile(fileId: string, destination: string): Promise<string>

  use(middleware: Middleware): this
  command(cmd: string | string[], handler: CommandHandler): this

  startPolling(): Promise<void>
  stopPolling(): void
  startWebhook(): Promise<void>
  stopWebhook(): void

  on(event: "update", listener: (update: Update) => void): this
  on(event: "message", listener: (message: Message, ctx: Context) => void): this
  on(event: "text", listener: (message: Message, ctx: Context) => void): this
  on(event: "photo", listener: (message: Message, ctx: Context) => void): this
  on(event: "document", listener: (message: Message, ctx: Context) => void): this
  on(event: "video", listener: (message: Message, ctx: Context) => void): this
  on(event: "audio", listener: (message: Message, ctx: Context) => void): this
  on(event: "voice", listener: (message: Message, ctx: Context) => void): this
  on(event: "sticker", listener: (message: Message, ctx: Context) => void): this
  on(event: "location", listener: (message: Message, ctx: Context) => void): this
  on(event: "contact", listener: (message: Message, ctx: Context) => void): this
  on(event: "edited_message", listener: (message: Message, ctx: Context) => void): this
  on(event: "channel_post", listener: (message: Message, ctx: Context) => void): this
  on(event: "edited_channel_post", listener: (message: Message, ctx: Context) => void): this
  on(event: "callback_query", listener: (query: CallbackQuery, ctx: Context) => void): this
  on(event: "inline_query", listener: (query: InlineQuery, ctx: Context) => void): this
  on(event: "chosen_inline_result", listener: (result: ChosenInlineResult, ctx: Context) => void): this
  on(event: "poll", listener: (poll: Poll, ctx: Context) => void): this
  on(event: "poll_answer", listener: (answer: PollAnswer, ctx: Context) => void): this
  on(event: "my_chat_member", listener: (member: ChatMemberUpdated, ctx: Context) => void): this
  on(event: "chat_member", listener: (member: ChatMemberUpdated, ctx: Context) => void): this
  on(event: "polling_start", listener: () => void): this
  on(event: "polling_stop", listener: () => void): this
  on(event: "polling_error", listener: (error: Error) => void): this
  on(event: "webhook_start", listener: (port: number) => void): this
  on(event: "webhook_stop", listener: () => void): this
  on(event: "webhook_error", listener: (error: Error) => void): this
  on(event: "error", listener: (error: Error) => void): this
  on(event: string, listener: (...args: any[]) => void): this

  static InlineKeyboard(): InlineKeyboardBuilder
  static ReplyKeyboard(): ReplyKeyboardBuilder
  static RemoveKeyboard(): ReplyKeyboardRemove
  static ForceReply(): ForceReply
}

export default TelegramBot
