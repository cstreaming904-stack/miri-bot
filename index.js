const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")

async function startBot() {
const { state, saveCreds } = await useMultiFileAuthState("session")

const sock = makeWASocket({
auth: state
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("messages.upsert", async ({ messages }) => {
const msg = messages[0]
if (!msg.message) return

const text = msg.message.conversation || msg.message.extendedTextMessage?.text
const from = msg.key.remoteJid

if (!text) return

if (text === ".menu") {
await sock.sendMessage(from, { text: "🌸 Hola soy Miri Boni Bot 🌸\n\nUsa .ping para probar el bot" })
}

if (text === ".ping") {
await sock.sendMessage(from, { text: "🏓 Pong! Bot funcionando correctamente" })
}

})

}

startBot()
