// Phase 5 (1.14) : compte cohérent en mode local, données bien visibles, rappel de sauvegarde.
const { test, expect } = require('@playwright/test');
const { student, open, go, noErrors } = require('./helpers');

const tasks = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, title: `Devoir ${i}`, done: false, list: 'perso', at: Date.now() }));

test('mode local : pas de mot de passe, pas de contradiction, données en premier', async ({ page }) => {
  const errors = await open(page, student({ tasks: tasks(6) }), '#/reglages');
  await expect(page.locator('.acc-note')).toContainText('Pas de mot de passe');
  await expect(page.locator('body')).not.toContainText('aucun mot de passe n\'est stocké');
  await expect(page.locator('#compte-en-ligne')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Créer mon compte|Ajouter un mot de passe/ })).toHaveCount(0);
  await expect(page.locator('.acc-nav .chip-btn').first()).toHaveText('Données');
  await expect(page.locator('.data-main .btn-primary')).toContainText('Télécharger toutes mes données');
  await expect(page.locator('.data-main')).toContainText('Restaurer une sauvegarde');
  await expect(page.locator('.data-card .backup-st.is-warn')).toBeVisible();
  // La sauvegarde télécharge un fichier JSON complet et retire le rappel
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('.data-main .btn-primary').click()]);
  expect(dl.suggestedFilename()).toMatch(/^msdeveloper-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.locator('.data-card .backup-st.is-warn')).toHaveCount(0);
  noErrors(errors);
});

test('rappel de sauvegarde sur l\'accueil, avec « Plus tard »', async ({ page }) => {
  const errors = await open(page, student({ createdAt: Date.now() - 20 * 864e5, tasks: tasks(6), prefs: { lastBackup: Date.now() - 20 * 864e5 } }), '#/');
  const strip = page.locator('.nudge-bk');
  await expect(strip).toBeVisible();
  await strip.getByRole('button', { name: 'Plus tard' }).click();
  await expect(page.locator('.nudge-bk')).toHaveCount(0);
  noErrors(errors);
});

test('ancien mot de passe (1.9) : se déconnecter ou le retirer', async ({ page }) => {
  const errors = await open(page, student({ account: { email: 'lea@exemple.be', at: Date.now(), cloud: false, kdf: { salt: 'AAAA', hash: 'BBBB', it: 1 } } }), '#/reglages');
  // Session ouverte sur cet appareil (sinon l'écran de connexion s'impose)
  await page.evaluate(() => localStorage.setItem('msdev:session', 'lea@exemple.be'));
  await page.reload();
  await go(page, '#/reglages');
  await expect(page.locator('.acc-note')).toContainText('version précédente');
  const card = page.locator('#compte-en-ligne');
  await expect(card.getByRole('button', { name: 'Me déconnecter' })).toBeVisible();
  await card.getByRole('button', { name: 'Retirer le mot de passe' }).click();
  await expect(page.locator('form[data-form="acc-pw-remove"] input[autocomplete="current-password"]')).toBeVisible();
  noErrors(errors);
});

test('le bouton du menu propose la sauvegarde en mode local', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'menu latéral : ordinateur');
  const errors = await open(page, student(), '#/');
  await expect(page.locator('.side-auth')).toContainText('Sauvegarder mes données');
  await go(page, '#/reglages');
  noErrors(errors);
});
