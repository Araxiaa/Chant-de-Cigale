/* Tableau de bord : connexion Discord (Supabase Auth) + édition du contenu. */
(() => {
  const { SUPABASE_URL: URL_, SUPABASE_KEY: KEY } = window.CIGALE_CONFIG;
  const $ = s => document.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const gate = $('#gate');
  const imgSrc = u => (!u || /^(https?:|data:|\/)/.test(u)) ? u : '../' + u;

  function toast(msg, err) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 3200);
  }
  function card(html) { gate.innerHTML = `<div class="card">${html}</div>`; gate.hidden = false; $('#app').hidden = true; }

  if (!KEY) {
    card(`<h1>Clé manquante</h1><p>Ouvre <code>js/config.js</code> et colle la clé <b>anon / publishable</b> du projet Supabase dans <code>SUPABASE_KEY</code>
      (Project Settings → API). Puis recharge cette page.</p>`);
    return;
  }
  const sb = supabase.createClient(URL_, KEY);

  /* ───────── Schémas des formulaires ───────── */
  const KV = [{ k: 'label', l: 'Intitulé', t: 'text' }, { k: 'value', l: 'Valeur', t: 'text' }];
  const NOTE = [{ k: 'title', l: 'Titre', t: 'text' }, { k: 'text', l: 'Texte (une ligne vide = nouveau paragraphe)', t: 'area' }];
  const GROUPS = {
    k: 'groups', l: 'Rubriques', t: 'list', title: 'title', blank: { title: 'Nouvelle rubrique', tone: 'neutral', items: [] },
    item: [{ k: 'title', l: 'Titre de la rubrique', t: 'text' },
      { k: 'tone', l: 'Ton (couleur du ruban)', t: 'select', opts: [['good', 'Positif (vert)'], ['bad', 'Négatif (ronce)'], ['neutral', 'Neutre']] },
      { k: 'items', l: 'Fiches', t: 'list', title: 'title', item: NOTE }]
  };
  const SECTIONS = [
    { key: 'home', label: 'Accueil', hint: 'Le prologue du carnet.', fields: [
      { k: 'tagline', l: 'Sous-titre', t: 'text' }, { k: 'quote', l: 'Citation d\'ouverture', t: 'area' }, { k: 'intro', l: 'Introduction', t: 'area' }] },
    { key: 'identity', label: 'Fiche d\'identité & noms', hint: 'Affichés sur la page d\'accueil.', fields: [
      { k: 'credits', l: 'Crédits', t: 'text' },
      { k: 'fields', l: 'Fiche', t: 'list', title: 'label', item: KV },
      { k: 'names', l: 'Les noms d\'une vie', t: 'list', title: 'name', item: [{ k: 'stage', l: 'Étape (Chaton, Apprenti…)', t: 'text' }, { k: 'name', l: 'Nom', t: 'text' }, { k: 'note', l: 'Justification', t: 'area' }] }] },
    { key: 'personality', label: 'Elle · Personnalité', fields: [{ k: 'summary', l: 'Description globale', t: 'area' }, GROUPS] },
    { key: 'physique', label: 'Elle · Physique', fields: [{ k: 'summary', l: 'Description globale', t: 'area' }, { k: 'facts', l: 'Mensurations & traits', t: 'list', title: 'label', item: KV }, GROUPS] },
    { key: 'health', label: 'Elle · Carnet de santé', fields: [
      { k: 'pv', l: 'PV actuels', t: 'number' }, { k: 'pv_max', l: 'PV max', t: 'number' }, { k: 'pa', l: 'PA actuels', t: 'number' }, { k: 'pa_max', l: 'PA max', t: 'number' },
      { k: 'facts', l: 'Constats', t: 'list', title: 'label', item: KV }, GROUPS] },
    { key: 'story', label: 'Histoire · Son histoire', fields: [
      { k: 'chapters', l: 'Chapitres', t: 'list', title: 'title', item: NOTE },
      { k: 'convictions_title', l: 'Titre de la seconde partie', t: 'text' },
      { k: 'convictions', l: 'Convictions & loyauté', t: 'list', title: 'title', item: NOTE }] },
    { key: 'rp', label: 'Histoire · Fils role-play', hint: 'Liens vers les fils Discord.', fields: [
      { k: 'intro', l: 'Introduction', t: 'area' },
      { k: 'threads', l: 'Fils', t: 'list', title: 'title', item: [{ k: 'title', l: 'Titre', t: 'text' }, { k: 'url', l: 'Lien Discord (https://…)', t: 'text' }, { k: 'description', l: 'Description', t: 'area' }] }] },
    { key: 'family', label: 'Relations · Famille (intro)', hint: 'Les membres se gèrent dans « Relations ».', fields: [{ k: 'intro', l: 'Introduction', t: 'area' }] },
    { key: 'mentorship', label: 'Relations · Mentorat', fields: [{ k: 'intro', l: 'Introduction', t: 'area' }, { k: 'paragraphs', l: 'Textes', t: 'list', title: 'title', item: NOTE }] },
    { key: 'healer', label: 'Page Guérisseuse', fields: [{ k: 'intro', l: 'Introduction', t: 'area' }, { k: 'facts', l: 'Constats', t: 'list', title: 'label', item: KV }, GROUPS] }
  ];
  const TABLES = [
    { table: 'relations', label: 'Relations', hint: 'Famille, mentor, clan, autres. L\'affinité alimente l\'index et la carte du livre.', title: 'name', sub: 'role', blank: { name: '', role: '', category: 'other', status: 'vivant', kind: 'pnj', bond: 0, summary: '', details: '', image_url: '', sort: 100 },
      fields: [{ k: 'name', l: 'Nom', t: 'text' }, { k: 'role', l: 'Lien (Mère, Rival, Ami…)', t: 'text' },
        { k: 'category', l: 'Catégorie', t: 'select', opts: [['family', 'Famille'], ['mentor', 'Mentorat'], ['clan', 'Clan du Vent'], ['other', 'Hors du clan']] },
        { k: 'status', l: 'Statut', t: 'select', opts: [['vivant', 'Vivant·e'], ['mort', 'Mort·e'], ['collectif', 'Collectif (clan…)'], ['inconnu', 'Inconnu·e']] },
        { k: 'kind', l: 'Type', t: 'select', opts: [['pnj', 'PNJ'], ['joueur', 'Joueur']] },
        { k: 'bond', l: 'Index d\'affinité', t: 'select', num: true, opts: [[-2, '−2 · Hostile'], [-1, '−1 · Tendue'], [0, '0 · Distante'], [1, '+1 · Amicale'], [2, '+2 · Très proche']] },
        { k: 'summary', l: 'Résumé (visible)', t: 'area', short: true }, { k: 'details', l: 'Détails (dépliable)', t: 'area' },
        { k: 'image_url', l: 'Portrait', t: 'image' }, { k: 'sort', l: 'Ordre d\'affichage', t: 'number' }] },
    { table: 'gallery', label: 'Galerie', hint: 'Images affichées en polaroïds.', title: 'title', blank: { title: '', caption: '', url: '', sort: 100 },
      fields: [{ k: 'title', l: 'Titre', t: 'text' }, { k: 'caption', l: 'Légende', t: 'text' }, { k: 'url', l: 'Image', t: 'image' }, { k: 'sort', l: 'Ordre d\'affichage', t: 'number' }] }
  ];

  /* ───────── Générateur de formulaire ───────── */
  function field(f, obj, dirty) {
    const w = el('div', 'fld'); w.append(el('label', null, f.l));
    if (f.t === 'list') { w.append(listEl(f, obj, dirty)); return w; }
    const val = obj[f.k] ?? '';
    let inp;
    if (f.t === 'area') { inp = el('textarea'); inp.value = val; if (f.short) inp.style.minHeight = '70px'; }
    else if (f.t === 'select') {
      inp = el('select'); f.opts.forEach(([v, t]) => { const o = el('option', null, t); o.value = v; inp.append(o); }); inp.value = val;
    } else if (f.t === 'image') {
      const row = el('div', 'img-row'), pv = el('img'), txt = el('input'), pick = el('input'), btn = el('button', null, 'Téléverser');
      txt.value = val; txt.placeholder = 'https://… ou téléverser'; pv.src = imgSrc(val); pv.hidden = !val;
      pick.type = 'file'; pick.accept = 'image/*'; pick.hidden = true; btn.type = 'button';
      btn.onclick = () => pick.click();
      txt.oninput = () => { obj[f.k] = txt.value; pv.src = imgSrc(txt.value); pv.hidden = !txt.value; dirty(); };
      pick.onchange = async () => {
        const file = pick.files[0]; if (!file) return;
        btn.disabled = true; btn.textContent = 'Envoi…';
        const path = `${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
        const { error } = await sb.storage.from('media').upload(path, file, { contentType: file.type });
        btn.disabled = false; btn.textContent = 'Téléverser';
        if (error) return toast('Échec de l\'envoi : ' + error.message, true);
        const { data } = sb.storage.from('media').getPublicUrl(path);
        txt.value = data.publicUrl; txt.oninput(); toast('Image envoyée.');
      };
      row.append(pv, txt, btn, pick); w.append(row); return w;
    } else { inp = el('input'); inp.type = f.t === 'number' ? 'number' : 'text'; inp.value = val; }
    inp.oninput = inp.onchange = () => { obj[f.k] = (f.t === 'number' || f.num) ? Number(inp.value) : inp.value; dirty(); };
    w.append(inp); return w;
  }
  function listEl(f, obj, dirty) {
    const box = el('div', 'list'); obj[f.k] = obj[f.k] || [];
    const arr = obj[f.k];
    const blank = () => f.blank ? JSON.parse(JSON.stringify(f.blank)) : Object.fromEntries(f.item.map(x => [x.k, x.t === 'list' ? [] : '']));
    const draw = openIdx => {
      box.innerHTML = '';
      arr.forEach((it, i) => {
        const d = el('details', 'item'); d.open = i === openIdx;
        const s = el('summary'), t = el('span', 't', it[f.title] || `(${f.l} ${i + 1})`);
        const mk = (label, fn, cls) => { const b = el('button', 'mini ' + (cls || ''), label); b.type = 'button'; b.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(); dirty(); }; return b; };
        s.append(t, mk('↑', () => { if (i) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(i - 1); } }), mk('↓', () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; draw(i + 1); } }),
          mk('✕', () => { if (confirm('Supprimer cet élément ?')) { arr.splice(i, 1); draw(); } }, 'danger'));
        const body = el('div', 'body');
        f.item.forEach(sub => body.append(field(sub, it, () => { t.textContent = it[f.title] || `(${f.l} ${i + 1})`; dirty(); })));
        d.append(s, body); box.append(d);
      });
      const add = el('button', 'add', '+ Ajouter'); add.type = 'button';
      add.onclick = () => { arr.push(blank()); draw(arr.length - 1); dirty(); };
      box.append(add);
    };
    draw(); return box;
  }

  /* ───────── Vues ───────── */
  const view = $('#view');
  let isDirty = false;
  const markDirty = () => { isDirty = true; const s = $('.savebar span'); if (s) s.textContent = 'Modifications non enregistrées'; };

  async function showSection(sec) {
    view.innerHTML = '';
    view.append(el('h2', null, sec.label), el('p', 'hint', sec.hint || ''));
    const { data: row } = await sb.from('content').select('data').eq('key', sec.key).maybeSingle();
    const seed = await fetch('../data/seed.json').then(r => r.json());
    const obj = JSON.parse(JSON.stringify(row?.data || seed.content[sec.key] || {}));
    sec.fields.forEach(f => view.append(field(f, obj, markDirty)));
    const bar = el('div', 'savebar'), msg = el('span', null, row ? 'À jour' : 'Pas encore enregistré dans Supabase (valeurs initiales affichées)'), save = el('button', 'primary', 'Enregistrer');
    save.onclick = async () => {
      save.disabled = true;
      const { error } = await sb.from('content').upsert({ key: sec.key, data: obj, updated_at: new Date().toISOString() });
      save.disabled = false;
      if (error) return toast(error.message, true);
      isDirty = false; msg.textContent = 'Enregistré à ' + new Date().toLocaleTimeString('fr-FR'); toast('Enregistré ✓');
    };
    bar.append(msg, save); view.append(bar);
  }

  async function showTable(cfg, selectedId) {
    view.innerHTML = '';
    view.append(el('h2', null, cfg.label), el('p', 'hint', cfg.hint));
    const { data: rows, error } = await sb.from(cfg.table).select('*').order('sort').order(cfg.title);
    if (error) { view.append(el('p', null, error.message)); return; }
    const split = el('div', 'split'), list = el('div', 'rows'), form = el('div');
    const add = el('button', 'primary', '+ Nouveau'); add.onclick = () => edit(null);
    list.append(add);
    rows.forEach(r => {
      const b = el('button', r.id === selectedId ? 'on' : '', r[cfg.title] || '(sans titre)');
      if (cfg.sub) b.append(Object.assign(el('small'), { textContent: r[cfg.sub] }));
      b.onclick = () => { list.querySelectorAll('.on').forEach(x => x.classList.remove('on')); b.classList.add('on'); edit(r); };
      list.append(b);
    });
    function edit(r) {
      form.innerHTML = '';
      const obj = r ? { ...r } : JSON.parse(JSON.stringify(cfg.blank));
      cfg.fields.forEach(f => form.append(field(f, obj, markDirty)));
      const bar = el('div', 'savebar'), msg = el('span', null, r ? 'Modification' : 'Nouvelle entrée'), save = el('button', 'primary', 'Enregistrer');
      bar.append(msg);
      if (r) { const del = el('button', 'danger', 'Supprimer'); del.onclick = async () => {
        if (!confirm(`Supprimer « ${r[cfg.title]} » ?`)) return;
        const { error } = await sb.from(cfg.table).delete().eq('id', r.id);
        if (error) return toast(error.message, true); toast('Supprimé.'); showTable(cfg); }; bar.append(del); }
      save.onclick = async () => {
        if (!String(obj[cfg.title] || obj.url || '').trim()) return toast('Un titre ou un nom est requis.', true);
        const body = { ...obj }; delete body.id;
        const q = r ? sb.from(cfg.table).update(body).eq('id', r.id).select().single() : sb.from(cfg.table).insert(body).select().single();
        const { data, error } = await q;
        if (error) return toast(error.message, true);
        isDirty = false; toast('Enregistré ✓'); showTable(cfg, data.id);
      };
      bar.append(save); form.append(bar);
    }
    split.append(list, form); view.append(split);
    const cur = rows.find(r => r.id === selectedId);
    if (cur) edit(cur); else form.append(el('p', 'hint', 'Choisis une entrée à gauche, ou crée-en une nouvelle.'));
  }

  /* ───────── Import de la fiche initiale ───────── */
  async function importSeed() {
    if (!confirm('Importer la fiche initiale de Chant de Cigale ?\nLes pages de contenu seront REMPLACÉES par les valeurs de départ. Relations et galerie ne sont importées que si elles sont vides.')) return;
    const seed = await fetch('../data/seed.json').then(r => r.json());
    const rows = Object.entries(seed.content).map(([key, data]) => ({ key, data, updated_at: new Date().toISOString() }));
    let { error } = await sb.from('content').upsert(rows);
    if (error) return toast(error.message, true);
    for (const [t, list] of [['relations', seed.relations], ['gallery', seed.gallery]]) {
      const { count } = await sb.from(t).select('*', { count: 'exact', head: true });
      if (!count) { ({ error } = await sb.from(t).insert(list)); if (error) return toast(error.message, true); }
    }
    toast('Fiche importée ✓'); nav(0);
  }

  /* ───────── Navigation ───────── */
  const ITEMS = [{ h: 'Pages' }, ...SECTIONS.map(s => ({ s })), { h: 'Collections' }, ...TABLES.map(t => ({ t }))];
  let sel = 0;
  function nav(i) {
    if (isDirty && !confirm('Des modifications ne sont pas enregistrées. Quitter quand même ?')) return;
    isDirty = false; const real = ITEMS.filter(x => !x.h); sel = i;
    $('#nav').innerHTML = '';
    let n = 0;
    ITEMS.forEach(it => {
      if (it.h) return $('#nav').append(el('h4', null, it.h));
      const idx = n++, a = el('a', idx === i ? 'on' : '', (it.s || it.t).label); a.onclick = () => nav(idx); $('#nav').append(a);
    });
    const it = real[i]; it.s ? showSection(it.s) : showTable(it.t);
    window.scrollTo(0, 0);
  }
  addEventListener('beforeunload', e => { if (isDirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ───────── Connexion ───────── */
  async function start() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      return card(`<h1>Carnet de Cigale</h1><p>Réservé aux auteurs du carnet. Connecte-toi avec ton compte Discord.</p>
        <button class="discord" id="login">Se connecter avec Discord</button>`), $('#login').onclick = () =>
        sb.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'consent' } } });
    }
    const { data: ok, error } = await sb.rpc('is_admin');
    const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || '';
    const did = session.user.identities?.find(i => i.provider === 'discord')?.id || session.user.user_metadata?.provider_id || '?';
    if (error || !ok) {
      card(`<h1>Accès refusé</h1><p>Le compte Discord <b>${name.replace(/[<>&]/g, '')}</b> (identifiant Discord <code>${String(did).replace(/[<>&]/g, '')}</code>) n'est pas autorisé à modifier ce site. Si ce n'est pas le bon compte, déconnecte-toi de Discord dans ton navigateur ou clique sur « Changer de compte ».${error ? '<br><small>' + error.message.replace(/[<>&]/g, '') + '</small>' : ''}</p><button id="out">Changer de compte</button>`);
      return $('#out').onclick = async () => { await sb.auth.signOut(); location.reload(); };
    }
    gate.hidden = true; $('#app').hidden = false; $('#who').textContent = 'Connecté : ' + name + ' (' + did + ')';
    $('#logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };
    $('#seed').onclick = importSeed;
    nav(0);
  }
  start();
})();
