import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const services = [
  { name: 'web', cwd: 'apps/web', args: ['./node_modules/vite/bin/vite.js'] },
  { name: 'auth', cwd: 'services/auth-api', port: 4003 },
  { name: 'users', cwd: 'services/user-api', port: 4004 },
  { name: 'events', cwd: 'services/events-api', port: 4001 },
  { name: 'chat', cwd: 'services/chat-api', port: 4002 },
  { name: 'images', cwd: 'services/image-api', port: 4005 },
]

const children = services.map(({ name, cwd, port, args = ['--import', 'tsx', '--watch', 'src/index.ts'] }) => {
  const env = { ...process.env }
  if (port) env.PORT = String(port)
  const child = spawn(process.execPath, args, { cwd: resolve(root, cwd), env, stdio: 'inherit' })
  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`)
    process.exitCode = 1
    stopChildren()
  })
  child.on('exit', (code) => {
    if (code && code !== 0 && !stopping) process.exitCode = code
    if (!stopping) stopChildren()
  })
  return child
})

let stopping = false
function stopChildren() {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
}

process.on('SIGINT', stopChildren)
process.on('SIGTERM', stopChildren)
