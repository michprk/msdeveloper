// Phase 6 (1.17) : écrans chargés à la demande, badge de notifications honnête, vue d'ensemble d'un compte récent,
// texte très grand sans débordement, clavier, « Continuer sans compte ».
const { test, expect } = require('@playwright/test');
const { student, open, go, noErrors } = require('./helpers');

const day = 864e5;
const task = (id, due, extra = {}) => ({ id, title: `Tâche ${id}`, done: false, list: 'perso', at: Date.now(), due, ...extra });

test('démarrage léger : un écran n\'est chargé qu\'à sa première ouverture', async ({ page }) => {
  const loaded = [];
  page.on('request', (r) => { if (/\/assets\/js\/views\//.test(r.url())) loaded.push(r.url().split('/views/')[1]); });
  const errors = await open(page, student(), '#/');
  await expect(page.locator('#view')).toContainText('Bonjour');
  expect(loaded).not.toContain('notes.js');
  expect(loaded).not.toContain('crm.js');
  await go(page, '#/notes');
  await expect(page.locator('.ph-t')).toContainText('Notes');
  expect(loaded).toContain('notes.js');
  noErrors(errors);
});

test('un bouton d\'un écran pas encore chargé fonctionne quand même (recherche)', async ({ page }) => {
  const errors = await open(page, student(), '#/');
  await page.locator('[data-act="search"]').first().click();
  await expect(page.locator('dialog.sheet')).toBeVisible();
  noErrors(errors);
});

test('badge : rien pour des exemples, neutre pour un rappel, rouge pour un retard', async ({ page }) => {
  const today18 = new Date(); today18.setHours(23, 30, 0, 0);
  const errors = await open(page, student({ tasks: [task('d1', Date.now() - 3 * day, { demo: true })] }), '#/');
  await expect(page.locator('.bell-n')).toHaveCount(0);
  noErrors(errors);
  await page.evaluate((t) => { const s = JSON.parse(localStorage.getItem('msdev:v1')); s.tasks = [t]; localStorage.setItem('msdev:v1', JSON.stringify(s)); }, task('r1', today18.getTime()));
  await page.reload();
  await expect(page.locator('.bell-n')).toHaveClass(/is-info/);
  await page.evaluate((t) => { const s = JSON.parse(localStorage.getItem('msdev:v1')); s.tasks.push(t); localStorage.setItem('msdev:v1', JSON.stringify(s)); }, task('l1', Date.now() - 2 * day));
  await page.reload();
  await expect(page.locator('.bell-n')).not.toHaveClass(/is-info/);
  noErrors(errors);
});

test('vue d\'ensemble d\'un compte récent : pas de pourcentage absurde', async ({ page }) => {
  const errors = await open(page, student({ createdAt: Date.now() - 2 * day, tasks: [task('t1', Date.now() - day, { done: true, doneAt: Date.now() - 3600e3 })] }), '#/apercu');
  await expect(page.locator('.kpi2-d').first()).toContainText('Nouveau');
  await expect(page.locator('.kpi2-d').first()).not.toContainText('%');
  await expect(page.locator('.fx-chg.is-cur')).toHaveText('en cours');
  noErrors(errors);
});

test('texte « très grand » : aucun écran ne déborde sur téléphone', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'téléphone');
  const errors = await open(page, student({ prefs: { textSize: 'xl' } }), '#/');
  for (const r of ['#/', '#/apercu', '#/taches', '#/agenda?v=mois', '#/agenda?v=semaine', '#/concentration', '#/reglages', '#/abonnement']) {
    await go(page, r);
    await page.waitForTimeout(150);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, r).toBeLessThanOrEqual(1);
  }
  noErrors(errors);
});

test('clavier : « Aller au contenu » et fenêtres nommées', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'clavier : ordinateur');
  const errors = await open(page, student(), '#/taches');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/taches$/);
  await expect(page.locator('#view')).toBeFocused();
  await page.locator('[data-act="search"]').first().click();
  const dlg = page.locator('dialog.sheet');
  await expect(dlg).toHaveAttribute('aria-labelledby', /sh-/);
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  noErrors(errors);
});

test('en ligne : « Continuer sans compte » retire l\'e-mail et le mot de passe', async ({ page }) => {
  const errors = await open(page, null, '?cloud=mock#/');
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await page.locator('input[name="prenom"]').fill('Nina');
  await page.locator('[data-act="ob-noacc"]').click();
  await expect(page.locator('input[name="password"]')).toHaveCount(0);
  await expect(page.locator('input[name="prenom"]')).toHaveValue('Nina');
  noErrors(errors);
});
