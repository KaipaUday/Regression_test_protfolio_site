import { expect, test, type Page } from '@playwright/test';
import fixture from './test-data/portfolio-fixture.json'assert { type: 'json' };

type Experience = {
	company: string;
	role: string;
	location: string;
	from: string;
	to: string;
	points: string[];
	skills: string[];
};

type Education = {
	university: string;
	course: string;
	location: string;
	from: string;
	to: string;
	points: string[];
	skills: string[];
};

type Project = {
	name: string;
	description: string;
	duration: string;
	skills: string[];
};

type Portfolio = {
	name: string;
	address: string;
	phone: string;
	email: string;
	dob: string;
	summary: string;
	experience: Experience[];
	education: Education[];
	certifications: string[];
	project: Project[];
};

type FixtureData = {
	access: {
		invalidFormatCodes: string[];
		notFoundCodes: string[];
	};
	profiles: Array<{
		code: string;
		portfolio: Portfolio;
	}>;
};

const testData = fixture as FixtureData;
const primaryProfile = testData.profiles[0];
const secondaryProfile = testData.profiles[1];

async function mockPortfolioApi(page: Page) {
	await page.route('http://127.0.0.1:5000/*', async (route) => {
		const reqUrl = new URL(route.request().url());
		const code = decodeURIComponent(reqUrl.pathname.slice(1)).toLowerCase();
		const profile = testData.profiles.find((item) => item.code.toLowerCase() === code);

		if (profile) {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					code: profile.code,
					data: profile.portfolio,
					available_views: 19
				})
			});
			return;
		}

		await route.fulfill({
			status: 404,
			contentType: 'application/json',
			body: JSON.stringify({ error: 'Code not found' })
		});
	});
}

async function completeFlowAssertions(page: Page, profile: { code: string; portfolio: Portfolio }) {
	await page.goto(`/${profile.code}`);

	await expect(page.getByRole('button', { name: 'Proceed >' })).toBeVisible();
	await expect(page.getByRole('heading', { name: profile.portfolio.name })).toBeVisible();
	await expect(page.getByText(profile.portfolio.summary)).toBeVisible();

	await page.getByRole('button', { name: 'Proceed >' }).click();
	await expect(page.getByRole('heading', { name: 'Main Menu' })).toBeVisible();

	await page.getByRole('button', { name: /^Experience/ }).click();
	await expect(page.getByRole('heading', { name: 'Experience' })).toBeVisible();
	await expect(page.getByText(profile.portfolio.experience[0].company)).toBeVisible();
	await page.getByRole('button', { name: 'Next >' }).click();
	await expect(page.getByText(profile.portfolio.experience[1].company)).toBeVisible();
	await page.getByRole('button', { name: 'Return to Main Menu' }).click();

	await page.getByRole('button', { name: /^Projects/ }).click();
	await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
	await expect(page.getByText(profile.portfolio.project[0].name)).toBeVisible();
	await page.getByRole('button', { name: 'Next >' }).click();
	await expect(page.getByText(profile.portfolio.project[1].name)).toBeVisible();
	await page.getByRole('button', { name: 'Return to Main Menu' }).click();

	await page.getByRole('button', { name: /^Education/ }).click();
	await expect(page.getByRole('heading', { name: 'Education' })).toBeVisible();
	await expect(page.getByText(profile.portfolio.education[0].university)).toBeVisible();
	await page.getByRole('button', { name: 'Return to Main Menu' }).click();

	await expect(page.getByRole('button', { name: 'Next >' })).toBeEnabled();
	await page.getByRole('button', { name: 'Next >' }).click();

	await expect(page.getByRole('heading', { name: 'Certifications' })).toBeVisible();
	await expect(page.getByText(profile.portfolio.certifications[0])).toBeVisible();
	await page.getByRole('button', { name: 'Next >' }).click();

	await expect(page.getByRole('heading', { name: 'End' })).toBeVisible();
	await expect(page.getByText('Thanks for reviewing my portfolio walkthrough.')).toBeVisible();
}

test.describe('Portfolio access flow', () => {
	test('TC1: form visible, valid code opens portfolio, invalid codes block access', async ({ page }) => {
		await mockPortfolioApi(page);
		await page.goto('/');

		await expect(page.getByRole('heading', { name: 'Portfolio Access' })).toBeVisible();
		await expect(page.getByPlaceholder('Enter 6-character code')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();

		// for (const invalidCode of testData.access.invalidFormatCodes) {
		// 	await page.getByPlaceholder('Enter 6-character code').fill(invalidCode);
		// 	await page.getByRole('button', { name: 'Open' }).click();
		// 	await expect(page.getByText('Code must be exactly 6 alphanumeric characters.')).toBeVisible();
		// 	await expect(page).toHaveURL('/');
		// }

		for (const notFoundCode of testData.access.notFoundCodes) {
			await page.getByPlaceholder('Enter 6-character code').fill(notFoundCode);
			await page.getByRole('button', { name: 'Open' }).click();
			await expect(page.getByText('Access code not found.')).toBeVisible();
			await expect(page.getByRole('heading', { name: 'Portfolio Access' })).toBeVisible();
		}

		await page.getByPlaceholder('Enter 6-character code').fill(primaryProfile.code);
		await page.getByRole('button', { name: 'Open' }).click();

		await expect(page.getByRole('button', { name: 'Proceed >' })).toBeVisible();
		await expect(page.getByRole('heading', { name: primaryProfile.portfolio.name })).toBeVisible();
	});

	test('TC2: direct URL open works and name page data is shown', async ({ page }) => {
		await mockPortfolioApi(page);
		await page.goto(`/${primaryProfile.code}`);

		await expect(page.getByRole('button', { name: 'Proceed >' })).toBeVisible();
		await expect(page.getByRole('heading', { name: primaryProfile.portfolio.name })).toBeVisible();
		await expect(page.getByText(primaryProfile.portfolio.summary)).toBeVisible();
	});

	test('TC3: happy path navigation to end with expected section data', async ({ page }) => {
		await mockPortfolioApi(page);
		await completeFlowAssertions(page, primaryProfile);
	});

	test('TC4: two different profiles render different UI data through the flow', async ({ page }) => {
		await mockPortfolioApi(page);
		await completeFlowAssertions(page, primaryProfile);

		await expect(page.getByText(secondaryProfile.portfolio.name)).not.toBeVisible();
		await expect(page.getByText(secondaryProfile.portfolio.experience[0].company)).not.toBeVisible();

		await completeFlowAssertions(page, secondaryProfile);
		await expect(page.getByText(primaryProfile.portfolio.name)).not.toBeVisible();
		await expect(page.getByText(primaryProfile.portfolio.experience[0].company)).not.toBeVisible();
	});
});
