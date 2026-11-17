import { createEventsApp } from './app.js'
import { env } from './config/env.js'

createEventsApp().listen(env.port, () => {
  console.info(`Events service listening on http://localhost:${env.port}`)
})
