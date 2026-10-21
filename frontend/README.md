# React + TypeScript + Vite

## Firebase accounts

Authentication uses Google and email/password sign-in, registration, email
verification, password reset, and Firebase-managed local session persistence.
All learning activities remain public. Story progress, XP, and guest migration
are not implemented. The guest story prompt appears once per app session, after
Firebase finishes restoring any existing session.

1. Register a Web app in your Firebase project and enable Google and
   Email/Password in Authentication. Set Google's support email.
2. Create a **Standard edition, Native mode** Firestore database with ID
   `(default)`, initially in Production mode. Select the region appropriate for
   your users (Singapore is `asia-southeast1`); its location cannot be changed.
3. Copy `.env.example` to `.env.development.local`, preserving your backend/config
   settings. Fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, and
   `VITE_FIREBASE_DATABASE_ID` from your web configuration and database ID.
   Restart Vite after changing environment variables. These are public web
   configuration values; never put a service-account key in a `VITE_*` variable.
4. Under Authentication > Settings > Authorized domains, add `localhost`,
   `local-minima-lab.github.io`, and `mlviz-test.storage.googleapis.com` if those
   are the hosts you use. Include any custom hostnames. Enter only the hostname,
   without protocol, port, `/mlviz`, or hash route.
5. Review the prototype rules in `firestore.rules` and publish them to your
   project's `(default)` database. Either paste them into the Firebase Console's
   Firestore Rules editor and Publish, or run these commands from `frontend/`:

   ```sh
   npx --no-install firebase login --no-localhost
   npx --no-install firebase deploy --config firebase.json --project YOUR_PROJECT_ID --only firestore:rules
   ```

The app uses only `users/{auth.uid}` documents, containing `displayName` (1–100
characters), immutable `createdAt`, and `updatedAt` server timestamps. Credentials,
email, and verification status stay in Firebase Authentication. Profile writes
use transactions to preserve creation timestamps and avoid duplicate documents.
Rules permit only the owner to get/create/update their valid profile; listing,
deleting, other users' data, and undeclared paths/fields are denied. If a different
database ID is used, update both the environment variable and `firebase.json`'s
Firestore database target before deployment.

Profile saving errors do not undo sign-in. Open your account from the header and
retry saving after checking the connection/rules. Unverified users can request a
new verification email and refresh verification from that dialog. Email action
links use Firebase's hosted handler, compatible with this app's HashRouter and
GitHub Pages subpath. Configure the public app name and email templates in the
Firebase console. Existing sign-in provider conflicts show an instruction to use
the original provider; account linking and deletion are outside this version.

Missing local Firebase configuration leaves learning available and shows an
explanation in the account dialog. It never enables a mock signed-in session.

### Password requirements and strength

Configure the enforced password policy in Firebase Authentication > Settings >
Password policy. The registration form uses Firebase's `validatePassword()` to
load and display the actual length/character requirements and accepted special
characters, then updates an accessible checklist as the user types. Signup checks
the policy again before requesting account creation; Firebase remains the final
authority. There is no hardcoded six-character signup policy.

A lazily loaded zxcvbn strength estimate runs locally and provides guidance about
predictable passwords. Its score does not block a password meeting the configured
policy. To keep typing responsive, estimation is skipped above 128 characters;
the complete password still goes to Firebase validation and account creation
without trimming or truncation. Passwords and estimates are not saved to the
account store, Firestore, logs, or third-party strength/breach services.

Existing passwords are submitted to Firebase without applying signup constraints
in the sign-in form. If Firebase rejects sign-in because the configured policy
forces an upgrade, the dialog offers password reset and carries the email into
the reset form. The reset link uses Firebase's hosted handler to enforce policy.

### Deployment variables

In GitHub Settings > Secrets and variables > Actions > **Variables**, add the
five `FIREBASE_PROD_*` variables below and the corresponding `FIREBASE_TEST_*`
variables. Workflows map these to the `VITE_FIREBASE_*` build variables and fail
before building if any are missing:

| Production variable | Value |
| --- | --- |
| `FIREBASE_PROD_API_KEY` | Web config `apiKey` |
| `FIREBASE_PROD_AUTH_DOMAIN` | Web config `authDomain` |
| `FIREBASE_PROD_PROJECT_ID` | Web config `projectId` |
| `FIREBASE_PROD_APP_ID` | Web config `appId` |
| `FIREBASE_PROD_DATABASE_ID` | `(default)` or your database ID |

Use a separate Firebase project for deployed testing when available. Local
`.env.development.local` values are not used by production builds. No backend
service-account credential is required for these client SDK operations.

Windows and WSL each keep their own CLI login. Run login and deployment in the
same environment. Firebase does not need a Windows installation when developing
in WSL. Use Node 22.15+ for frontend tooling (some CLI dependencies require Node 22).
If CLI startup is slow from a project under `/mnt/c`, run login from your Linux
home directory with `npx --yes firebase-tools@14.27.0 login --no-localhost`; that
uses WSL's native npm cache, separately from browser SDK packages. With nvm, select
an installed Node 22+ version before running that command. A subshell can keep
the Node selection local to login/deployment rather than changing your app shell.

### Verification

Automated tests require Node 22.15+ for the existing Node test runner hooks and
TypeScript stripping. Run `npm test` and `npm run build`. Run `npm run test:firebase` for isolated Auth
and Firestore emulator integration/security tests (requires Java for Firestore).
The tests use `demo-mlviz-auth` and never use your environment file or real users.
On Windows the test launcher applies a process-local Java TCP-loopback workaround
for hosts where Java's internal Unix-domain sockets fail; no system settings change.
Finally, smoke-test Google popup sign-in, refresh/session restoration, sign-out,
verification delivery, and password reset delivery in your configured project.

## Pathways and theme

Static, dynamic, and mixed learning pages use the `bg-page` theme colour, defined
once as `--color-page` in `src/index.css`. Page names and categories do not determine
backgrounds. Chart and card surfaces keep their own styling.

The shared header switches between Visualisations and Stories and opens the
Firebase account dialogs described above.

Pathways use the resolved config graph, including referenced story transitions.
Blue nodes identify the current page, visited nodes can be restarted, and dashed
connections indicate unavailable transitions. Subpage rings reflect readiness and
advancement within an attempt; Replay clears their presentation without clearing
lesson condition history. Scroll to explore longer or wider graphs; at most six
nodes are rendered in the visible window.

Pathway state and navigation actions live in `src/store/pathwayStore.ts`.
`usePathway` reads the common Zustand store directly, without React context or a
provider. `usePathwaySession` resets the active session when entering a story or
visualisation and cleans up history subscriptions and timers. The history adapter
subscribes to the existing story/visualisation stores so activity completion and
transition conditions remain live. DOM scroll measurements stay local to the graph.
Drag selection also lives in Zustand, keyed by each surface's DOM scope so separate
drag exercises cannot share a selection. A surface removes its state on unmount.

Run `npm test` with Node.js 22.6 or newer for focused pathway/store, condition, preview,
and colour-palette checks. Run `npm run build` and `npm run lint -- --quiet` for
TypeScript, bundling, and styling validation.

## Page names

A page's `name` is its readable navigation label. For dynamic pages, the same value
selects the component: `"name": "Follow Questions"` matches `case "Follow Questions"`.
Rename both together. Static pages also define `name`; mixed pages use their
dynamic page's name, including when that page comes from a visualisation reference.
Navigation reads these names directly, without fetching Markdown for headings or
converting component identifiers. Unnamed pages show `Page N`.

## Exercise completion

Dynamic exercises receive `onComplete()` and call it when their success criteria
are met. Navigation records one `page_complete` history event for the resolved
page and unlocks outgoing transitions with `"condition_type": "Completed"`.
The learner selects when to continue. `Completed` always refers to the transition's
source page, including inside `And` and `Or` conditions and expanded story references.

Subpage exercises call `onSubpageReady()` for each successful step, followed by
`onComplete()` on the final step. Every configured subpage must be ready before the
page can complete. Callbacks from earlier presentations are ignored; review and
Replay preserve completion history while resetting presentation progress.

To migrate older configs, remove `completion_button_id` from pages and replace
their completion-based `Button` conditions with `Completed`, removing `button_id`.
Replace exercise calls to `recordButtonClick(completionButtonId)` with `onComplete()`.
Generic `Button` conditions remain available for named-button interactions.
Config-builder checks run with `python -m unittest discover -s tests -v` from `config`.

## Tailwind checks

Run `npm run lint` from `frontend` to check TypeScript/React code and Tailwind
classes across the frontend. To show errors without the existing `any` warnings,
run `npm run lint -- --quiet`.

ESLint uses `eslint-plugin-better-tailwindcss` with `src/index.css` as the Tailwind
entry point. Unknown classes and conflicting utilities are errors. The three custom
font-width selectors in
`src/index.css` are explicitly allowed. Class ordering and formatting rules are off.
The plugin stays on version 3.x to support the current Tailwind 4.1.11 installation.
These static checks do not catch every dynamic class or visual layout issue.

## Unused code cleanup

Run `npx knip` from this directory to review unused code before running
`npx knip --fix`. Knip removes unused exports, but can leave the declarations
and imports behind. With `noUnusedLocals` enabled, those leftovers cause
TypeScript errors during the build. Remove declarations that are no longer
used, including any helpers and imports used only by them, then run
`npm install` to synchronize the lockfile and `npm run build` to verify the cleanup.
Repeat `npx knip` if removing code exposes more unused exports or files.

`src/types/api.ts` is generated by `npm run generate:ts`. Its exports are
excluded from Knip's cleanup in `knip.json`; regenerate this file rather than
editing it manually.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
