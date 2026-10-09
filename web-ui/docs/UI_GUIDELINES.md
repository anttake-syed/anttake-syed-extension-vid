# UI layout guidelines

How the web UI stays responsive as features are added. The approach follows
open-source dashboards such as Supabase Studio and Cal.com: one token file,
one breakpoint scale, an app shell built once, and page primitives that every
page uses.

## Files

| File | What lives there |
| --- | --- |
| `src/styles/tokens.css` | Colours, spacing, type scale, radii, z-index, layout widths. The only place raw values are defined. |
| `src/styles/breakpoints.js` | The same breakpoints for JS (`useBreakpoint`). Keep in sync with `tokens.css`. |
| `src/styles/layout.css` | App shell (sidebar, header) and layout primitives. |
| `src/components/layout/Page.jsx` | React wrappers: `Page`, `SectionHead`, `Stack`, `Cluster`, `Grid`, `TableScroll`. |
| `src/hooks/useBreakpoint.js` | Only for when the *markup* must differ by screen size. Prefer CSS. |
| `scripts/check-ui.mjs` | Guardrail. Run `npm run check:ui`. |

## Breakpoints (mobile-first)

| Name | Width | Shell |
| --- | --- | --- |
| base | < 640px | Phone: sticky top bar, sidebar is a drawer |
| `sm` | 640px | Large phone: same shell, roomier content |
| `md` | 768px | Tablet: sidebar becomes a 72px icon rail |
| `lg` | 1024px | Laptop: full 260px sidebar |
| `xl` | 1280px | Desktop |

Write base styles for phones and add `@media (min-width: …)` for more room.
Inside a page, prefer **container queries**: `.page` is a container, so
`.grid-2` / `.grid-3` respond to the space the page actually has (the sidebar
takes some), not the window width.

## Building a page

```jsx
import { Page, SectionHead, Grid, Stack, Cluster, TableScroll } from './layout/Page.jsx';

<Page width="default">               {/* narrow 768 | default 1200 | wide 1600 | full */}
  <Stack gap="var(--space-5)">
    <SectionHead
      title={<h2>Recent captures</h2>}
      actions={<button className="btn-primary">New</button>}
    />
    <Grid min="260px">{cards}</Grid> {/* as many columns as fit */}
    <Grid cols={2}>{panels}</Grid>   {/* 2 columns when wide, 1 on phones */}
    <TableScroll><table>…</table></TableScroll>
  </Stack>
</Page>
```

Choose the page width by content: `narrow` for forms, settings and legal
text; `default` for dashboards; `wide` for libraries and grids; `full` for
canvases such as the whiteboard editor.

## Rules

1. **Layout goes in classes, not inline styles.** Inline `style` can't use
   media or container queries. Keep inline styles for values that really are
   dynamic (a progress %, a user-chosen colour, a position).
2. **Never hard-code column counts.** Use `Grid cols` or `Grid min`. For a
   custom grid, write `repeat(auto-fill, minmax(min(100%, 240px), 1fr))`. The
   `min(100%, …)` stops overflow on phones.
3. **Never set a large fixed width.** Use `maxWidth`, or
   `width: 'min(100%, 420px)'`. Panels and drawers use
   `width: min(420px, 100vw)`.
4. **Flex and grid children that hold text need `min-width: 0`.** Long text
   gets `.truncate` (one line) or `.break-anywhere` (URLs, IDs, emails).
5. **Rows of buttons or pills wrap.** Use `Cluster`, not `display: flex`
   with `nowrap`.
6. **Tables always go in `TableScroll`.** A table may scroll; the page never
   scrolls sideways.
7. **Modals fit the screen.** `.modal-card` caps height to the viewport and
   scrolls its body. Footers use `.dialog-actions`, which stacks full-width
   buttons on phones. Long forms belong in a side sheet, not a modal.
8. **Use colours and spacing from tokens:** `var(--primary)`,
   `var(--text-dim)`, `var(--space-4)`. Add a token before adding a new raw
   value.
9. **Use `100dvh`, not `100vh`.** Mobile browser toolbars make `100vh` too
   tall. Fixed bars respect `env(safe-area-inset-*)`.
10. **Touch targets are at least 44px** (`var(--tap-target)`, or the `.icon-btn` class) for icon
    buttons.
11. **Hide by breakpoint with the helpers** (`.hide-below-sm`,
    `.hide-below-md`, `.show-below-sm`, `.show-below-md`), not JS.

## Guardrail

`npm run check:ui` counts patterns that break small screens: fixed grid
columns, unclamped `minmax(px)`, large fixed widths, `100vh`, and raw hex
colours. A count may never go **up**. When you remove some, run
`npm run check:ui -- --update` to lower the baseline. For a deliberate
exception, add a `// ui-check-ignore` comment on that line and explain why.

## Checking a change

Before merging UI work, look at it at **375px, 768px, 1024px and 1440px**
(browser dev tools, responsive mode). The page must not scroll sideways at
any width.
