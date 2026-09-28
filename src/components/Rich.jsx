import { memo } from 'react'
import katex from 'katex'
import { tokenize } from '../lib/tokenize.js'

const cache = new Map()
function tex(src, display) {
  const key = (display ? 'D' : 'I') + src
  let html = cache.get(key)
  if (html == null) {
    html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore' })
    cache.set(key, html)
  }
  return html
}

// `big` renders inline math in display style so short answers like \frac{1}{2} stay legible.
function Inline({ tokens, big }) {
  return tokens.map((t, i) => {
    switch (t.type) {
      case 'math':
        return <span key={i} dangerouslySetInnerHTML={{ __html: tex(big ? `\\displaystyle ${t.value}` : t.value, false) }} />
      case 'code':
        return <code key={i}>{t.value}</code>
      case 'bold':
        return (
          <strong key={i}>
            <Inline tokens={tokenize(t.value)} big={big} />
          </strong>
        )
      default:
        return t.value
    }
  })
}

// Groups tokens into block-level pieces: paragraphs, bullet items, display math, code.
function toBlocks(src) {
  const blocks = []
  let line = []
  const endLine = () => {
    const first = line[0]
    if (first?.type === 'text' && /^\s*[-•]\s/.test(first.value)) {
      line[0] = { ...first, value: first.value.replace(/^\s*[-•]\s/, '') }
      blocks.push({ type: 'li', tokens: line })
    } else if (line.some((t) => t.type !== 'text' || t.value.trim())) {
      blocks.push({ type: 'p', tokens: line })
    }
    line = []
  }
  for (const t of tokenize(src)) {
    if (t.type === 'display' || t.type === 'codeblock') {
      endLine()
      blocks.push(t)
    } else if (t.type === 'text' && t.value.includes('\n')) {
      t.value.split('\n').forEach((piece, i) => {
        if (i > 0) endLine()
        if (piece) line.push({ type: 'text', value: piece })
      })
    } else {
      line.push(t)
    }
  }
  endLine()

  // Merge consecutive list items into one list.
  const out = []
  for (const b of blocks) {
    if (b.type === 'li') {
      const last = out[out.length - 1]
      if (last?.type === 'ul') last.items.push(b)
      else out.push({ type: 'ul', items: [b] })
    } else out.push(b)
  }
  return out
}

function Rich({ text, inline = false, big = false, className }) {
  if (!text) return null
  if (inline) {
    return (
      <span className={className}>
        <Inline tokens={tokenize(text.replace(/\n+/g, ' '))} big={big} />
      </span>
    )
  }
  return (
    <div className={`rich ${className ?? ''}`}>
      {toBlocks(text).map((b, i) => {
        if (b.type === 'display') return <div key={i} className="rich-display" dangerouslySetInnerHTML={{ __html: tex(b.value, true) }} />
        if (b.type === 'codeblock') return <pre key={i}><code>{b.value}</code></pre>
        if (b.type === 'ul')
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline tokens={it.tokens} big={big} />
                </li>
              ))}
            </ul>
          )
        return (
          <p key={i}>
            <Inline tokens={b.tokens} big={big} />
          </p>
        )
      })}
    </div>
  )
}

export default memo(Rich)
