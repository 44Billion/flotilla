import {expect, test} from "@playwright/test"

test("boots the SPA on the home page", async ({page}) => {
  const response = await page.goto("/")

  expect(response?.ok()).toBeTruthy()

  // adapter-static serves an empty shell that hydrates client-side, so the presence of
  // rendered text proves the Svelte app actually mounted (not just that a file was served).
  // TODO: tighten this to assert concrete onboarding UI once the markup is settled.
  await expect(page.locator("body")).toContainText(/\S/, {timeout: 15_000})
})
