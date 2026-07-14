import type { Page, Locator } from "@playwright/test";

export class OnboardingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly companyNameInput: Locator;
  readonly companyTypeSelect: Locator;
  readonly continueButton: Locator;
  readonly skipButton: Locator;
  readonly backButton: Locator;
  readonly launchButton: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByText("Welcome to TEMERITY");
    this.companyNameInput = page.getByPlaceholder("Enter your company name");
    this.companyTypeSelect = page.getByText("Select company type");
    this.continueButton = page.getByRole("button", { name: "Continue" });
    this.skipButton = page.getByRole("button", { name: "Skip for now" });
    this.backButton = page.getByRole("button", { name: "Back" });
    this.launchButton = page.getByRole("button", { name: "Launch TEMERITY" });
    this.successHeading = page.getByText("You're all set!");
  }

  async goto() {
    await this.page.goto("/onboarding");
  }

  async fillCompanyIdentity(companyName: string, companyType: string) {
    await this.companyNameInput.fill(companyName);
    await this.companyTypeSelect.click();
    await this.page.getByRole("option", { name: companyType }).click();
  }

  async skipToReview() {
    await this.skipButton.click(); // Skip Contact
    await this.skipButton.click(); // Skip Logo
  }

  async completeOnboarding(companyName: string, companyType = "General Contractor") {
    await this.fillCompanyIdentity(companyName, companyType);
    await this.continueButton.click();
    await this.skipToReview();
    await this.launchButton.click();
  }

  async waitForRedirect() {
    await this.page.waitForURL(
      (url) => !url.pathname.includes("/onboarding"),
      { timeout: 15000 }
    );
  }
}
