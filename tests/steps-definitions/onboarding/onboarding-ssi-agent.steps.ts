import { Given, When, Then } from "@wdio/cucumber-framework";
import { expect } from "expect-webdriverio";
import SsiAgentDetailsScreen from "../../screen-objects/onboarding/ssi-agent-details.screen.js";
import { SSIAgent } from "../../constants/text.constants";
import ProfileSetupScreen from "../../screen-objects/onboarding/profile-setup.screen.js";
import ConnectToVeridianScreen from "../../screen-objects/onboarding/connect-to-veridian.screen.js";
import SsiAgentScanScreen from "../../screen-objects/onboarding/ssi-agent-scan.screen.js";
import Assert from "../../helpers/assert.js";
import { browser } from "@wdio/globals";
import { getSSIAgentUrls } from "../../helpers/ssi-agent-urls.helper.js";

Then(/^user can see SSI Agent Details screen$/, async function () {
  await SsiAgentDetailsScreen.loads();
});

Given(/^user navigates to SSI Agent Advanced Setup screen$/, async function() {
  const isOnAdvancedSetup = async () => {
    const [hasConnectUrl, hasParagraph, hasBootUrl] = await Promise.all([
      SsiAgentDetailsScreen.connectUrlInput.isExisting().catch(() => false),
      SsiAgentDetailsScreen.screenTopParagraph.isExisting().catch(() => false),
      SsiAgentDetailsScreen.bootUrlInput.isExisting().catch(() => false),
    ]);
    return hasConnectUrl && (hasParagraph || hasBootUrl);
  };

  if (await isOnAdvancedSetup()) {
    return;
  }

  const isOnSSIAgentDetails = await SsiAgentDetailsScreen.connectUrlInput.isExisting().catch(() => false);
  if (isOnSSIAgentDetails) {
    return;
  }

  const isOnConnectScreen = await ConnectToVeridianScreen.getConnectedButton.isDisplayed().catch(() => false);
  if (isOnConnectScreen) {
    const advancedSetupBtn = $("[data-testid*='advanced']");
    const btnExists = await advancedSetupBtn.isExisting().catch(() => false);
    if (!btnExists) {
      throw new Error("Advanced Setup button not found on Connect to Veridian screen");
    }
    await advancedSetupBtn.click();
    await browser.waitUntil(
      async () => await isOnAdvancedSetup(),
      {
        timeout: 10000,
        timeoutMsg: "Did not navigate to Advanced Setup screen",
      }
    );
    return;
  }

  const isOnScanScreen = await SsiAgentScanScreen.scanContainer.isDisplayed().catch(() => false);
  if (isOnScanScreen) {
    await SsiAgentScanScreen.advancedSetupButton.click();
    await browser.waitUntil(
      async () => await isOnAdvancedSetup(),
      {
        timeout: 10000,
        timeoutMsg: "Did not navigate to Advanced Setup screen",
      }
    );
    return;
  }

  const currentUrl = await browser.getUrl();
  try {
    const advancedSetupButton = $("[data-testid*='advanced']");
    const exists = await advancedSetupButton.isExisting().catch(() => false);
    if (exists) {
      await advancedSetupButton.click();
      await browser.waitUntil(
        async () => await isOnAdvancedSetup(),
        {
          timeout: 10000,
          timeoutMsg: "Did not navigate to Advanced Setup screen after clicking button",
        }
      );
      return;
    }
  } catch (e) {
    // Advanced Setup button not found
  }

  throw new Error(`Could not navigate to SSI Agent Advanced Setup screen from URL: ${currentUrl}`);
});

Given(/^SSI Agent URLs are cleared$/, async function() {
  await SsiAgentDetailsScreen.clearBothUrls();
});

When(/^user enters boot URL "([^"]*)"$/, async function(bootUrl: string) {
  if (bootUrl === "default" || bootUrl === "${SSI_AGENT_BOOT_URL}") {
    bootUrl = getSSIAgentUrls().bootUrl;
  }
  await SsiAgentDetailsScreen.enterBootUrl(bootUrl);
  await SsiAgentDetailsScreen.connectUrlInput.click();
});

When(/^user enters connect URL "([^"]*)"$/, async function(connectUrl: string) {
  if (connectUrl === "default" || connectUrl === "${SSI_AGENT_CONNECT_URL}") {
    connectUrl = getSSIAgentUrls().connectUrl;
  }
  await SsiAgentDetailsScreen.enterConnectUrl(connectUrl);
  await SsiAgentDetailsScreen.bootUrlInput.click();
});

When(/^user tap Validate button on SSI Agent Details screen$/, async function() {
  await browser.waitUntil(
    async () => {
      const isEnabled = await SsiAgentDetailsScreen.validateButton.isEnabled().catch(() => false);
      return isEnabled;
    },
    {
      timeout: 10000,
      timeoutMsg: "Validate button not enabled",
    }
  );
  
  await SsiAgentDetailsScreen.tapOnValidatedButton();
  await browser.pause(5000);
  
  const bootUrlError = await SsiAgentDetailsScreen.bootUrlError.isDisplayed().catch(() => false);
  const connectUrlError = await SsiAgentDetailsScreen.connectUrlError.isDisplayed().catch(() => false);
  const currentUrl = await browser.getUrl();
  
  if (bootUrlError || connectUrlError) {
    const bootErrorText = bootUrlError ? await SsiAgentDetailsScreen.bootUrlError.getText().catch(() => "") : "";
    const connectErrorText = connectUrlError ? await SsiAgentDetailsScreen.connectUrlError.getText().catch(() => "") : "";
    throw new Error(`Validation failed. Boot URL error: ${bootErrorText}, Connect URL error: ${connectErrorText}, Current URL: ${currentUrl}`);
  }
  
  if (currentUrl.includes("ssiagent") && !currentUrl.includes("profile-setup")) {
    const pageText = await browser.execute(() => {
      const errorElements = document.querySelectorAll('[data-testid*="error"], [class*="error"], [class*="Error"]');
      return Array.from(errorElements).map(el => el.textContent).filter(Boolean).join(" | ");
    }).catch(() => "");
    
    throw new Error(`Validation failed but no error detected. Still on SSI agent screen. Current URL: ${currentUrl}. Page errors: ${pageText}`);
  }
  
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes("profile-setup");
    },
    {
      timeout: 30000,
      timeoutMsg: `Did not navigate to Profile type screen. Current URL: ${currentUrl}`,
    }
  );
});

Then(/^user can see Profile type screen$/, async function() {
  await ProfileSetupScreen.loads();
});

Then(/^user can see "([^"]*)" error message for boot URL$/, async function(errorMessage: string) {
  await expect(SsiAgentDetailsScreen.bootUrlError).toBeDisplayed();
  const errorText = await SsiAgentDetailsScreen.bootUrlError.getText();
  expect(errorText).toContain(errorMessage);
});

Then(/^user can see "([^"]*)" error message for connect URL$/, async function(errorMessage: string) {
  await expect(SsiAgentDetailsScreen.connectUrlError).toBeDisplayed();
  const errorText = await SsiAgentDetailsScreen.connectUrlError.getText();
  expect(errorText).toContain(errorMessage);
});

Then(/^Connect button is disabled$/, async function() {
  const isEnabled = await SsiAgentDetailsScreen.isConnectButtonEnabled();
  expect(isEnabled).toBe(false);
});

When(/^user taps Connect button$/, async function() {
  await expect(SsiAgentDetailsScreen.connectButton).toBeDisplayed();
  await expect(SsiAgentDetailsScreen.connectButton).toBeEnabled();
  await SsiAgentDetailsScreen.connectButton.click();
});
