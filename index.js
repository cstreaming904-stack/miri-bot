const express = require("express")
const makeWASocket = require("@whiskeysockets/baileys").default

const app = express()

app.get("/", (req, res) => {
  res.send("Miri Bot está funcionando 🤖")
})

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000")
})

async function startBot() {
  const sock = makeWASocket({ printQRInTerminal: true })

  sock.ev.on("messages.upsert", async (msg) => {
    const message = msg.messages[0]
    if (!message.message) return

    const text = message.message.conversation

    if (text === "!menu") {
      await sock.sendMessage(message.key.remoteJid, {
        text: "🤖 *Miri Bot*\n\nComandos:\n!menu\n!hola"
      })
    }

    if (text === "!hola") {
      await sock.sendMessage(message.key.remoteJid, {
        text: "Hola 👋 soy Miri Bot"
      })
    }
  })
}

startBot()
