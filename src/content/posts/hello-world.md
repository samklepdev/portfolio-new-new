---
title: 'Hello World'
excerpt: 'A placeholder post that exercises every element the prose styles cover.'
publishedAt: '2026-09-11'
tags:
  - Next
  - Notes
status: 'published'
---

This paragraph exists to check body copy: its line height, its measure, and the
colour it inherits. It runs long enough to wrap at least twice on a desktop
viewport so the leading is actually visible.

## A second-level heading

Body copy under an `h2`, with **bold text** and an [inline link](/projects)
to check the underline offset.

### A third-level heading

- A bulleted list item
- A second item, long enough to wrap onto a second line so the hanging indent
  can be checked against the marker
- A third item

1. A numbered item
2. A second numbered item
3. A third numbered item

> A blockquote, to check the left border and the muted colour it uses.

Inline `code` inside a sentence, followed by a fenced block:

```ts
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
```

---

A closing paragraph after a horizontal rule.
