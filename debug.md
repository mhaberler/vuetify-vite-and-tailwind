# Debugging Mobile Layout With Playwright

This repo includes a Playwright setup for checking the app with the `iPhone 14` device profile.

## Files

- `playwright.config.ts`: defines the Playwright config and the `iphone-14` project.
- `tests/mobile-ios.spec.ts`: mobile smoke test that loads the app, checks key UI, and fails on unexpected console errors.

## Prerequisites

Install dependencies and Playwright browsers:

```bash
bun install
npx playwright install
```

If the local dev server is not already running, Playwright will start it through the `webServer` section in `playwright.config.ts`.

## Run The iPhone 14 Check

Run the mobile test on the configured iPhone 14 profile:

```bash
npx playwright test --project=iphone-14
```

Run just the mobile test file:

```bash
npx playwright test tests/mobile-ios.spec.ts --project=iphone-14
```

## Debug Interactively

Open Playwright UI mode:

```bash
npx playwright test --project=iphone-14 --ui
```

Run in headed mode so you can watch the browser:

```bash
npx playwright test --project=iphone-14 --headed
```

Use the Playwright inspector:

```bash
PWDEBUG=1 npx playwright test tests/mobile-ios.spec.ts --project=iphone-14
```

## What The Current Test Checks

The current mobile test in `tests/mobile-ios.spec.ts` does the following:

1. Opens the app with the `iPhone 14` device profile from Playwright.
2. Waits for the main shell to render.
3. Verifies the app title is visible.
4. Verifies the imagery selector button is visible.
5. Collects console errors and fails if it sees unexpected ones.

One known ignored error is:

```text
Blocked script execution in 'about:blank' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
```

That is treated as tooling noise for this workflow.

## Add A Visual Regression Snapshot

If you want to turn the test into a visual regression check, update `tests/mobile-ios.spec.ts` to capture a screenshot after the UI settles.

Example:

```ts
await expect(page).toHaveScreenshot('iphone-14-home.png', {
  fullPage: true,
})
```

On the first run, generate the baseline snapshot with:

```bash
npx playwright test --project=iphone-14 --update-snapshots
```

After that, normal test runs will compare the current rendering against the stored baseline.

## Useful Variations

Run a single test by name:

```bash
npx playwright test --project=iphone-14 -g "renders on iPhone 14"
```

Open the HTML report after a run:

```bash
npx playwright show-report
```

## Notes

- The current Playwright `baseURL` is `http://127.0.0.1:3000`.
- The config reuses an existing local dev server when one is already running.
- If you add more mobile projects later, extend the `projects` array in `playwright.config.ts`.
