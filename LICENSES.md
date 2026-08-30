# Third-Party Material and AI Disclosure

Material frameworks, libraries, starters, templates, UI kits, fonts, icons and assets used in this
repository.

| Name | Version or source URL | Licence | Used for |
|---|---|---|---|
| React | 19.2.x — https://react.dev | MIT | User interface library |
| React DOM | 19.2.x — https://react.dev | MIT | Rendering React to the browser |
| Vite | 8.2.x — https://vite.dev | MIT | Build tool and development server |
| `@vitejs/plugin-react` | 6.1.x — https://github.com/vitejs/vite-plugin-react | MIT | React support in Vite |
| TypeScript | 6.0.x — https://www.typescriptlang.org | Apache-2.0 | Language and type checking |
| Tailwind CSS | 4.1.x — https://tailwindcss.com | MIT | Styling |
| `@tailwindcss/vite` | 4.1.x — https://tailwindcss.com | MIT | Tailwind integration for Vite |
| Zustand | 5.0.x — https://github.com/pmndrs/zustand | MIT | Client state management |
| Recharts | 2.15.x — https://recharts.org | MIT | Charts on the dashboard, forecast and pocket screens |
| Tesseract.js | 5.1.x — https://tesseract.projectnaptha.com | Apache-2.0 | Reading receipt photographs in the browser |
| Tesseract.js language data (`eng`) | https://github.com/naptha/tessdata | Apache-2.0 | English OCR model, fetched at runtime on first use |
| Plus Jakarta Sans | https://fonts.google.com/specimen/Plus+Jakarta+Sans | SIL Open Font License 1.1 | Typeface, loaded from Google Fonts |
| `create-vite` `react-ts` template | 9.2.0 — https://github.com/vitejs/vite/tree/main/packages/create-vite | MIT | Initial project scaffold, generated during the event window |
| `@types/react`, `@types/react-dom`, `@types/node` | DefinitelyTyped — https://github.com/DefinitelyTyped/DefinitelyTyped | MIT | Type definitions |
| `P12_personal_ledger_public.json` | LofiStack Hackathon 2026 participant pack | Provided by the organisers for this event | Sample data, committed unmodified in `sample-data/` and served from `public/` |

No UI kit, component library, dashboard template or purchased asset was used. All application code,
styling and layout in `src/` was written by the team during the event window.

## AI tools

- **Claude (Anthropic), via Claude Code** — repository scaffolding, implementation and review during
  the event window. Verified by reading the code, running `npm test` against the published fixture
  committed in `sample-data/`, and driving the application in a browser to confirm the receipt
  reading and correction path works end to end. Also recorded in `evaluation-manifest.json`.

## Original-work statement

Everything not declared in this file or `EVENT.md` was created by the registered team during the
event window.
