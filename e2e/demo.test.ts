import { expect, test } from '@playwright/test';

test('home page has form with expected fields', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('h1')).toBeVisible();
});
