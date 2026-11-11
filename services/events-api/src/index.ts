import cors from 'cors'
import express from 'express'

const app = express()
const port = Number(process.env.PORT ?? 4001)

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ service: 'events-api', status: 'ok' })
})

app.listen(port, () => {
  console.info(`Events service listening on http://localhost:${port}`)
})
