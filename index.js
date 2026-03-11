const express = require("express")
const app = express()

app.get("/", (req, res) => {
  res.send("Miri Bot está funcionando 🤖")
})

app.listen(3000, () => {
  console.log("Servidor iniciado en puerto 3000")
})
