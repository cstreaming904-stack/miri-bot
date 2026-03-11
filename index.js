const express = require("express")
const pino = require("pino")
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys")

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("Miri Bot está funcionando 🤖")
})

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`)
})

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log("QR generado, revisa los logs.")
    }

    if (connection === "open") {
      console.log("WhatsApp conectado correctamente ✅")
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log("Conexión cerrada. Reconectando:", shouldReconnect)

      if (shouldReconnect) {
        startBot()
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (text === "!menu") {
      await sock.sendMessage(from, {
        text: "🤖 *Miri Bot*\n\nComandos:\n!menu\n!hola"
      })
    }

    if (text === "!hola") {
      await sock.sendMessage(from, {
        text: "Hola 👋 soy Miri Bot"
      })
    }
  })
}

startBot().catch(err => console.error("Error iniciando bot:", err))
