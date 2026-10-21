// 1.16 : page de présentation, aperçu de partage, défi de quiz entre amis.
const { test, expect } = require('@playwright/test');
const { student, open, go, noErrors } = require('./helpers');

test('page de présentation : lisible, sans débordement, avec son aperçu de partage', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto('/presentation/');
  await expect(page.locator('h1')).toContainText('Tes cours, tes devoirs');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /presentation\/og\.png$/);
  await expect(page.locator('a', { hasText: 'Commencer gratuitement' })).toHaveAttribute('href', '../');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over).toBeLessThanOrEqual(0);
  const og = await page.request.get('/presentation/og.png');
  expect(og.ok()).toBeTruthy();
  expect(errors).toEqual([]);
});

test('un défi de quiz montre le score à battre, puis le résultat du défi', async ({ page }) => {
  const errors = await open(page, student(), '#/quiz/organisation?defi=70');
  await expect(page.locator('.qz-defi')).toContainText('70 %');
  // Répond à toutes les questions (première réponse à chaque fois)
  for (let i = 0; i < 20; i++) {
    const opt = page.locator('[data-act="qz-pick"]').first();
    if (!(await opt.count())) break;
    await opt.click();
    await page.locator('[data-act="qz-next"]').click();
  }
  await expect(page.locator('.qz-defi.is-end')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Défier un ami' })).toBeVisible();
  noErrors(errors);
});

test('quelqu\'un de nouveau qui ouvre un défi y revient après l\'accueil', async ({ page }) => {
  const errors = await open(page, null, '#/quiz/organisation?defi=60');
  await expect(page).toHaveURL(/#\/bienvenue/);
  await page.getByRole('button', { name: 'Commencer' }).click();
  await page.locator('input[name="prenom"]').fill('Zoé');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'C\'est parti' }).click();
  await expect(page).toHaveURL(/#\/quiz\/organisation/);
  await expect(page.locator('.qz-defi')).toContainText('60 %');
  noErrors(errors);
});

test('« Inviter un ami » est dans le menu Plus', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'menu Plus : téléphone');
  const errors = await open(page, student(), '#/plus');
  await expect(page.locator('[data-act="share-app"]')).toContainText('Inviter un ami');
  await go(page, '#/');
  noErrors(errors);
});
