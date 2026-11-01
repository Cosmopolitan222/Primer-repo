/* Textos fijos que aparecen dentro de los vídeos e imágenes (no de la interfaz). */
(function (KI) {
  'use strict';
  KI.LANGS = {
    es: {
      code: 'es',
      forSale: 'EN VENTA',
      forRent: 'EN ALQUILER',
      perMonth: '/mes',
      room1: 'habitación', rooms: 'habitaciones',
      bath1: 'baño', baths: 'baños',
      cta: '¿Te interesa? Pide tu visita',
      call: 'Llámanos',
      callOrWhatsapp: 'Llamada o WhatsApp',
      swipe: 'Desliza',
      sample: 'MUESTRA',
      postIntro: (d) => (d.op === 'alquiler' ? 'En alquiler' : 'En venta'),
      postCta: 'Pide información o tu visita',
      tagsBase: ['inmobiliaria', 'pisos', 'casas', 'vivienda'],
      tagsOp: (op) => (op === 'alquiler' ? ['alquiler', 'pisoenalquiler'] : ['venta', 'pisoenventa', 'casaenventa']),
    },
    en: {
      code: 'en',
      forSale: 'FOR SALE',
      forRent: 'FOR RENT',
      perMonth: '/month',
      room1: 'bedroom', rooms: 'bedrooms',
      bath1: 'bathroom', baths: 'bathrooms',
      cta: 'Interested? Book your viewing',
      call: 'Call us',
      callOrWhatsapp: 'Call or WhatsApp',
      swipe: 'Swipe',
      sample: 'SAMPLE',
      postIntro: (d) => (d.op === 'alquiler' ? 'For rent' : 'For sale'),
      postCta: 'Ask for details or book a viewing',
      tagsBase: ['realestate', 'spainproperty', 'propertyforsale', 'home'],
      tagsOp: (op) => (op === 'alquiler' ? ['forrent', 'rentals'] : ['forsale', 'househunting']),
    },
  };

  const slugTag = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();

  /** Texto para la publicación (Instagram / Facebook / idealista). */
  KI.buildCaption = function (d, agency, L) {
    const lines = [];
    const price = KI.priceText(d, L);
    const head = [L.postIntro(d), d.title].filter(Boolean).join(': ');
    if (head) lines.push(head);
    if (d.location) lines.push('📍 ' + d.location);
    if (price) lines.push('💶 ' + price);
    const chips = KI.featureChips(d, L);
    if (chips.length) lines.push('🏠 ' + chips.join(' · '));
    (d.highlights || []).filter(Boolean).forEach((h) => lines.push('✔️ ' + h));
    lines.push('');
    const contact = agency.whatsapp || agency.phone;
    lines.push('📲 ' + L.postCta + (contact ? ': ' + contact : ''));
    if (agency.web) lines.push('🌐 ' + agency.web);
    if (d.ref) lines.push('Ref. ' + d.ref);
    lines.push('');
    const city = (d.location || '').split(',').map((s) => s.trim()).filter(Boolean);
    const tags = new Set();
    city.slice(-2).forEach((c) => { const t = slugTag(c); if (t) { tags.add(t); tags.add(L.code === 'en' ? t + 'property' : 'pisos' + t); } });
    L.tagsOp(d.op).forEach((t) => tags.add(t));
    L.tagsBase.forEach((t) => tags.add(t));
    const ag = slugTag(agency.name); if (ag) tags.add(ag);
    lines.push([...tags].slice(0, 12).map((t) => '#' + t).join(' '));
    return lines.join('\n');
  };
})(window.KI = window.KI || {});
