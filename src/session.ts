import { Browser, Page } from "playwright";

/**
 * Creates a new browser page within an existing Playwright Browser instance
 * and navigates to the specified URL.
 * @param browser The active Playwright Browser instance.
 * @param url The URL to navigate the new page to.
 * @returns A Promise that resolves to the newly created and navigated Page object.
 */
export async function createSession(browser: Browser, url: string): Promise<Page> {
  const page = await browser.newPage();
  // Navigate the new page to the provided URL.
  await page.goto(url);

  return page;
}
