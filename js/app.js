/* Chant de Cigale — le carnet. Routeur, pages du livre, tourne-page. */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = t => String(t || '').split(/\n{2,}/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '#';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSingle = () => matchMedia('(max-width:900px)').matches;

  /* ───────── Structure du livre ───────── */
  const CHAPTERS = [
    { id: 'accueil', label: 'Accueil', num: 'Prologue', subs: [{ id: 'accueil', label: 'Prologue' }] },
    { id: 'elle', label: 'Elle', num: 'I', subs: [{ id: 'personnalite', label: 'Personnalité' }, { id: 'physique', label: 'Physique' }, { id: 'carnet', label: 'Carnet de santé' }] },
    { id: 'histoire', label: 'Histoire', num: 'II', subs: [{ id: 'son-histoire', label: 'Son histoire' }, { id: 'fils-rp', label: 'Fils role-play' }] },
    { id: 'relations', label: 'Relations', num: 'III', subs: [{ id: 'famille', label: 'Famille' }, { id: 'mentorat', label: 'Mentorat' }, { id: 'toutes', label: 'Relations' }] },
    { id: 'galerie', label: 'Galerie', num: 'IV', subs: [{ id: 'galerie', label: 'Galerie' }] },
    { id: 'guerisseuse', label: 'Guérisseuse', num: 'V', subs: [{ id: 'guerisseuse', label: 'Son rang' }] }
  ];
  const PAGES = [];
  CHAPTERS.forEach((ch, ci) => ch.subs.forEach((s, si) => PAGES.push({ ch, ci, sub: s, si, key: s.id, hash: '#/' + ch.id + (ch.subs.length > 1 ? '/' + s.id : '') })));

  const NOTES = {
    accueil: '13 lunes, une tanière, beaucoup de choses à ranger.',
    personnalite: 'Tête haute, regard droit.',
    physique: '27,5 cm de pure détermination.',
    carnet: 'À surveiller : le froid, l\'eau profonde, les nuages gris.',
    'son-histoire': 'Le Grand Blanc n\'a pas tout pris.',
    'fils-rp': 'Les histoires se vivent à plusieurs.',
    famille: 'On ne choisit pas ses adelphes.',
    mentorat: 'Scarabée dirait que je range mal.',
    toutes: 'Plus le fil est court, plus on s\'aime.',
    galerie: 'Des souvenirs pressés entre les pages.',
    guerisseuse: 'Matin et soir, tout à sa place.'
  };
  const PLATES = { // zoom dans l'illustration (taille, position)
    accueil: ['190%', '50% 50%', 'Chant de Cigale'],
    personnalite: ['390%', '50% 65%', 'Le regard'],
    physique: ['190%', '50% 50%', 'D\'après nature'],
    carnet: ['330%', '28% 4%', 'L\'écoute'],
    'son-histoire': null, 'fils-rp': null
  };
  const BOND = { '-2': 'Hostile', '-1': 'Tendue', '0': 'Distante', '1': 'Amicale', '2': 'Très proche' };
  const STATUS = { vivant: 'Vivant·e', mort: '† Mort·e', collectif: 'Collectif', inconnu: 'Inconnu·e' };
  const CAT = { family: 'Famille', mentor: 'Mentorat', clan: 'Clan du Vent', other: 'Hors du clan' };

  let D = null; // données

  /* ───────── Illustrations en SVG ───────── */
  const veins = '<path class="vn" d="M110 160 40 20M110 160 70 14M110 160 100 12M110 160 20 60M110 160 12 100M110 160 128 40"/>';
  function wings(cls = '') {
    const w = `<path class="wm" d="M110 160C70 152 20 112 8 42 4 20 22 8 42 14c40 14 66 60 68 146z"/>${veins}`;
    return `<svg class="wings ${cls}" viewBox="0 0 220 170" aria-hidden="true">
      <g><g class="wing wl">${w}</g></g>
      <g transform="translate(220 0) scale(-1 1)"><g class="wing wr">${w}</g></g></svg>`;
  }
  function lavender(n = 12, h = 230) {
    let b = `<path class="stem" d="M50 ${h} C48 ${h * .6} 52 ${h * .3} 50 14"/><path class="leafx" d="M50 ${h - 8} C34 ${h - 40} 30 ${h - 70} 32 ${h - 100} M50 ${h - 8} C66 ${h - 44} 70 ${h - 76} 68 ${h - 104}"/>`;
    for (let i = 0; i < n; i++) {
      const y = 12 + i * 9, s = i % 2 ? 1 : -1, x = 50 + s * 5.5;
      b += `<ellipse class="bud" cx="${x}" cy="${y + 4}" rx="4.2" ry="7.2" transform="rotate(${s * 24} ${x} ${y + 4})"/>`;
    }
    b += '<ellipse class="bud" cx="50" cy="8" rx="3.6" ry="7"/>';
    return `<svg class="sprig" viewBox="0 0 100 ${h}" aria-hidden="true">${b}</svg>`;
  }
  function bunch(k = 5) {
    return Array.from({ length: k }, (_, i) => `<span style="--a:${-26 + i * (52 / (k - 1))}deg;--d:${i * -.7}s;--s:${.85 + ((i * 37) % 30) / 100}">${lavender()}</span>`).join('');
  }
  function moor() {
    return `<svg viewBox="0 0 400 400" class="moor" aria-hidden="true">
      <circle class="moon-halo" cx="290" cy="110" r="64"/><circle class="moon" cx="290" cy="110" r="38"/>
      <g class="stars">${Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 97) % 380 + 10}" cy="${(i * 53) % 180 + 12}" r="${(i % 3) * .6 + .8}"/>`).join('')}</g>
      <path class="h3" d="M0 270C60 230 120 250 190 232 260 214 330 244 400 226V400H0z"/>
      <path class="h2" d="M0 310C80 270 150 300 230 280 300 262 350 290 400 276V400H0z"/>
      <path class="h1" d="M0 350C90 322 170 346 250 330 320 316 370 336 400 328V400H0z"/>
      <g class="tufts">${Array.from({ length: 16 }, (_, i) => { const x = 14 + i * 24.5, y = 338 + (i * 13) % 30; return `<path d="M${x} ${y}l-2-9M${x} ${y}l1-11M${x} ${y}l4-8"/>`; }).join('')}</g></svg>`;
  }
  function portrait(zoom, pos) {
    return `<div class="portrait" style="--z:${zoom};--p:${pos}" role="img" aria-label="Portrait de Chant de Cigale"></div>`;
  }
  function constellation(rels) {
    const n = rels.length, cxs = 220, cys = 200;
    const nodes = rels.map((r, i) => {
      const a = (-90 + i * 360 / Math.max(n, 1)) * Math.PI / 180, rad = 150 - (Number(r.bond) + 2) * 14;
      const x = cxs + Math.cos(a) * rad, y = cys + Math.sin(a) * rad * .9, b = Number(r.bond);
      const col = b > 0 ? 'var(--leaf)' : b < 0 ? 'var(--thorn)' : 'var(--taupe)';
      const anchor = x > cxs + 10 ? 'start' : x < cxs - 10 ? 'end' : 'middle';
      const tx = x + (anchor === 'start' ? 11 : anchor === 'end' ? -11 : 0), ty = y + (anchor === 'middle' ? (y < cys ? -12 : 20) : 4);
      return `<g class="cn" style="--i:${i}"><line x1="${cxs}" y1="${cys}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" ${r.status === 'mort' ? 'stroke-dasharray="3 5"' : ''}/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${6 + (b + 2)}" fill="${col}"/>
        <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}">${esc(r.name)}</text></g>`;
    }).join('');
    return `<svg viewBox="-20 0 480 400" class="constel" aria-label="Carte des relations">
      <circle cx="${cxs}" cy="${cys}" r="60" class="ring"/><circle cx="${cxs}" cy="${cys}" r="110" class="ring"/><circle cx="${cxs}" cy="${cys}" r="160" class="ring"/>
      ${nodes}
      <clipPath id="cc"><circle cx="${cxs}" cy="${cys}" r="34"/></clipPath>
      <circle cx="${cxs}" cy="${cys}" r="38" class="core"/>
      <image href="assets/cigale.webp" x="${cxs - 76}" y="${cys - 46}" width="152" height="91" clip-path="url(#cc)" preserveAspectRatio="xMidYMid slice"/></svg>`;
  }

  /* ───────── Briques de contenu ───────── */
  const facts = list => `<dl class="facts">${(list || []).map(f => `<div class="rv"><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`;
  const notes = items => `<div class="notes">${(items || []).map((n, i) =>
    `<article class="note rv" style="--r:${(i % 2 ? 1 : -1) * (.25 + (i % 3) * .18)}deg"><h3>${esc(n.title)}</h3>${paras(n.text)}</article>`).join('')}</div>`;
  const groups = list => (list || []).map(g =>
    `<section class="group tone-${esc(g.tone || 'neutral')}"><h2 class="rv"><span>${esc(g.title)}</span></h2>${notes(g.items)}</section>`).join('');
  const empty = t => `<p class="empty rv">${esc(t)}</p>`;

  function relCard(r) {
    const b = Math.max(-2, Math.min(2, Number(r.bond) || 0));
    const ava = r.image_url ? `<img src="${esc(r.image_url)}" alt="" loading="lazy">` : `<span>${esc((r.name || '?').replace(/^(Petite?|Grande?|Étoile|Chant|Cri|Envol|Éclat|Plumage|Harmonie|Clan)\s+(d[eu]s?\s+|de l['’]|d['’])?/i, '').charAt(0).toUpperCase() || '?')}</span>`;
    return `<article class="rel rv" data-cat="${esc(r.category)}" data-bond="${b}" data-status="${esc(r.status)}">
      <div class="rel-ava">${ava}</div>
      <div class="rel-main">
        <h3>${esc(r.name)}</h3>
        <div class="rel-role">${esc(r.role)}${r.kind ? ' · ' + (r.kind === 'joueur' ? 'Joueur' : 'PNJ') : ''} · <span class="st st-${esc(r.status)}">${esc(STATUS[r.status] || r.status)}</span></div>
        <p>${esc(r.summary)}</p>
        ${r.details ? `<details><summary>Lire la suite</summary>${paras(r.details)}</details>` : ''}
        <div class="bond b${b + 2}" title="Affinité : ${BOND[b]}"><span class="bond-track"><i style="left:${(b + 2) * 25}%"></i></span><span class="bond-label">${BOND[b]}</span></div>
      </div></article>`;
  }
  const relList = cat => D.relations.filter(r => !cat || (Array.isArray(cat) ? cat.includes(r.category) : r.category === cat));

  /* ───────── Pages (contenu de droite) ───────── */
  const C = k => D.content[k] || {};
  const RIGHT = {
    accueil() {
      const h = C('home'), id = C('identity');
      return `<div class="hero rv">${portrait('190%', '50% 50%').replace('class="portrait"', 'class="portrait mobile-only"')}${wings('hero-wings')}<h1 class="big"><span class="ink">Chant de Cigale</span></h1><p class="tagline">${esc(h.tagline)}</p></div>
        <blockquote class="epigraph rv">${esc(h.quote)}</blockquote>
        <div class="intro rv">${paras(h.intro)}</div>
        <h2 class="rv"><span>Fiche d'identité</span></h2>${facts(id.fields)}
        <h2 class="rv"><span>Les noms d'une vie</span></h2>
        <ol class="names">${(id.names || []).map(n => `<li class="rv"><b>${esc(n.stage)}</b><span class="nm">${esc(n.name)}</span>${n.note ? `<small>${esc(n.note)}</small>` : ''}</li>`).join('')}</ol>
        ${id.credits ? `<p class="credits rv">${esc(id.credits)}</p>` : ''}`;
    },
    personnalite() { const p = C('personality'); return `<div class="lead rv">${paras(p.summary)}</div>${groups(p.groups)}`; },
    physique() { const p = C('physique'); return `<div class="lead rv">${paras(p.summary)}</div>${facts(p.facts)}${groups(p.groups)}`; },
    carnet() {
      const h = C('health'), pips = Array.from({ length: h.pa_max || h.pa || 0 }, (_, i) => `<i class="${i < h.pa ? 'on' : ''}"></i>`).join('');
      const pct = Math.max(0, Math.min(100, (h.pv / (h.pv_max || h.pv || 1)) * 100));
      return `<div class="chart rv"><div class="chart-head"><b>Patiente</b> Chant de Cigale · femelle · 13 lunes · 3 kg</div>
        <div class="gauges"><div class="gauge"><span>PV</span><div class="bar"><i style="width:${pct}%"></i></div><em>${esc(h.pv)} / ${esc(h.pv_max)}</em></div>
        <div class="gauge"><span>PA</span><div class="pips">${pips}</div><em>${esc(h.pa)} / ${esc(h.pa_max)}</em></div></div></div>
        ${facts(h.facts)}${groups(h.groups)}`;
    },
    'son-histoire'() {
      const s = C('story');
      return (s.chapters || []).map((c, i) => `<section class="chapter rv"><div class="cn-num">${i + 1}</div><h2><span>${esc(c.title)}</span></h2><div class="dropcap">${paras(c.text)}</div></section>`).join('') +
        `<h2 class="rv sep"><span>${esc(s.convictions_title || 'Convictions')}</span></h2>${notes(s.convictions)}`;
    },
    'fils-rp'() {
      const r = C('rp'), t = r.threads || [];
      return `<div class="lead rv">${paras(r.intro)}</div>` + (t.length ? `<ul class="threads">${t.map(x =>
        `<li class="rv"><div><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p></div><a class="btn" href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">Ouvrir sur Discord ↗</a></li>`).join('')}</ul>`
        : empty('Aucun fil pour le moment. Les pages restent à écrire…'));
    },
    famille() {
      const l = relList('family');
      return `<div class="lead rv">${paras(C('family').intro)}</div><div class="rels">${l.map(relCard).join('') || empty('Personne ici pour le moment.')}</div>`;
    },
    mentorat() {
      const m = C('mentorship'), l = relList('mentor');
      return `<div class="lead rv">${paras(m.intro)}</div><div class="rels">${l.map(relCard).join('')}</div>${notes(m.paragraphs)}`;
    },
    toutes() {
      const chips = Object.entries({ all: 'Toutes', ...CAT }).map(([k, v]) => `<button class="fchip${k === 'all' ? ' on' : ''}" data-cat="${k}">${v}</button>`).join('');
      const legend = [-2, -1, 0, 1, 2].map(b => `<span class="lg b${b + 2}"><i></i>${BOND[b]}</span>`).join('');
      return `<div class="lead rv"><p>L'index d'affinité mesure le fil qui relie Cigale à chacun, du plus tendu au plus tendre.</p></div>
        <div class="legend rv">${legend}</div><div class="filters rv">${chips}</div>
        <div class="rels" id="rels">${relList().map(relCard).join('') || empty('Aucune relation notée.')}</div>`;
    },
    galerie() {
      const g = D.gallery || [];
      return g.length ? `<div class="gal">${g.map((x, i) => `<figure class="polaroid rv" style="--r:${(i % 2 ? 1 : -1) * (.8 + (i % 3) * .6)}deg" data-i="${i}"><img src="${esc(x.url)}" alt="${esc(x.title)}" loading="lazy"><figcaption>${esc(x.title)}</figcaption></figure>`).join('')}</div>` : empty('La galerie est encore vide.');
    },
    guerisseuse() {
      const h = C('healer');
      return `<div class="lead rv">${paras(h.intro)}</div>${facts(h.facts)}${groups(h.groups)}`;
    }
  };

  /* ───────── Gabarits de page ───────── */
  const roman = i => i * 2 + 1;
  function leftHtml(i) {
    const p = PAGES[i], key = p.key;
    let art;
    if (PLATES[key]) { const [z, pos, cap] = PLATES[key]; art = `<figure class="plate">${portrait(z, pos)}<figcaption>${esc(cap)}</figcaption></figure>`; }
    else if (key === 'son-histoire' || key === 'fils-rp') art = `<figure class="plate scene">${moor()}<figcaption>La lande</figcaption></figure>`;
    else if (['famille', 'mentorat', 'toutes'].includes(key)) {
      const l = key === 'famille' ? relList('family') : key === 'mentorat' ? relList('mentor') : relList();
      art = `<figure class="plate scene">${constellation(l)}<figcaption>Les fils qui la relient</figcaption></figure>`;
    } else art = `<figure class="plate scene herbs"><div class="bunch">${bunch(7)}</div>${wings('plate-wings')}<figcaption>${key === 'galerie' ? 'Souvenirs pressés' : 'Herbier de la tanière'}</figcaption></figure>`;
    return `<div class="lp"><div class="lp-top"><span class="num">${esc(p.ch.num)}</span><span class="lp-ch">${esc(p.ch.label)}</span></div>
      ${art}<p class="hand">${esc(NOTES[key] || '')}</p><div class="folio">— ${roman(i)} —</div></div>`;
  }
  function rightHtml(i) {
    const p = PAGES[i], home = p.key === 'accueil';
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    const head = home ? '' : `<header class="pg-head rv"><span class="eyebrow">${p.ch.num === 'Prologue' ? '' : 'Chapitre ' + esc(p.ch.num) + ' · '}${esc(p.ch.label)}</span><h1><span class="ink">${esc(p.sub.label)}</span></h1><div class="orn" aria-hidden="true"><i></i>${wings('mini')}<i></i></div></header>`;
    return `<div class="rp-scroll">${head}<div class="pg-body">${RIGHT[p.key]()}</div></div>
      <footer class="rp-foot">${prev ? `<a class="turn" href="${prev.hash}" aria-label="Page précédente">‹ ${esc(prev.sub.label)}</a>` : '<span></span>'}<span class="folio">— ${roman(i) + 1} —</span>${next ? `<a class="turn" href="${next.hash}" aria-label="Page suivante">${esc(next.sub.label)} ›</a>` : '<span></span>'}</footer>`;
  }

  /* ───────── Affichage & tourne-page ───────── */
  const pl = $('#pl'), pr = $('#pr'), book = $('#book');
  let cur = -1, busy = false, queued = null;

  function stagger(root, base) {
    root.style.setProperty('--base', base + 'ms');
    root.querySelectorAll('.rv').forEach((n, i) => n.style.setProperty('--i', Math.min(i, 16)));
  }
  const setLeft = h => { pl.innerHTML = h; };
  const setRight = (h, base) => { pr.innerHTML = h; pr.scrollTop = 0; stagger(pr, base); };

  function chrome(i) {
    const p = PAGES[i];
    $('#tabs').innerHTML = CHAPTERS.map((c, ci) => `<a href="#/${c.id}${c.subs.length > 1 ? '/' + c.subs[0].id : ''}" class="${ci === p.ci ? 'on' : ''}" style="--k:${ci}">${esc(c.label)}</a>`).join('');
    $('#ribbons').innerHTML = p.ch.subs.length > 1 ? p.ch.subs.map((s, si) => `<a href="#/${p.ch.id}/${s.id}" class="${si === p.si ? 'on' : ''}">${esc(s.label)}</a>`).join('') : '';
    document.title = (p.key === 'accueil' ? '' : p.sub.label + ' — ') + 'Chant de Cigale';
  }

  function go(i, animate = true) {
    if (busy) { queued = i; return; }
    if (i === cur) return;
    const lh = leftHtml(i), rh = rightHtml(i), fwd = i > cur;
    const prevRight = pr.innerHTML, prevLeft = pl.innerHTML;
    const first = cur < 0;
    cur = i; chrome(i);
    if (first || !animate || reduced) { setLeft(lh); setRight(rh, 0); return; }
    busy = true;
    const single = isSingle(), useFwd = fwd || single;
    const face = (side, html, cls) => { const f = document.createElement('div'); f.className = `face page page-${side} ${cls}`; f.innerHTML = html; return f; };
    const leaf = document.createElement('div');
    leaf.className = 'leaf ' + (useFwd ? 'fwd' : 'bwd');
    if (useFwd) {
      leaf.append(face('right', prevRight, 'front'), face('left', single ? '' : lh, 'back'));
      setRight(rh, 520);
      setTimeout(() => setLeft(lh), 480);
    } else {
      leaf.append(face('left', prevLeft, 'front'), face('right', rh, 'back'));
      setLeft(lh);
      setTimeout(() => setRight(rh, 0), 480);
    }
    book.append(leaf);
    setTimeout(() => {
      leaf.remove(); busy = false;
      if (queued !== null) { const q = queued; queued = null; go(q); }
    }, 980);
  }
  function route() {
    const h = location.hash || '#/accueil';
    let i = PAGES.findIndex(p => p.hash === h);
    if (i < 0) { const ch = h.split('/')[1]; i = PAGES.findIndex(p => p.ch.id === ch); }
    go(i < 0 ? 0 : i);
  }

  /* ───────── Interactions ───────── */
  document.addEventListener('click', e => {
    const chip = e.target.closest('.fchip');
    if (chip) {
      document.querySelectorAll('.fchip').forEach(c => c.classList.toggle('on', c === chip));
      document.querySelectorAll('#rels .rel').forEach(r => { r.hidden = chip.dataset.cat !== 'all' && r.dataset.cat !== chip.dataset.cat; });
    }
    const pol = e.target.closest('.polaroid');
    if (pol) {
      const x = D.gallery[pol.dataset.i], lb = $('#lightbox');
      lb.innerHTML = `<figure><img src="${esc(x.url)}" alt="${esc(x.title)}"><figcaption>${esc(x.title)}${x.caption ? ' — ' + esc(x.caption) : ''}</figcaption></figure>`;
      lb.hidden = false;
    }
    if (e.target.closest('.modal') && !e.target.closest('.toc-box, .lightbox figure')) { $('#toc').hidden = true; $('#lightbox').hidden = true; }
    if (e.target.closest('#toc a')) $('#toc').hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { $('#toc').hidden = true; $('#lightbox').hidden = true; return; }
    if (/INPUT|TEXTAREA|SUMMARY/.test(document.activeElement.tagName) || $('#cover')) return;
    if (e.key === 'ArrowRight' && PAGES[cur + 1]) location.hash = PAGES[cur + 1].hash;
    if (e.key === 'ArrowLeft' && PAGES[cur - 1]) location.hash = PAGES[cur - 1].hash;
  });
  $('#btn-toc').onclick = () => {
    $('#toc').innerHTML = `<div class="toc-box"><h2>Sommaire</h2>${CHAPTERS.map(c => `<div class="toc-ch"><b>${esc(c.num)}</b><div><a class="toc-h" href="#/${c.id}${c.subs.length > 1 ? '/' + c.subs[0].id : ''}">${esc(c.label)}</a>${c.subs.length > 1 ? c.subs.map(s => `<a href="#/${c.id}/${s.id}">${esc(s.label)}</a>`).join('') : ''}</div></div>`).join('')}</div>`;
    $('#toc').hidden = false;
  };
  function season(s) {
    document.documentElement.dataset.season = s;
    $('#btn-season').textContent = s === 'snow' ? '❄' : '☀';
    try { localStorage.setItem('cigale-season', s); } catch (e) { }
    window.fxReseed && fxReseed();
  }
  $('#btn-season').onclick = () => season(document.documentElement.dataset.season === 'snow' ? 'sun' : 'snow');
  try { const s = localStorage.getItem('cigale-season'); if (s) season(s); } catch (e) { }

  /* ───────── Couverture ───────── */
  $('.lav-l').innerHTML = bunch(6); $('.lav-r').innerHTML = bunch(6);
  $('#cover-emblem').innerHTML = wings('cover-wings');
  const cover = $('#cover');
  const openCover = () => {
    try { sessionStorage.setItem('cigale-open', '1'); } catch (e) { }
    cover.classList.add('open');
    setTimeout(() => cover.remove(), 1700);
  };
  let seen = false; try { seen = sessionStorage.getItem('cigale-open'); } catch (e) { }
  if (seen) cover.remove(); else cover.addEventListener('click', openCover);

  /* ───────── Démarrage ───────── */
  loadData().then(d => {
    D = d;
    addEventListener('hashchange', route);
    route();
    document.body.classList.add('ready');
  });
})();
