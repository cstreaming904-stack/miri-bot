const express = require("express")
const pino = require("pino")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const app = express()
const PORT = process.env.PORT || 10000
const phoneNumber = "529811968561"

app.get("/", (req, res) => {
  res.send("Miri Bot está funcionando 🤖")
})

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`)
})

function getTextFromMessage(message) {
  if (!message) return ""

  if (message.conversation) return message.conversation
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
  if (message.imageMessage?.caption) return message.imageMessage.caption
  if (message.videoMessage?.caption) return message.videoMessage.caption
  return ""
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session_miri_final")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Miri Bot", "Chrome", "1.0.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  let codeRequested = false

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "connecting" && !state.creds.registered && !codeRequested) {
      codeRequested = true
      try {
        await new Promise(r => setTimeout(r, 5000))
        const code = await sock.requestPairingCode(phoneNumber)
        console.log("CODIGO_DE_VINCULACION:", code)
      } catch (e) {
        console.log("ERROR_AL_GENERAR_CODIGO:", e?.message || e)
      }
    }

    if (connection === "open") {
      console.log("WhatsApp conectado correctamente ✅")
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log("CONEXION_CERRADA:", statusCode || "sin_codigo")

      if (shouldReconnect) {
        setTimeout(() => startBot(), 4000)
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      console.log("MENSAJE_RECIBIDO_TIPO:", type)

      const msg = messages?.[0]
      if (!msg) return

      const from = msg.key.remoteJid
      const text = getTextFromMessage(msg.message).trim()
      const lower = text.toLowerCase()

      console.log("FROM:", from)
      console.log("TEXTO:", text)

      if (!text) return

      if (lower === "hola") {
        await sock.sendMessage(from, { text: "Hola 👋 soy Miri Bot" })
        return
      }

      if (lower === "menu") {
        await sock.sendMessage(from, {
          text: "🤖 *Miri Bot*\n\nComandos disponibles:\n- hola\n- menu\n- ping"
        })
        return
      }

      if (lower === "ping") {
        await sock.sendMessage(from, { text: "pong 🏓" })
        return
      }
    } catch (error) {
      console.log("ERROR_MESSAGES_UPSERT:", error?.message || error)
    }
  })
}

startBot().catch(err => console.log("ERROR_GENERAL:", err?.message || err))
