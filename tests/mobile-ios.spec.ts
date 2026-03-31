import { expect, test } from '@playwright/test'

const ignoredConsoleErrors = [
  /Blocked script execution in 'about:blank' because the document's frame is sandboxed/i,
]

test('renders on iPhone 14 without unexpected console errors', async ({ page }) => {
  const consoleErrors: string[] = []

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    const text = message.text()
    if (ignoredConsoleErrors.some(pattern => pattern.test(text))) {
      return
    }

    consoleErrors.push(text)
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Flight Review')).toBeVisible()
  await expect(page.getByRole('button', { name: /versaTiles satellite/i })).toBeVisible()

  await page.waitForTimeout(2_000)

  expect(consoleErrors).toEqual([])
})