---
title: The DOM and How It Works
excerpt: An introduction to the Document Object Model, its history, and how to navigate it.
publishedAt: '2019-09-15'
tags:
  - DOM
  - HTML
  - JavaScript
  - Web Development
status: 'draft'
---

# The DOM and How It Works

The DOM, or the Document Object Model, is the browser's in-memory, tree-shaped representation of a web page. The browser parses HTML into nodes--elements, text, and other document data--then JavaScript can inspect or change that model. For example, changing an element's text or adding a class updates what the browser displays.

A simplified page like:

```html
<body>
    <h1>Hello</h1>
    <p>Welcome</p>
</body>
```

Becomes a tree: `document` → `html` → `body` → `h1` and `p`.

## What Makes Up the DOM?

A DOM tree contains different kinds of nodes:

- **Document node**-- the root representing the loaded page (`document`).
- **Element nodes**-- HTML tags such as `<main>`, `<h1>`, and `<button>`.
- **Text nodes**-- the text inside elements. In `<h1>Hello</h1>`, `Hello` is a text node.
- **Comments and other nodes**-- comments in the markup and document fragments can also be represented as nodes.

Attributes such as `id="intro"` and `href="/about"` belong to elements and can be read or changed through DOM APIs. For example, `<p class="note">Hi</p>` is represented roughly as a paragraph element with a `class` attribute and a text child.

Elements have relationships such as **parent**, **child**, and **sibling**. JavaScript can query those relationships, listen for events, or modify the tree:

```javascript
const note = document.querySelector(".note");

if (note) {
    note.textContent = "Updated";
    note.classList.add("highlight");
}
```

## The DOM and Other Browser Models

The DOM is related to, but distinct from, a few other browser concepts:

- The **CSSOM** represents CSS stylesheets and rules.
- The browser combines the DOM and CSSOM to calculate styles and layout, then paints the result to the screen.
- The **accessibility tree** exposes elements' roles, names, and states to assistive technologies.

These are different representations of a page for different purposes. For example, an element with `display: none` can remain in the DOM while not appearing in the rendered page.

The HTML source is not always identical to the current DOM. The browser parses the original markup into a live model, and JavaScript can change that model after the page loads. DevTools' Elements panel shows the current DOM, which may therefore differ from the original source.

## How to Traverse the DOM

New developers can start by opening **DevTools → Elements** and inspecting a page. Select an element, then use the Console to explore it:

```javascript
const heading = document.querySelector("h1");
heading?.parentElement;             // the heading's parent element
heading?.children;                  // child elements, if any
heading?.nextElementSibling;        // the next element beside it
document.querySelectorAll("p");     // all matching paragraphs
```

The most useful relationships are:

- `parentElement` to move upward.
- `children` or `firstElementChild` to move down.
- `nextElementSibling` and `previousElementSibling` to move across.

In everyday code, prefer `querySelector` and `querySelectorAll` when you know what you want to find. They make the intent clear and avoid brittle assumptions about exactly how many levels separate two elements.

A good practice exercise is to build a small HTML page, select a heading or button, read its text, change a class, and respond to a click. This teaches the structure and traversal methods while showing how DOM changes affect the page.

## A Brief History

Before the DOM was standardized, browsers exposed different and incompatible ways to inspect and change page content. That made interactive sites harder to build consistently across browsers.

The W3C began standardizing the DOM in the late 1990s. **DOM Level 1**, published in 1998, defined a shared model for HTML and XML documents and APIs for navigating and editing their trees. Later specifications expanded the model and its event APIs. Today, the WHATWG maintains the **DOM Standard** as a living standard that continues to evolve with the web platform.
