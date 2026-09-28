// Splits card text into typed segments. Shared by the renderer and the
// content validator so both agree on what counts as math.
//
// Supported syntax:
//   ```code block```   $$display math$$   $inline math$   `inline code`   **bold**
export function tokenize(src) {
  const out = []
  let text = ''
  let i = 0
  const flush = () => {
    if (text) out.push({ type: 'text', value: text })
    text = ''
  }
  while (i < src.length) {
    if (src.startsWith('```', i)) {
      const end = src.indexOf('```', i + 3)
      if (end !== -1) {
        flush()
        out.push({ type: 'codeblock', value: src.slice(i + 3, end).replace(/^[a-z]*\n/, '').replace(/\n$/, '') })
        i = end + 3
        continue
      }
    }
    if (src.startsWith('$$', i)) {
      const end = src.indexOf('$$', i + 2)
      if (end !== -1) {
        flush()
        out.push({ type: 'display', value: src.slice(i + 2, end).trim() })
        i = end + 2
        continue
      }
    }
    if (src[i] === '$') {
      const end = src.indexOf('$', i + 1)
      if (end !== -1) {
        flush()
        out.push({ type: 'math', value: src.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }
    if (src[i] === '`') {
      const end = src.indexOf('`', i + 1)
      if (end !== -1) {
        flush()
        out.push({ type: 'code', value: src.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2)
      if (end !== -1) {
        flush()
        out.push({ type: 'bold', value: src.slice(i + 2, end) })
        i = end + 2
        continue
      }
    }
    text += src[i]
    i++
  }
  flush()
  return out
}

// Plain-text version for search and length checks.
export function plain(src) {
  return tokenize(src)
    .map((t) => t.value)
    .join('')
}
