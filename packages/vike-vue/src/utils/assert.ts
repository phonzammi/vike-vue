export function assert(condition: unknown): asserts condition {
  if (condition) return
  throw new Error(
    'You stumbled upon a vike-vue bug. Go to https://github.com/vikejs/vike-vue/issues/new and copy-paste this error. A maintainer will fix the bug (usually under 24 hours).',
  )
}
