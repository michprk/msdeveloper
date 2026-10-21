// Serveur factice (1.15) : imite Supabase (comptes, base de données avec ses règles) et le paiement Stripe,
// entièrement dans ce navigateur. Activé par ?cloud=mock (pour la session) ou CLOUD.mock = true.
// Sert à essayer les comptes, la synchronisation et le paiement AVANT d'avoir créé les vrais comptes,
// et aux tests automatiques. Rien ne part sur internet. Les mots de passe y sont gardés en empreinte SHA-256.
// - Inscription avec ou sans confirmation par e-mail (mockConfig.confirm) ; les e-mails arrivent dans une
//   boîte factice (mockAdmin.inbox()), et l'application propose d'ouvrir le lien.
// - Table user_data avec les mêmes règles que le vrai serveur : chacun sa ligne, version (rev) tenue par la base.
// - Paiement : la page Stripe est sautée, l'abonnement est enregistré comme le ferait le webhook.
const KEY = 'msdev:cloud-mock';
export const mockConfig = { confirm: false, latency: 30, maxBytes: 5 * 1024 * 1024 };
const empty = () => ({ users: {}, tokens: {}, refresh: {}, confirm: {}, codes: {}, data: {}, subs: {}, events: [], inbox: [] });
const load = () => { try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return empty(); } };
const save = (st) => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* plein */ } };
const rnd = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
const uuid = () => crypto.randomUUID?.() || `${rnd().slice(0, 8)}-${rnd().slice(0, 4)}-4${rnd().slice(0, 3)}-a${rnd().slice(0, 3)}-${rnd().slice(0, 12)}`;
const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, '0')).join('');
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pub = (u) => ({ id: u.id, email: u.email, app_metadata: { provider: u.provider }, email_confirmed_at: u.confirmed ? new Date(u.at).toISOString() : null });
const app = () => location.origin + location.pathname;
const json = (status, data) => new Response(data === null ? null : JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const err = (status, code, msg) => json(status, { error_code: code, code, msg, message: msg });

function session(st, user) {
  const at = rnd(), rt = rnd();
  st.tokens[at] = { uid: user.id, exp: Date.now() + 3600e3 };
  st.refresh[rt] = user.id;
  return { access_token: at, refresh_token: rt, expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user: pub(user) };
}
const frag = (s, type) => `#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=3600&expires_at=${s.expires_at}&token_type=bearer&type=${type}`;
function mail(st, to, subject, link) { st.inbox.push({ to, subject, link, at: Date.now() }); window.dispatchEvent(new CustomEvent('ms:mock-mail', { detail: { to, subject, link } })); }
const byEmail = (st, email) => Object.values(st.users).find((u) => u.email === String(email || '').trim().toLowerCase());
const eq = (q, k) => (q.get(k) || '').replace(/^eq\./, '');
const pickCols = (row, sel) => (sel && sel !== '*' ? Object.fromEntries(sel.split(',').map((c) => [c, row[c]])) : row);

export async function mockFetch(url, init = {}) {
  await wait(mockConfig.latency);
  const u = new URL(url), p = u.pathname, q = u.searchParams, m = (init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};
  const st = load();
  const tok = (init.headers?.Authorization || '').replace(/^Bearer\s+/, '');
  const t = st.tokens[tok];
  const me = t && t.exp > Date.now() ? st.users[t.uid] : null;
  const done = (r) => { save(st); return r; };

  // ---------- Comptes ----------
  if (p === '/auth/v1/signup' && m === 'POST') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return err(400, 'validation_failed', 'Adresse e-mail invalide.');
    if (String(body.password || '').length < 8) return err(422, 'weak_password', 'Mot de passe trop faible.');
    if (byEmail(st, email)) return err(422, 'user_already_exists', 'Un compte existe déjà avec cette adresse.');
    const user = { id: uuid(), email, pw: await sha(body.password), confirmed: !mockConfig.confirm, provider: 'email', at: Date.now() };
    st.users[user.id] = user;
    if (!mockConfig.confirm) return done(json(200, session(st, user)));
    const s = session(st, user); delete st.tokens[s.access_token]; st.confirm[s.access_token] = user.id;
    mail(st, email, 'Confirme ton adresse', (q.get('redirect_to') || app()) + frag(s, 'signup'));
    return done(json(200, { id: user.id, email, confirmation_sent_at: new Date().toISOString() }));
  }
  if (p === '/auth/v1/token' && m === 'POST') {
    const g = q.get('grant_type');
    if (g === 'password') {
      const user = byEmail(st, body.email);
      if (!user || !user.pw || user.pw !== await sha(body.password || '')) return err(400, 'invalid_credentials', 'Invalid login credentials');
      if (!user.confirmed) return err(400, 'email_not_confirmed', 'Email not confirmed');
      return done(json(200, session(st, user)));
    }
    if (g === 'refresh_token') {
      const uid = st.refresh[body.refresh_token];
      if (!uid || !st.users[uid]) return err(400, 'refresh_token_not_found', 'Invalid Refresh Token');
      delete st.refresh[body.refresh_token];
      return done(json(200, session(st, st.users[uid])));
    }
    if (g === 'pkce') {
      const c = st.codes[body.auth_code];
      if (!c) return err(404, 'flow_state_not_found', 'Code inconnu.');
      delete st.codes[body.auth_code];
      if (b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.code_verifier || ''))) !== c.challenge) return done(err(400, 'bad_code_verifier', 'Vérification PKCE refusée.'));
      return done(json(200, session(st, st.users[c.uid])));
    }
    return err(400, 'unsupported_grant_type', 'Type inconnu.');
  }
  if (p === '/auth/v1/user' && m === 'GET') {
    if (me) return json(200, pub(me));
    const uid = st.confirm[tok];
    if (uid && st.users[uid]) { delete st.confirm[tok]; st.users[uid].confirmed = true; st.tokens[tok] = { uid, exp: Date.now() + 3600e3 }; return done(json(200, pub(st.users[uid]))); }
    return err(401, 'bad_jwt', 'Session invalide.');
  }
  if (p === '/auth/v1/user' && m === 'PUT') {
    if (!me) return err(401, 'bad_jwt', 'Session invalide.');
    if (body.password !== undefined) {
      if (String(body.password).length < 8) return err(422, 'weak_password', 'Mot de passe trop faible.');
      const h = await sha(body.password);
      if (h === me.pw) return err(422, 'same_password', 'Même mot de passe.');
      st.users[me.id].pw = h;
    }
    return done(json(200, pub(st.users[me.id])));
  }
  if (p === '/auth/v1/logout' && m === 'POST') { delete st.tokens[tok]; return done(json(204, null)); }
  if (p === '/auth/v1/recover' && m === 'POST') {
    const user = byEmail(st, body.email);
    if (user) mail(st, user.email, 'Choisis un nouveau mot de passe', (q.get('redirect_to') || app()) + frag(session(st, user), 'recovery'));
    return done(json(200, {}));
  }
  if (p === '/auth/v1/resend' && m === 'POST') {
    const user = byEmail(st, body.email);
    if (user && !user.confirmed) { const s = session(st, user); delete st.tokens[s.access_token]; st.confirm[s.access_token] = user.id; mail(st, user.email, 'Confirme ton adresse', (q.get('redirect_to') || app()) + frag(s, 'signup')); }
    return done(json(200, {}));
  }

  // ---------- Base de données (mêmes règles que le vrai serveur) ----------
  if (p.startsWith('/rest/v1/') && !me) return err(401, 'PGRST301', 'JWT manquant ou expiré.');
  if (p === '/rest/v1/subscriptions' && m === 'GET') return json(200, st.subs[me.id] ? [st.subs[me.id]] : []);
  if (p === '/rest/v1/events' && m === 'POST') { st.events.push({ uid: me.id, name: body.name, at: Date.now() }); return done(json(201, null)); }
  if (p === '/rest/v1/user_data') {
    if (m === 'GET') {
      const row = eq(q, 'user_id') === me.id ? st.data[me.id] : null; // RLS : seulement sa ligne
      return json(200, row ? [pickCols(row, q.get('select'))] : []);
    }
    if (m === 'POST') {
      if ((body.user_id || me.id) !== me.id) return err(403, '42501', 'new row violates row-level security policy');
      if (st.data[me.id]) return err(409, '23505', 'duplicate key value violates unique constraint');
      if (JSON.stringify(body.data || {}).length > mockConfig.maxBytes) return err(400, '23514', 'violates check constraint "user_data_taille"');
      st.data[me.id] = { user_id: me.id, data: body.data || {}, rev: 1, updated_at: new Date().toISOString() };
      return done(json(201, [st.data[me.id]]));
    }
    if (m === 'PATCH') {
      const row = st.data[me.id];
      if (eq(q, 'user_id') !== me.id || !row || String(row.rev) !== eq(q, 'rev')) return json(200, []);
      if (JSON.stringify(body.data || {}).length > mockConfig.maxBytes) return err(400, '23514', 'violates check constraint "user_data_taille"');
      Object.assign(row, { data: body.data, rev: row.rev + 1, updated_at: new Date().toISOString() });
      return done(json(200, [row]));
    }
  }

  // ---------- Fonctions serveur ----------
  if (p.startsWith('/functions/v1/') && !me) return err(401, 'auth', 'Session invalide.');
  if (p === '/functions/v1/create-checkout-session') {
    const { plan, trial, interval } = body;
    if (!['pro', 'premium'].includes(plan)) return err(400, 'plan', 'Formule inconnue.');
    const cur = st.subs[me.id];
    if (cur && ['active', 'trialing', 'past_due'].includes(cur.status)) return json(409, { error: 'already' });
    if (trial && cur) return json(409, { error: 'trial_used' });
    // Essai : sans carte, démarré directement ; abonnement : la page Stripe est sautée (paiement réussi)
    const days = trial ? 7 : interval === 'year' ? 365 : 30;
    st.subs[me.id] = { plan, status: trial ? 'trialing' : 'active', billing_interval: interval === 'year' ? 'year' : 'month', has_payment_method: !trial, current_period_end: new Date(Date.now() + days * 864e5).toISOString(), cancel_at_period_end: false };
    return done(json(200, trial ? { started: true } : { url: `${app()}?checkout=ok#/abonnement` }));
  }
  if (p === '/functions/v1/create-portal-session') {
    // Espace de gestion factice : un moyen de paiement est « ajouté »
    if (st.subs[me.id]) st.subs[me.id].has_payment_method = true;
    return done(json(200, { url: `${app()}#/abonnement` }));
  }
  if (p === '/functions/v1/delete-account') {
    for (const k of ['data', 'subs']) delete st[k][me.id];
    for (const [k, v] of Object.entries(st.tokens)) if (v.uid === me.id) delete st.tokens[k];
    delete st.users[me.id];
    return done(json(200, { deleted: true }));
  }
  return err(404, 'not_found', `Point d'entrée inconnu : ${m} ${p}`);
}

// « Continuer avec Google » factice : un compte élève prêt, et un code à échanger (PKCE)
export function mockAuthorize(provider, challenge, back) {
  const st = load();
  const email = `eleve.${provider}@exemple.be`;
  let user = byEmail(st, email);
  if (!user) { user = { id: uuid(), email, pw: null, confirmed: true, provider, at: Date.now() }; st.users[user.id] = user; }
  const code = rnd();
  st.codes[code] = { uid: user.id, challenge };
  save(st);
  return `${back}?code=${code}`;
}

// Pour les tests et les démonstrations : voir et modifier le « serveur »
export const mockAdmin = {
  state: load,
  reset: () => save(empty()),
  inbox: () => load().inbox,
  lastLink: () => load().inbox.at(-1)?.link || null,
  // Simule un autre appareil : modifie les données du compte et fait avancer la version
  editData: (email, fn) => {
    const st = load();
    const user = byEmail(st, email);
    const row = user && st.data[user.id];
    if (!row) return false;
    fn(row.data);
    row.rev += 1; row.updated_at = new Date().toISOString();
    save(st);
    return row.rev;
  },
};
