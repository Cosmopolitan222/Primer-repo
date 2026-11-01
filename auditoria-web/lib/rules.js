// Conocimiento estático: rastreadores, plataformas de consentimiento (CMP) y patrones de texto.

// Cookies que NO son técnicas/necesarias y que la Guía de cookies de la AEPD exige
// que no se instalen antes del consentimiento.
const TRACKING_COOKIES = [
  { re: /^_ga($|_)/, who: 'Google Analytics' },
  { re: /^_gid$/, who: 'Google Analytics' },
  { re: /^_gat/, who: 'Google Analytics' },
  { re: /^_gcl_/, who: 'Google Ads' },
  { re: /^(IDE|DSID|test_cookie|__gads|__gpi)$/, who: 'Google Ads / DoubleClick' },
  { re: /^_fbp$|^_fbc$|^fr$/, who: 'Meta (Facebook) Pixel' },
  { re: /^_ttp$|^_tt_enable_cookie$|^ttcsid/, who: 'TikTok Pixel' },
  { re: /^_hj/, who: 'Hotjar' },
  { re: /^_clck$|^_clsk$|^MUID$|^CLID$/, who: 'Microsoft Clarity' },
  { re: /^_uet(sid|vid)$/, who: 'Microsoft Ads (Bing)' },
  { re: /^_pin_unauth$|^_pinterest_/, who: 'Pinterest' },
  { re: /^li_|^bcookie$|^lidc$|^UserMatchHistory$/, who: 'LinkedIn' },
  { re: /^__hstc$|^hubspotutk$|^__hssc$/, who: 'HubSpot' },
  { re: /^_scid|^_sctr$/, who: 'Snapchat' },
  { re: /^_shopify_(y|s|sa_t|sa_p)$|^_orig_referrer$|^_landing_page$/, who: 'Shopify Analytics' },
  { re: /^__kla_id$/, who: 'Klaviyo' },
  { re: /^_mkto_trk$/, who: 'Marketo' },
  { re: /^_omappvp|^_omappvs/, who: 'OptinMonster' },
];

// Peticiones a terceros de analítica/publicidad. Si salen antes del consentimiento,
// ya se están enviando datos personales (IP, identificadores) sin base legal.
const TRACKING_HOSTS = [
  { re: /(^|\.)google-analytics\.com$/, who: 'Google Analytics' },
  { re: /(^|\.)analytics\.google\.com$/, who: 'Google Analytics' },
  { re: /(^|\.)googletagmanager\.com$/, who: 'Google Tag Manager', soft: true },
  { re: /(^|\.)doubleclick\.net$/, who: 'Google Ads / DoubleClick' },
  { re: /(^|\.)googleadservices\.com$/, who: 'Google Ads' },
  { re: /(^|\.)googlesyndication\.com$/, who: 'Google AdSense' },
  { re: /(^|\.)connect\.facebook\.net$/, who: 'Meta (Facebook) Pixel' },
  { re: /(^|\.)facebook\.com$/, who: 'Meta (Facebook)', path: /^\/tr/ },
  { re: /(^|\.)analytics\.tiktok\.com$/, who: 'TikTok Pixel' },
  { re: /(^|\.)hotjar\.(com|io)$/, who: 'Hotjar' },
  { re: /(^|\.)clarity\.ms$/, who: 'Microsoft Clarity' },
  { re: /(^|\.)bat\.bing\.com$/, who: 'Microsoft Ads (Bing)' },
  { re: /(^|\.)ct\.pinterest\.com$|(^|\.)s\.pinimg\.com$/, who: 'Pinterest' },
  { re: /(^|\.)snap\.licdn\.com$|(^|\.)px\.ads\.linkedin\.com$/, who: 'LinkedIn Insight' },
  { re: /(^|\.)sc-static\.net$|(^|\.)tr\.snapchat\.com$/, who: 'Snapchat' },
  { re: /(^|\.)static\.klaviyo\.com$/, who: 'Klaviyo' },
  { re: /(^|\.)js\.hs-scripts\.com$|(^|\.)js\.hs-analytics\.net$/, who: 'HubSpot' },
  { re: /(^|\.)criteo\.(com|net)$/, who: 'Criteo' },
  { re: /(^|\.)taboola\.com$/, who: 'Taboola' },
  { re: /(^|\.)yandex\.(ru|com)$|(^|\.)mc\.yandex\./, who: 'Yandex Metrica' },
];

// Recursos que transfieren la IP del visitante a terceros sin ser rastreadores puros.
// No son una infracción de cookies, pero sí un punto de mejora en RGPD.
const IP_LEAK_HOSTS = [
  { re: /(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$/, who: 'Google Fonts (carga externa)' },
  { re: /(^|\.)youtube\.com$|(^|\.)ytimg\.com$/, who: 'YouTube incrustado sin modo de privacidad' },
  { re: /(^|\.)maps\.googleapis\.com$/, who: 'Google Maps' },
];

// Plataformas de gestión del consentimiento (CMP) conocidas.
const CMP_SELECTORS = [
  { sel: '#CybotCookiebotDialog', name: 'Cookiebot' },
  { sel: '#onetrust-banner-sdk, #onetrust-consent-sdk', name: 'OneTrust' },
  { sel: '.cmplz-cookiebanner, #cmplz-cookiebanner-container', name: 'Complianz' },
  { sel: '.cky-consent-container, #cookie-law-info-bar', name: 'CookieYes' },
  { sel: '#iubenda-cs-banner', name: 'iubenda' },
  { sel: '#usercentrics-root, #usercentrics-cmp-ui', name: 'Usercentrics' },
  { sel: '#didomi-host', name: 'Didomi' },
  { sel: '#shopify-pc__banner, .shopify-pc__banner__dialog', name: 'Shopify (banner nativo)' },
  { sel: '#axeptio_overlay', name: 'Axeptio' },
  { sel: '#moove_gdpr_cookie_info_bar', name: 'GDPR Cookie Compliance' },
  { sel: '#cookie-notice', name: 'Cookie Notice' },
  { sel: '#lgcookieslaw_banner, .lgcookieslaw-banner', name: 'LGCookiesLaw (PrestaShop)' },
  { sel: '#qc-cmp2-container', name: 'Quantcast Choice' },
  { sel: '.termly-styles-root, #termly-code-snippet-support', name: 'Termly' },
  { sel: '#borlabs-cookie, #BorlabsCookieBox', name: 'Borlabs Cookie' },
  { sel: '.cc-window, #cc-main, .cc_banner', name: 'Cookie Consent (Osano/orestbida)' },
];

const ACCEPT_RE = /^\s*(aceptar( todas?| todo| cookies)?|acepto|accept( all)?|allow( all)?|permitir( todas?)?|de acuerdo|entendido|ok|vale|consentir|accept all cookies|aceptar y cerrar|acceptar|onartu)\s*$/i;
const REJECT_RE = /(rechaz|deneg|no acept|reject|decline|deny|solo (las )?(necesarias|t[eé]cnicas|esenciales)|only necessary|necessary only|continuar sin aceptar|refuse|rebutjar|ukatu)/i;
const SETTINGS_RE = /(configur|personaliz|preferencias|ajustes|settings|customi[sz]e|manage|gestionar|m[aá]s opciones)/i;

const LEGAL_LINKS = {
  avisoLegal: /(aviso[\s-]*legal|legal[\s-]*notice|nota[\s-]*legal|informaci[oó]n[\s-]*legal|avis[\s-]*legal|imprint|lege[\s-]*oharra)/i,
  privacidad: /(privacidad|privacy|protecci[oó]n[\s-]*de[\s-]*datos|privacitat|pribatutas)/i,
  cookies: /(cookie)/i,
  condiciones: /(condiciones|t[eé]rminos|terms|condicions|devoluci|env[ií]os?\b|refund|shipping)/i,
};

// NIF/CIF/NIE españoles (formato, sin validar dígito de control)
const NIF_RE = /\b([ABCDEFGHJKLMNPQRSUVW][-\s]?\d{7}[-\s]?[0-9A-J]|\d{8}[-\s]?[A-Z]|[XYZ][-\s]?\d{7}[-\s]?[A-Z])\b/;

module.exports = {
  TRACKING_COOKIES, TRACKING_HOSTS, IP_LEAK_HOSTS, CMP_SELECTORS,
  ACCEPT_RE, REJECT_RE, SETTINGS_RE, LEGAL_LINKS, NIF_RE,
};
