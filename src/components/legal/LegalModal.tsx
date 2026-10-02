import React from 'react';
import { X, Shield, FileText, Cookie, Receipt } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface LegalModalProps {
  type: 'privacy' | 'terms' | 'cookies' | 'refund' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const { t, interfaceLanguage } = useTranslation();

  if (!type) return null;

  const contentMapFr = {
    privacy: {
      title: t('footer.privacy', 'Politique de Confidentialité'),
      icon: Shield,
      updated: 'Septembre 2026',
      body: `
### 1. Introduction
Book Pilot (« nous », « notre » ou « nos ») s'engage fermement à protéger vos données personnelles et vos créations d'auteur. Cette politique décrit comment vos informations sont recueillies, utilisées et protégées au sein de notre Studio d'E-books IA.

### 2. Données Collectées
* **Informations de Compte :** Nom, adresse e-mail, hachage de mot de passe et préférences renseignées lors de votre inscription.
* **Données de Contenu :** Idées, prompts de livres, manuscrits des chapitres, plans éditoriaux et configurations de couverture.
* **Télémétrie & Performance :** Informations techniques anonymisées pour optimiser la rapidité et la fiabilité de génération.

### 3. Modèles d'IA & Propriété Intellectuelle
* **Aucun entraînement sur vos manuscrits :** Vos textes privés et vos livres ne sont jamais utilisés pour entraîner des modèles publics d'IA sans votre accord explicite.
* **Propriété Commerciale :** Vous conservez l'intégralité des droits d'auteur et des droits commerciaux sur tous vos manuscrits créés avec un compte actif.

### 4. Sécurité des Données
Toutes les communications bénéficient du chiffrement TLS 1.3. Les manuscrits et projets sont chiffrés au repos selon les standards industriels AES-256.

### 5. Vos Droits (RGPD)
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'exportation intégrale et de suppression définitive de vos données et projets à tout moment via les paramètres du compte.
      `
    },
    terms: {
      title: t('footer.terms', 'Conditions d\'Utilisation'),
      icon: FileText,
      updated: 'Septembre 2026',
      body: `
### 1. Acceptation des Conditions
En créant un compte ou en utilisant Book Pilot, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation.

### 2. Obligations de l'Utilisateur
* Vous vous engagez à ne pas générer de contenu diffamatoire, violent, illégal ou portant atteinte aux droits de tiers.
* Vous êtes responsable de la sécurité de vos identifiants et de votre espace de création.

### 3. Abonnements & Facturation
* Les abonnements sont facturés d'avance mensuellement ou annuellement.
* Vous pouvez résilier votre renouvellement à tout moment depuis le tableau de bord de facturation.
* Les crédits mensuels de génération d'IA se réinitialisent au début de chaque cycle de facturation.

### 4. Droits Commerciaux & Licences
* **Formule Gratuite :** Les résultats sont fournis à des fins d'évaluation personnelle.
* **Formules Creator & Pro :** Vous bénéficiez des droits pleins et exclusifs de publication commerciale, vente, impression et distribution sur tous les formats exportés (PDF, EPUB, DOCX, Markdown).
      `
    },
    cookies: {
      title: t('footer.cookies', 'Gestion des Cookies'),
      icon: Cookie,
      updated: 'Septembre 2026',
      body: `
### 1. Qu'est-ce qu'un Cookie ?
Les cookies sont de petits fichiers texte sauvegardés sur votre appareil pour mémoriser votre session, vos préférences et sécuriser votre navigation.

### 2. Cookies Utilisés
* **Cookies Essentiels :** Indispensables à l'authentification et au maintien sécurisé de votre session d'écriture.
* **Cookies de Préférences :** Sauvegarde de votre langue préférée et de vos paramètres d'affichage.
* **Cookies Analytiques :** Métriques anonymisées pour garantir des performances optimales de génération.
      `
    },
    refund: {
      title: t('footer.refund', 'Politique de Remboursement'),
      icon: Receipt,
      updated: 'Septembre 2026',
      body: `
### 1. Garantie Sérénité 14 Jours
Nous souhaitons que vous exploriez la puissance de Book Pilot en toute confiance. Si vous souscrivez à un forfait payant et constatez dans les 14 jours qu'il ne répond pas à vos attentes, vous pouvez solliciter un remboursement intégral.

### 2. Modalités
* La demande doit être formulée dans les 14 jours suivant votre premier achat.
* Envoyez simplement un message à support@bookpilot.ai avec votre identifiant de facture. Le crédit est traité sous 3 à 5 jours ouvrés.
      `
    }
  };

  const contentMapEn = {
    privacy: {
      title: t('footer.privacy', 'Privacy Policy'),
      icon: Shield,
      updated: 'September 2026',
      body: `
### 1. Introduction
Book Pilot ("we", "our", or "us") is dedicated to safeguarding your personal data and creative assets. This Privacy Policy outlines how your information is gathered, managed, and safeguarded when using our AI Ebook Studio.

### 2. Information We Collect
* **Account Information:** Name, email address, password hash, and avatar metadata provided during sign-up.
* **Content Data:** Book prompts, chapter manuscripts, outlines, and cover configuration choices inputted by the user.
* **Telemetry & Analytics:** Anonymized browser information, session lengths, and generation performance metrics to optimize stability.

### 3. Usage of AI Models & Creative IP
* **No Training on Private Manuscripts:** Your authored drafts and generated books are not utilized to train public foundation models without your explicit opt-in consent.
* **Commercial Ownership:** You maintain full commercial copyright and ownership rights to manuscripts created under paid subscription tiers.

### 4. Data Security
All communications between your browser and Book Pilot servers use TLS 1.3 encryption. Manuscripts are encrypted at rest with industry-standard AES-256 protocols.

### 5. Your Rights
Under GDPR and CCPA guidelines, you have the right to inspect, export, or permanently erase your user profile and all associated book projects at any time via Account Settings.
      `
    },
    terms: {
      title: t('footer.terms', 'Terms of Service'),
      icon: FileText,
      updated: 'September 2026',
      body: `
### 1. Agreement to Terms
By registering, accessing, or using the Book Pilot platform, you enter into a legally binding agreement to abide by these Terms of Service.

### 2. User Obligations & Conduct
* You agree not to generate defamatory, violent, illegal, or infringing content.
* You are responsible for safeguarding your login credentials and maintaining the confidentiality of your workspace.

### 3. Subscription Plans & Billing
* Subscriptions are billed in advance on either a monthly or annual cadence.
* You may cancel your subscription renewal at any moment directly from the Billing Dashboard.
* Quotas (such as monthly AI generation credits) reset at the onset of each billing cycle and do not roll over unless explicitly noted.

### 4. Intellectual Property & Commercial License
* **Free Plan:** Output is provided for personal testing and evaluation. May contain Book Pilot attribution.
* **Creator & Pro Plans:** You obtain full commercial distribution, monetization, printing, and resale rights over generated manuscripts, covers, and exports.

### 5. Limitation of Liability
Book Pilot provides creative synthesis tools on an "as-is" and "as-available" basis. In no event shall Book Pilot be liable for indirect, incidental, or consequential damages resulting from platform downtime or AI-generated factual discrepancies.
      `
    },
    cookies: {
      title: t('footer.cookies', 'Cookie Policy'),
      icon: Cookie,
      updated: 'September 2026',
      body: `
### 1. What Are Cookies?
Cookies are compact data files deposited onto your computer or mobile device when you browse websites. They are critical to maintaining your authentication state and preferences.

### 2. Types of Cookies We Utilize
* **Essential Cookies:** Indispensable for authentication, account security, and session management.
* **Preference Cookies:** Remember your interface preferences, such as Dark Theme mode and default book generation language.
* **Performance Cookies:** Anonymized crash logs and latency measurements to ensure fast generation times.

### 3. Managing Cookie Preferences
You can modify or disable cookies at any time through your browser settings. Note that disabling essential cookies will prevent authentication into the Book Pilot Studio.
      `
    },
    refund: {
      title: t('footer.refund', 'Refund Policy'),
      icon: Receipt,
      updated: 'September 2026',
      body: `
### 1. 14-Day Satisfaction Guarantee
We want you to experience the creative power of Book Pilot with complete confidence. If you upgrade to a paid plan and determine within 14 days that the studio does not meet your publishing needs, you are eligible for a full refund.

### 2. Refund Eligibility Criteria
* The refund request is transmitted within 14 calendar days of your initial subscription purchase.
* The account has not generated more than 10 complete books during the trial evaluation period.

### 3. How to Request a Refund
Simply navigate to Billing in your dashboard or contact support@bookpilot.ai with your registered email and invoice ID. Refunds are typically credited back to your original payment method within 3–5 business days.
      `
    }
  };

  const contentMap = interfaceLanguage === 'fr' ? contentMapFr : contentMapEn;
  const item = contentMap[type];
  const Icon = item.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {interfaceLanguage === 'fr' ? 'Dernière mise à jour :' : 'Last updated:'} {item.updated}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label={t('common.close', 'Fermer')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
          {item.body
            .trim()
            .split('\n\n')
            .map((block, idx) => {
              if (block.startsWith('### ')) {
                return (
                  <h4 key={idx} className="text-sm font-bold text-white mt-4 first:mt-0">
                    {block.replace('### ', '')}
                  </h4>
                );
              }
              if (block.startsWith('* ')) {
                const listItems = block.split('\n* ');
                return (
                  <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-purple-400">
                    {listItems.map((li, i) => (
                      <li key={i}>{li.replace('* ', '')}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={idx}>{block}</p>;
            })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition"
          >
            {t('common.close', 'Fermer')}
          </button>
        </div>
      </div>
    </div>
  );
};

