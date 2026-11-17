import 'dotenv/config'

import { createApp } from './app.js'
import { env } from './config/env.js'

createApp().listen(env.port, () => {
  console.info(`Image service listening on http://localhost:${env.port}`)
})
