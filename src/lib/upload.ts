/**
 * Upload allowlist.
 *
 * The old code trusted `file.type` (client-supplied) and wrote whatever
 * arrived into /public/uploads — served from the same origin as the app.
 * That meant an uploaded .html or .svg could execute script in our origin
 * (stored XSS), and any extension was accepted.
 *
 * Rules here:
 *   - extension must be on the allowlist (the real gate — the browser decides
 *     the extension, and nginx serves by it)
 *   - declared MIME must match the extension's expected type
 *   - the file's magic bytes must agree, so a renamed .exe is rejected
 *   - SVG is deliberately excluded: it is an executable document
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

interface Rule {
  mime: string[]
  /** byte prefix matchers — `null` means "no signature to check" */
  sniff?: (b: Buffer) => boolean
}

const startsWith = (bytes: number[]) => (b: Buffer) =>
  b.length >= bytes.length && bytes.every((v, i) => b[i] === v)

export const UPLOAD_RULES: Record<string, Rule> = {
  '.jpg': { mime: ['image/jpeg'], sniff: startsWith([0xff, 0xd8, 0xff]) },
  '.jpeg': { mime: ['image/jpeg'], sniff: startsWith([0xff, 0xd8, 0xff]) },
  '.png': { mime: ['image/png'], sniff: startsWith([0x89, 0x50, 0x4e, 0x47]) },
  '.webp': {
    mime: ['image/webp'],
    sniff: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  '.gif': { mime: ['image/gif'], sniff: (b) => b.toString('ascii', 0, 4) === 'GIF8' },
  '.pdf': { mime: ['application/pdf'], sniff: startsWith([0x25, 0x50, 0x44, 0x46]) },
}

export const ALLOWED_EXTENSIONS = Object.keys(UPLOAD_RULES)

export interface UploadCheck {
  ok: boolean
  error?: string
  ext?: string
  mime?: string
}

export function checkUpload(file: {
  name: string
  type: string
  size: number
  bytes: Buffer
}): UploadCheck {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'حجم فایل باید کمتر از ۵ مگابایت باشد' }
  }
  if (file.size === 0) {
    return { ok: false, error: 'فایل خالی است' }
  }

  const ext = (file.name.match(/\.[^.]+$/)?.[0] || '').toLowerCase()
  const rule = UPLOAD_RULES[ext]

  if (!rule) {
    return {
      ok: false,
      error: `فرمت مجاز نیست. فقط این‌ها پذیرفته می‌شوند: ${ALLOWED_EXTENSIONS.join('، ')}`,
    }
  }

  const declared = (file.type || '').toLowerCase()
  if (declared && !rule.mime.includes(declared)) {
    return { ok: false, error: 'نوع فایل با پسوند آن هم‌خوانی ندارد' }
  }

  if (rule.sniff && !rule.sniff(file.bytes)) {
    return { ok: false, error: 'محتوای فایل با فرمت اعلام‌شده مطابقت ندارد' }
  }

  return { ok: true, ext, mime: rule.mime[0] }
}
