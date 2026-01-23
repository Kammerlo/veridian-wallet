import type { Options } from "@wdio/types";
import "dotenv/config";
import { returnBoolean } from "../helpers/parse.js";
import * as fs from "fs";
import * as path from "path";

export const config: Options.Testrunner = {
  runner: "local",
  tsConfigPath: 'tsconfig.json',
  specs: ["../features/**/*.feature"],
  specFileRetries: 0,
  specFileRetriesDelay: 3,
  specFileRetriesDeferred: false,
  maxInstances: 1,
  logLevel: "debug",
  bail: 0,
  baseUrl: "LACK_OF_BASE_URL",
  waitforTimeout: 45000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [],
  framework: "cucumber",
  reporters: [
    "spec",
    [
      "allure",
      {
        outputDir: "./tests/.reports/allure-results",
        addConsoleLogs: true,
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: true,
        useCucumberStepReporter: true,
      },
    ],
  ],
  cucumberOpts: {
    backtrace: false,
    requireModule: [],
    failAmbiguousDefinitions: true,
    failFast: false,
    format: ["pretty"],
    colors: true,
    ignoreUndefinedDefinitions: false,
    names: [],
    snippets: true,
    source: true,
    profile: [],
    require: [
      "./tests/steps-definitions/**/*.ts",
      "./tests/actions/**/*.ts",
    ],
    tags: "",
    timeout: 100 * 1000,
  },
  onPrepare: function (config, capabilities) {
    const screenshotsDir = path.join(process.cwd(), "tests", "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log(`[WDIO] Created screenshots directory: ${screenshotsDir}`);
    }
  },
  beforeScenario: async function (scenario) {
    try {
      const { driver, browser } = await import("@wdio/globals");
      await browser.pause(1000);
      
      const contexts = await driver.getContexts();
      const nativeContext = contexts.find((ctx) => {
        const ctxStr = typeof ctx === 'string' ? ctx : ctx.id || String(ctx);
        return !ctxStr.includes('WEBVIEW');
      });
      
      if (nativeContext) {
        const nativeCtxStr = typeof nativeContext === 'string' ? nativeContext : nativeContext.id || String(nativeContext);
        await driver.switchContext(nativeCtxStr);
        
        try {
          const dontAllowButton = await driver.$('//android.widget.Button[@text="Don\'t allow" or @text="DON\'T ALLOW" or @text="Not now" or @text="Deny" or @text="DENY"]');
          if (await dontAllowButton.isExisting() && await dontAllowButton.isDisplayed()) {
            await dontAllowButton.click();
          } else {
            await driver.pressKeyCode(4);
          }
          await browser.pause(500);
        } catch (e) {}
        
        const webviewContext = contexts.find((ctx) => {
          const ctxStr = typeof ctx === 'string' ? ctx : ctx.id || String(ctx);
          return ctxStr.includes('WEBVIEW');
        });
        if (webviewContext) {
          const webviewCtxStr = typeof webviewContext === 'string' ? webviewContext : webviewContext.id || String(webviewContext);
          await driver.switchContext(webviewCtxStr);
        }
      }
    } catch (e) {}
  },
  afterScenario: async function (world, result, context) {
    const { driver } = await import("@wdio/globals");
    const appPackage = "org.cardanofoundation.idw";
    
    try {
      const contexts = await driver.getContexts();
      const nativeContext = contexts.find((ctx) => {
        const ctxStr = typeof ctx === 'string' ? ctx : ctx.id || String(ctx);
        return !ctxStr.includes('WEBVIEW');
      });
      if (nativeContext) {
        const nativeCtxStr = typeof nativeContext === 'string' ? nativeContext : nativeContext.id || String(nativeContext);
        await driver.switchContext(nativeCtxStr);
      }
      await driver.terminateApp(appPackage);
    } catch (e) {}
    
    if (returnBoolean(process.env.RELOAD_SESSION as string)) {
      await driver.reloadSession();
    }
  },
};
