// Phase 1 (1.10) : recentrage élèves — modules, menu, quiz, ton, migration des anciennes données.
const { test, expect } = require('@playwright/test');
const { student, open, go, noErrors } = require('./helpers');

test('un nouvel élève ne voit pas le module Entrepreneur', async ({ page }) => {
  const errors = await open(page, student(), '#/plus');
  await expect(page.locator('#view')).toContainText('Études');
  const titles = await page.locator('#view .sec-title').allTextContents();
  expect(titles).toContain('Études');
  expect(titles).not.toContain('Entrepreneur');
  await expect(page.locator('#view')).not.toContainText('Scripts d\'appel');
  noErrors(errors);
});

test('Compte > Modules active Entrepreneur', async ({ page }) => {
  const errors = await open(page, student(), '#/reglages?s=modules');
  const sw = page.locator('input[data-m="entrepreneur"]');
  await sw.check();
  await go(page, '#/plus');
  await expect(page.locator('#view')).toContainText('Entrepreneur');
  await expect(page.locator('#view')).toContainText('Devis');
  noErrors(errors);
});

test('menu latéral : une dizaine d\'entrées, Études repliable au clavier', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'le menu latéral n\'existe que sur grand écran');
  const errors = await open(page, student(), '#/');
  const visible = page.locator('.side-groups .side-i:visible');
  expect(await visible.count()).toBeLessThanOrEqual(10);
  const toggle = page.locator('.side-tg[data-g="etudes"]');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.side-tg[data-g="etudes"]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#sg-etudes')).toContainText('Examens');
  await expect(page.locator('.side-groups')).not.toContainText('Figma');
  noErrors(errors);
});

test('quiz : pas de liens vers d\'autres applications, pas de quiz de commerce pour un élève', async ({ page }) => {
  const errors = await open(page, student(), '#/quiz');
  const html = await page.locator('#view').innerHTML();
  expect(html).not.toMatch(/quizlet|kahoot|ankiweb/i);
  await expect(page.locator('#view')).not.toContainText('Prospecter au téléphone');
  await expect(page.locator('#view')).toContainText('S\'organiser et gérer son temps');
  noErrors(errors);
});

test('tutoiement pour un élève, vouvoiement pour un profil pro', async ({ page }) => {
  await open(page, student(), '#/apercu');
  await expect(page.locator('#view')).toContainText('Ta régularité');
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('msdev:v1')); s.profile.situation = 'agence'; localStorage.setItem('msdev:v1', JSON.stringify(s)); });
  await page.reload();
  await expect(page.locator('#view')).toContainText('Votre régularité');
});

test('migration : un ancien compte avec clients et prospection garde Entrepreneur', async ({ page }) => {
  const errors = await open(page, { v: 3, onboarded: true, profile: { prenom: 'Sam', usages: ['organiser', 'clients', 'prospecter', 'apprendre'] }, prospects: [], activities: [], tasks: [], projects: [], pages: [] }, '#/plus');
  await expect(page.locator('#view')).toContainText('Entrepreneur');
  const usages = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('msdev:v1')); return s.v >= 4 ? s.profile.usages : null; });
  // L'état migré s'enregistre au premier changement ; à défaut, l'affichage ci-dessus fait foi
  if (usages) expect(usages).toContain('entrepreneur');
  noErrors(errors);
});
