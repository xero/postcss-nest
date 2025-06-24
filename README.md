# postcss-nest [<img src="https://postcss.github.io/postcss/logo.svg" alt="PostCSS Logo" width="90" height="90" align="right">][PostCSS]

> ## _"the opposite of every other css nesting plugin!"_

[<img alt="npm version" src="https://img.shields.io/npm/v/postcss-nest.svg" height="20">][npm-url]

A **[DRY CSS]** optimizer and advanced nesting plugin for [PostCSS].
- Aggressively merges and refactors shared declarations
- Nests pseudo-classes/elements with `&` only when required
- Groups sibling selectors by shared property
- Recurses for `@media` queries and deep nesting.
- Produces beautiful, modern, minimal, maintainable, CSS/SCSS/SASS output.

---

## Install

With **npm**:
```bash
npm install postcss-nest --save-dev
```

With **bun**:
```bash
bun add postcss-nest
```

---

## Usage

Add `postcss-nest` to your PostCSS plugins:

```js
const postcss = require('postcss')
const postcssNest = require('postcss-nest')

postcss([
  postcssNest(/* pluginOptions */)
]).process(YOUR_CSS /*, processOptions */)
```

### With postcss.config.js

```js
module.exports = {
  plugins: [
    require('postcss-nest')({
      // options (all default to true)
      nestDescendants: true,
      collapseNestedSiblings: true,
      factorCommonProps: true,
      nestPseudos: true
    })
  ]
}
```

---

## TypeScript Usage

TypeScript type definitions are included!

```typescript
import postcss from "postcss";
import postcssNest, { PostcssNestOptions } from "postcss-nest";

const options: PostcssNestOptions = {
  nestDescendants: true,
  collapseNestedSiblings: true,
  factorCommonProps: true,
  nestPseudos: true
};

postcss([postcssNest(options)]).process(cssString).then(result => {
  console.log(result.css);
});
```

---

## What does it do?

- **Nests descendant selectors:**
  Turns `.foo .bar { ... }` into `.foo { .bar { ... } }`.
- **Aggressively merges siblings:**
  Turns duplicated or partially-duplicated sibling selectors into grouped selectors and factors out shared properties.
- **Nests pseudo-classes/elements:**
  Turns `a:hover { ... }` into `a { &:hover { ... } }`.
- **Ultra-DRY output:**
  Only unique, unshared styles remain in their original selectors.

---

## Plugin Options

All options default to `true`.
You can disable any pass if desired:

| Option                   | Default | Description                                                                |
|--------------------------|---------|----------------------------------------------------------------------------|
| `nestDescendants`        | `true`  | Enable nesting of descendant selectors                                     |
| `collapseNestedSiblings` | `true`  | Enable block-level sibling merging                                         |
| `factorCommonProps`      | `true`  | Enable aggressive property-level factoring                                 |
| `nestPseudos`            | `true`  | Enable nesting of pseudo-classes/elements with `&`                         |

Example:
```js
postcssNest({
  nestDescendants: false,
  nestPseudos: true
})
```

---

## Examples

### 1. Aggressive Property Factoring

**Input:**
```css
#title {
  font-size: 1.34em;
  background: #444;
}
#quote {
  font-size: 1.34em;
  background: #000;
}
```

**Output:**
```css
#title, #quote {
  font-size: 1.34em;
}
#title { background: #444; }
#quote { background: #000; }
```

---

### 2. Pseudo Nesting

**Input:**
```css
a {
  color: #060;
}
a:hover,
a:focus {
  color: #0f0;
}
```

**Output:**
```css
a {
  color: #060;
  &:hover, &:focus {
    color: #0f0;
  }
}
```

---

### 3. Descendant Nesting

**Input:**
```css
.foo .bar {
  color: red;
}
```

**Output:**
```css
.foo {
  .bar {
    color: red;
  }
}
```

---

### 4. Media Queries & Deep Merging

**Input:**
```css
@media (max-width: 900px) {
  body { font-size: 14px; }
  aside {
    font-size 14px;
    max-width: 350px;
  }
}
```

**Output:**
```css
@media (max-width: 900px) {
  body, aside { font-size: 14px; }
  aside { max-width: 350px; }
}
```

---

### 5. Using Options

**Input with plugin options:**
```js
postcssNest({ nestPseudos: false })
```
```css
a { color: #0f0; }
a:hover, a:focus { color: #0f0; }
```
**Output:**
```css
a { color: #0f0; }
a:hover, a:focus { color: #0f0; }
```

---

### 6. TypeScript Example

**Input:**
```typescript
import postcss from "postcss";
import postcssNest, { PostcssNestOptions } from "postcss-nest";

const css = `
.foo .bar {
  color: red;
}
a:hover, a:focus {
  color: blue;
}
`;

const options: PostcssNestOptions = {
  nestDescendants: true,
  nestPseudos: true
};

postcss([postcssNest(options)])
  .process(css)
  .then(result => {
    console.log(result.css);
  });
```

**Output:**
```css
.foo {
  .bar {
    color: red;
  }
}
a {
  &:hover, &:focus {
    color: blue;
  }
}
```

---

## License

**CC0 1.0 Universal (Public Domain Dedication)**
You can use this for any purpose, commercial or non-commercial, with or without attribution.

[npm-url]: https://www.npmjs.com/package/postcss-nest
[DRY CSS]: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself
[PostCSS]: https://github.com/postcss/postcss
