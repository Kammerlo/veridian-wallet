/**
 * Webview context switching utility with retry mechanism
 * Handles CDP timeout issues by polling and retrying context switching
 */

import { driver, browser } from "@wdio/globals";

/**
 * Switches to the app's webview context with retry mechanism
 * Polls driver.getContexts() with retries to handle CDP timeout issues
 */
export async function switchToAppWebview(
  timeoutMs: number = 30000,
  retryIntervalMs: number = 1000
): Promise<void> {
  const startTime = Date.now();
  const appPackage = "org.cardanofoundation.idw";
  const expectedWebview = `WEBVIEW_${appPackage}`;

  console.log(`[Webview Helper] Switching to webview context: ${expectedWebview}`);

  // Add pause before attempting to collect CDP data to allow Chrome driver to attach properly
  await browser.pause(1000);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const contexts = await driver.getContexts();
      const webviewContext = contexts.find((ctx) => {
        const ctxStr = typeof ctx === 'string' ? ctx : ctx.id || String(ctx);
        return ctxStr.includes('WEBVIEW') && ctxStr.includes(appPackage);
      });

      if (webviewContext) {
        try {
          const ctxToSwitch = typeof webviewContext === 'string' ? webviewContext : webviewContext.id || String(webviewContext);
          await driver.switchContext(ctxToSwitch);
          console.log(`[Webview Helper] Successfully switched to: ${ctxToSwitch}`);
          return;
        } catch (switchError) {
          console.log(`[Webview Helper] Found webview but switch failed, retrying...`);
        }
      } else {
        const contextsStr = contexts.map(ctx => typeof ctx === 'string' ? ctx : ctx.id || String(ctx)).join(', ');
        console.log(`[Webview Helper] Webview not found yet. Available contexts: ${contextsStr}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('CDP') || errorMsg.includes('timeout')) {
        console.log(`[Webview Helper] CDP timeout, retrying in ${retryIntervalMs}ms...`);
      }
    }

    await browser.pause(retryIntervalMs);
  }

  throw new Error(
    `Failed to switch to webview context ${expectedWebview} within ${timeoutMs}ms. ` +
    `This may indicate CDP connection issues or the webview not being ready.`
  );
}
