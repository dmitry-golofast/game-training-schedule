import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config.js'
const p = await getPayload({ config })
try {
  await p.updateGlobal({ slug: 'landing-content', data: {}, overrideAccess: true })
  console.log('CLEARED')
} catch (e) {
  console.log('Error:', e.message)
}
process.exit(0)
