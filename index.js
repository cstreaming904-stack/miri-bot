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
const phoneNumber = "529811968561" // sin + y sin espacios
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

app.get("/", (req, res) => {
  res.send("Miri Bot está funcionando 🤖")
})

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`)
})

async function askAI(prompt) {
  if (!OPENAI_API_KEY) {
    return "No encontré la clave OPENAI_API_KEY en Render."
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres Miri Bot, una asistente amable, breve, útil y cariñosa. Responde en español claro. Si te piden avisos para clientes o grupos de WhatsApp, redacta bonito y directo."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.log("ERROR_OPENAI:", data)
      return "Hubo un problema al consultar la IA."
    }

    return data.choices?.[0]?.message?.content?.trim() || "No pude generar respuesta."
  } catch (error) {
    console.log("ERROR_ASK_AI:", error)
    return "Ocurrió un error al hablar con la IA."
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session_miri_ia")
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
        console.log("CÓDIGO DE VINCULACIÓN:", code)
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

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message) return
    if (msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    const cleanText = text.trim().toLowerCase()

    if (cleanText === "hola") {
      await sock.sendMessage(from, {
        text: "Hola 👋 soy Miri Bot"
      })
      return
    }

    if (cleanText === "menu") {
      await sock.sendMessage(from, {
        text: "🤖 *Miri Bot*\n\nComandos:\nmenu\nhola\nmiri <pregunta>"
      })
      return
    }

    if (cleanText.startsWith("miri ")) {
      const prompt = text.slice(5).trim()

      if (!prompt) {
        await sock.sendMessage(from, {
          text: "Escríbeme algo así:\n\nmiri haz un aviso para clientes"
        })
        return
      }

      await sock.sendMessage(from, {
        text: "Pensando... ✨"
      })

      const aiReply = await askAI(prompt)

      await sock.sendMessage(from, {
        text: aiReply
      })
    }
  })
}

startBot().catch(err => console.log("ERROR_GENERAL:", err?.message || err))
