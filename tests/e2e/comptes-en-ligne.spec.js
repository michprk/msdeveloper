// 1.15 : comptes en ligne, synchronisation et essai sans carte, avec le serveur factice (?cloud=mock).
const { test, expect } = require('@playwright/test');
const { student, open, go, noErrors } = require('./helpers');

test('accueil en ligne : compte créé, données synchronisées, reconnexion', async ({ page }) => {
  const errors = await open(page, null, '?cloud=mock#/');
  await expect(page.locator('body')).toHaveClass(/is-cloud-mock/);
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.locator('.btn-oauth', { hasText: 'Continuer avec Google' })).toBeVisible();
  await page.locator('input[name="prenom"]').fill('Léa');
  await page.locator('input[name="email"]').fill('lea@exemple.be');
  await page.locator('input[name="password"]').fill('cahier123');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'C\'est parti' }).click();
  await expect(page.locator('#view')).toContainText('Bonjour Léa');
  // Une tâche, puis Compte → Données : synchronisé
  await page.evaluate(async () => { const st = await import('/assets/js/store.js'); st.update((s) => { s.tasks.push({ id: 'e2e1', title: 'Fiche de géographie', done: false, list: 'perso', at: Date.now(), updatedAt: Date.now() }); }); });
  await go(page, '#/reglages');
  await expect(page.locator('.acc-note')).toContainText('synchronisés avec ton compte');
  await expect(page.locator('#sync-st')).toContainText('Synchronisé', { timeout: 8000 });
  // Déconnexion : les données quittent l'appareil ; reconnexion : elles reviennent
  await page.locator('#compte-en-ligne').getByRole('button', { name: 'Me déconnecter' }).click();
  await page.locator('.sheet').getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/#\/connexion/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('msdev:v1')).tasks.length)).toBe(0);
  await page.locator('form[data-form="login"] input[name="password"]').fill('cahier123');
  await page.locator('form[data-form="login"]').getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await go(page, '#/taches');
  await expect(page.locator('#view')).toContainText('Fiche de géographie');
  noErrors(errors);
});

test('« Continuer avec Google » ouvre le compte et reprend l\'accueil', async ({ page }) => {
  const errors = await open(page, null, '?cloud=mock#/connexion');
  await page.locator('.btn-oauth', { hasText: 'Google' }).click();
  await expect(page).toHaveURL(/#\/bienvenue/);
  await expect(page.locator('.ob-h')).toContainText('Comment tu t\'appelles');
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('msdev:v1')).account?.email)).toBe('eleve.google@exemple.be');
  noErrors(errors);
});

test('essai Pro sans carte, démarré par le serveur', async ({ page }) => {
  const errors = await open(page, student(), '?cloud=mock#/');
  await page.evaluate(async () => { const a = await import('/assets/js/auth.js'); await a.createAccount({ email: 'tom@exemple.be', password: 'classeur99' }); });
  await go(page, '#/abonnement');
  await page.locator('[data-act="co-open"]').first().click();
  const sheet = page.locator('.sheet');
  await expect(sheet).toContainText('sans carte');
  await expect(sheet).not.toContainText('Premier prélèvement');
  await sheet.getByRole('button', { name: 'Commencer l\'essai gratuit' }).click();
  await expect(page.locator('.toast').last()).toContainText('Essai Pro commencé');
  const sub = await page.evaluate(() => JSON.parse(localStorage.getItem('msdev:v1')).sub);
  expect(sub).toMatchObject({ plan: 'pro', status: 'trialing', card: 0, source: 'stripe' });
  noErrors(errors);
});
