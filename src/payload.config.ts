import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Groups } from './collections/Groups'
import { Media } from './collections/Media'
import { ScheduleSlots } from './collections/ScheduleSlots'
import { UserNotes } from './collections/UserNotes'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// ── Email ────────────────────────────────────────────────────────────
// Only wire the Nodemailer adapter when SMTP is configured; otherwise
// Payload falls back to its console logger (handy in local dev).
const hasSmtp = Boolean(process.env.SMTP_HOST)

// ── S3 storage ───────────────────────────────────────────────────────
// Only mount the S3 plugin when a bucket is configured. Without it,
// Payload stores uploads locally in /media — fine for development.
const hasS3 = Boolean(process.env.S3_BUCKET)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, UserNotes, ScheduleSlots, Groups],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  ...(hasSmtp && {
    email: nodemailerAdapter({
      defaultFromAddress: process.env.SMTP_FROM_ADDRESS || 'noreply@localhost',
      defaultFromName: process.env.SMTP_FROM_NAME || 'Game Training Schedule',
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
    }),
  }),
  plugins: [
    ...(hasS3
      ? [
          s3Storage({
            collections: {
              media: true,
            },
            bucket: process.env.S3_BUCKET!,
            config: {
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID!,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
              },
              region: process.env.S3_REGION,
              ...(process.env.S3_ENDPOINT
                ? {
                    endpoint: process.env.S3_ENDPOINT,
                    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
                  }
                : {}),
            },
          }),
        ]
      : []),
  ],
  sharp,
})
