import { strategies } from '../server/server.mjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    return res.end('Method Not Allowed')
  }
  return strategies(req, res)
}
