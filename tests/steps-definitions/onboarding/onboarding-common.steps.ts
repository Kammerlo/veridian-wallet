import { Given } from "@wdio/cucumber-framework";
import { browser } from "@wdio/globals";
import OnboardingScreen from "../../screen-objects/onboarding/onboarding.screen.js";

Given(/^user tap Get Started button on Onboarding screen$/, async function () {
  await OnboardingScreen.loads();
  await OnboardingScreen.tapOnGetStartedButton();
});

Given(/^the app is launched$/, async function () {
  try {
    const currentUrl = await browser.getUrl();
    if (currentUrl.includes("http://") || currentUrl.includes("https://")) {
      if (!currentUrl.includes("localhost:3003")) {
        await browser.url("/");
        await browser.waitUntil(
          async () => {
            const url = await browser.getUrl();
            return url.includes("localhost:3003");
          },
          {
            timeout: 10000,
            timeoutMsg: "Failed to navigate to app URL",
          }
        );
      }
    } else {
      await browser.pause(2000);
    }
  } catch (error) {
    await browser.pause(2000);
  }
});

