// Confidentialité et RGPD : ce que l'application enregistre, où, et comment exercer ses droits.
// Texte à faire relire avant le lancement commercial ; les coordonnées du responsable
// du traitement sont à compléter (voir le bloc « À compléter »).
import { S } from '../store.js';
import { ic } from '../ui.js';
import { pageHead } from './common.js';
import { cloudReady, cloudMock, cloudUser, authMode } from '../cloud.js';

export const PRIVACY_UPDATED = '21 octobre 2026';

export function privacyView() {
  const s = S();
  const n = s.tasks.length + s.pages.length + s.prospects.length + s.quotes.length;
  // Compte en ligne connecté : le contenu est aussi dans le compte (synchronisation)
  const synced = authMode() === 'online' && !!cloudUser();
  const sec = (id, title, body) => `<section class="card article rise" id="${id}"><h2>${title}</h2>${body}</section>`;
  const html = `${pageHead('Confidentialité et RGPD', { kicker: `Mise à jour le ${PRIVACY_UPDATED}`, back: '#/reglages' })}
    <section class="card priv-key rise">
      <ul class="priv-l">
        <li>${ic('lock')}<span>${synced ? '<b>Vos données sont sur vos appareils et dans votre compte.</b> Hébergées dans l\'Union européenne, protégées par les règles de la base de données : seul votre compte y a accès.' : '<b>Vos données restent sur votre appareil.</b> Aucun serveur MindView ne les reçoit, et personne chez M&amp;S Design n\'y a accès.'}</span></li>
        <li>${ic('shield')}<span><b>Aucune publicité, aucun traceur, aucun cookie de suivi.</b> Pas d'outil de statistiques extérieur, pas de pixel, pas de revente.</span></li>
        <li>${ic('download')}<span><b>Vous gardez la main.</b> Tout exporter ou tout effacer prend un geste, depuis votre compte.</span></li>
      </ul>
    </section>
    ${sec('donnees', 'Ce que l\'application enregistre', `<p>Uniquement ce que vous y saisissez : votre profil (prénom, société, coordonnées de facturation si vous les ajoutez), vos tâches, projets, pages de notes, résultats de quiz, fiches clients et prospects, devis, réglages et l'état de votre abonnement.</p>
      <p>Sur cet appareil, il y a en ce moment <b>${n} élément${n > 1 ? 's' : ''}</b> (tâches, pages, fiches et devis).</p>`)}
    ${sec('stockage', 'Où sont-elles stockées ?', `<p>Dans le stockage local du navigateur de cet appareil${synced ? ', et dans votre compte en ligne pour les retrouver sur vos autres appareils (voir « Si vous créez un compte en ligne »)' : ''}. Sinon, elles ne quittent l'appareil que si vous le décidez : en téléchargeant une sauvegarde, un export (CSV, Markdown, agenda .ics) ou un PDF de devis.</p>
      <p>Les fichiers de l'application sont servis par un hébergeur (GitHub Pages) qui, comme pour tout site web, reçoit techniquement l'adresse IP de l'appareil pour délivrer les pages. Les polices sont hébergées avec l'application : aucun appel à un service tiers à l'ouverture.</p>`)}
    ${sec('droits', 'Vos droits (RGPD)', `<ul>
        <li><b>Accès et portabilité</b> : Compte → Données → « Télécharger une sauvegarde » (fichier JSON complet), export CSV des fiches, export Markdown des pages, export .ics des tâches.</li>
        <li><b>Rectification</b> : chaque information se modifie directement dans l'application.</li>
        <li><b>Effacement</b> : Compte → Suppression → « Supprimer mon compte et mes données ». Rien n'est conservé ailleurs.</li>
        <li><b>Opposition et limitation</b> : l'application ne fait ni profilage ni décision automatisée ; rien n'est utilisé à d'autres fins que vous servir.</li>
      </ul>
      <p>Vous pouvez aussi introduire une plainte auprès de l'Autorité de protection des données (Belgique) ou de l'autorité de votre pays.</p>
      <div class="act-row"><a class="btn btn-ghost btn-sm" href="#/reglages?s=donnees">${ic('download')}<span>Mes données</span></a><a class="btn btn-ghost btn-sm" href="#/reglages?s=sensible">${ic('trash')}<span>Supprimer mon compte</span></a></div>`)}
    ${sec('contacts', 'Les personnes de votre CRM', `<p>Pour les clients, prospects ou contacts que vous enregistrez, c'est <b>vous</b> qui êtes responsable du traitement. Quelques règles simples :</p>
      <ul>
        <li>N'enregistrez que l'utile au suivi professionnel (pas de données sensibles : santé, opinions, etc.).</li>
        <li>Prospection : appuyez-vous sur l'intérêt légitime entre professionnels, et respectez toujours un refus (« ne plus me contacter »). Pour appeler des particuliers, consultez la liste « Ne m'appelez plus ».</li>
        <li>Supprimez les fiches qui ne servent plus : supprimer une fiche efface aussi son historique d'échanges.</li>
        <li>Si une personne demande ses données, l'export CSV de sa fiche ou une copie de la page suffit.</li>
      </ul>`)}
    ${sec('tiers', 'Connecteurs, aperçus et paiement', `<p><b>Canva, Figma, Notion, Drive, GitHub</b> : l'application enregistre seulement le lien que vous collez. L'aperçu intégré Figma ou Canva ne se charge que si vous touchez « Afficher l'aperçu » ; le service concerné reçoit alors votre adresse IP et applique sa propre politique de confidentialité. L'import Notion par fichier lit les fichiers que vous choisissez, sur l'appareil.</p>
      <p><b>Connexion directe à Notion</b> (si vous l'activez) : MindView lit seulement les pages et bases que vous avez choisies dans la fenêtre d'autorisation de Notion. Les demandes passent par le serveur de MindView, qui garde la clé d'accès Notion et transmet les données sans les conserver ; le secret de l'intégration n'est jamais dans l'application. Ce que vous importez est enregistré sur cet appareil ; ce que vous envoyez va dans votre espace Notion. « Se déconnecter de Notion » efface le lien et demande au serveur d'oublier la clé ; dans Notion : Paramètres → Connexions → MindView.</p>
      <p><b>Paiement</b> : ${cloudReady() && !cloudMock() ? 'il passe par Stripe, un prestataire spécialisé : votre numéro de carte est saisi chez Stripe et ne transite jamais par l\'application ni par le serveur de MindView.' : 'en ce moment, l\'abonnement fonctionne en mode test et aucune donnée bancaire n\'est demandée. Au lancement, le paiement passera par un prestataire spécialisé (Stripe) : votre numéro de carte ne transitera jamais par l\'application.'}</p>
      <p><b>Notifications</b> : elles sont calculées sur l'appareil, sans serveur d'envoi.</p>`)}
    ${sec('securite', 'Sécurité', `<p>Le code de verrouillage est enregistré sous forme d'empreinte irréversible (SHA-256). Les données elles-mêmes ne sont pas chiffrées sur l'appareil : protégez-le par un code, et rangez vos fichiers de sauvegarde en lieu sûr, car ils contiennent tout votre compte.</p>`)}
    ${sec('compte', 'Si vous créez un compte en ligne', `<p>Le compte sert à vous connecter, à retrouver vos données sur vos autres appareils et à gérer l'abonnement. Il est hébergé dans l'Union européenne (Supabase, centre de données de Francfort) et enregistre :</p>
      <ul><li>votre adresse e-mail, et votre mot de passe sous forme d'empreinte irréversible (personne ne peut le relire) ;</li>
      <li>le contenu de MindView (tâches, notes, projets, tableaux blancs, études, réglages), pour la synchronisation entre vos appareils ;</li>
      <li>l'état de votre abonnement (formule, échéance) ;</li>
      <li>si vous ne l'avez pas refusé, deux mesures d'usage (« application ouverte ce jour-là » et « première prise en main »), jamais le contenu.</li></ul>
      <p>Ce contenu ne part qu'une fois le compte créé, ce qui est expliqué au moment de le créer. Il circule chiffré (HTTPS) et il est chiffré sur les disques du serveur. Chaque accès est contrôlé par les règles de la base de données : personne ne peut lire les données d'un autre compte. La connexion avec Google (si vous la choisissez) transmet à MindView votre nom et votre adresse e-mail, rien d'autre.</p>
      <p>« Se déconnecter » retire vos données de l'appareil (elles restent dans votre compte). « Supprimer mon compte » arrête l'abonnement immédiatement et efface du serveur le compte et tout son contenu. Le paiement est traité par Stripe, qui conserve les factures comme l'exige la loi. Les mesures se coupent dans Compte.</p>
      <p>MindView s'adresse aussi aux élèves : avant 13 ans, le compte doit être créé avec l'accord d'un parent.</p>`)}
    <section class="card article priv-todo rise" id="responsable"><h2>Responsable du traitement</h2>
      <p><span class="chip t-sand">À compléter avant le lancement</span></p>
      <p>M&amp;S Design — dénomination légale, adresse, numéro d'entreprise et adresse e-mail de contact pour les questions de confidentialité.</p>
    </section>`;
  return { title: 'Confidentialité', tab: 'plus', html };
}
