// ESM Example - Simple Telegram Bot
import TelegramBot from "../dist/index.mjs"

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
  pollingInterval: 1000,
})

// Bot started
bot.on("polling_start", () => {
  console.log("✅ Bot polling started!")
})

// Handle /start command
bot.command("/start", async (ctx) => {
  await ctx.send("👋 Welcome to Teh Bot!\n\nUse /help to see all commands.")
})

// Handle /help command
bot.command("/help", async (ctx) => {
  const helpText = `
📚 Available Commands:
/start - Start the bot
/help - Show this help message
/ping - Ping the bot
/echo [text] - Echo your message
  `
  await ctx.send(helpText)
})

// Handle /ping command
bot.command("/ping", async (ctx) => {
  await ctx.send("🏓 Pong!")
})

// Handle /echo command
bot.command("/echo", async (ctx) => {
  const text = ctx.message?.text?.replace("/echo", "").trim() || "Nothing to echo"
  await ctx.send(`Echo: ${text}`)
})

// Handle all text messages
bot.on("text", async (message, ctx) => {
  console.log(`[${message.from?.username || message.from?.id}]: ${message.text}`)
})

// Handle errors
bot.on("error", (error) => {
  console.error("❌ Bot Error:", error.message)
})

console.log("🤖 Bot is running...")
