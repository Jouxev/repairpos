import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const sessionId = readArg('--session', 'print-preview')
const outdir = path.resolve(process.cwd(), readArg('--outdir', '.dbg'))
const startPort = Number(readArg('--port', '7777'))
const idleSeconds = Number(readArg('--idle', '1200'))
const clean = args.includes('--clean')
const host = args.includes('--remote') ? '0.0.0.0' : '127.0.0.1'

fs.mkdirSync(outdir, { recursive: true })

const logFile = path.join(outdir, `trae-debug-log-${sessionId}.ndjson`)
const envFile = path.join(outdir, `${sessionId}.env`)

if (clean) {
  try {
    fs.rmSync(logFile, { force: true })
  } catch {}
}

let lastActivityAt = Date.now()
let server

const writeEnvFile = (port) => {
  const apiUrl = `http://127.0.0.1:${port}/event`
  fs.writeFileSync(envFile, `DEBUG_SERVER_URL=${apiUrl}\nDEBUG_SESSION_ID=${sessionId}\n`, 'utf8')
  console.log('@@DEBUG_SERVER_INFO')
  console.log(
    JSON.stringify(
      {
        api_url: apiUrl,
        session_id: sessionId,
        log_dir: outdir,
        log_file: logFile,
        env_file: envFile,
      },
      null,
      2,
    ),
  )
  console.log('@@END_DEBUG_SERVER_INFO')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const requestHandler = (req, res) => {
  if (req.method === 'OPTIONS' && req.url === '/event') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
    res.end(JSON.stringify({ ok: true, sessionId, uptimeMs: Date.now() - lastActivityAt }))
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/logs')) {
    const data = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : ''
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders })
    res.end(data)
    return
  }

  if (req.method === 'DELETE' && req.url === '/logs') {
    try {
      fs.rmSync(logFile, { force: true })
    } catch {}
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/event') {
    res.writeHead(404, corsHeaders)
    res.end('not found')
    return
  }

  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    try {
      const event = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
      event.ts = event.ts || Date.now()
      fs.appendFileSync(logFile, `${JSON.stringify(event)}\n`, 'utf8')
      lastActivityAt = Date.now()
      res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ ok: true }))
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders })
      res.end(JSON.stringify({ ok: false, error: String(error) }))
    }
  })
}

const listen = (port, retries = 0) => {
  server = http.createServer(requestHandler)
  server.once('error', (error) => {
    if (error?.code === 'EADDRINUSE' && retries < 9) {
      listen(port + 1, retries + 1)
      return
    }
    throw error
  })
  server.listen(port, host, () => {
    writeEnvFile(port)
  })
}

if (idleSeconds > 0) {
  setInterval(() => {
    if (Date.now() - lastActivityAt > idleSeconds * 1000) {
      server?.close(() => process.exit(0))
    }
  }, 5000)
}

listen(startPort)
