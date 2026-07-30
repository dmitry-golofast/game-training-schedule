import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../src/payload.config.js'

const payload = await getPayload({ config })

// Find the user
const result = await payload.find({
  collection: 'users',
  where: { email: { equals: 'admin@admin.ru' } },
  limit: 1,
  overrideAccess: true,
})

const user = result.docs[0]

if (!user) {
  console.log('User admin@admin.ru not found')
  process.exit(0)
}

console.log('Found user:', user.email, 'role:', user.role, 'id:', user.id)

// Change role to admin
await payload.update({
  collection: 'users',
  id: user.id,
  overrideAccess: true,
  data: { role: 'admin' },
})

console.log('Role changed to admin successfully')

process.exit(0)
