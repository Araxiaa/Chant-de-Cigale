// Charge le contenu depuis Supabase ; retombe sur data/seed.json si la base est vide, non configurée ou injoignable.
window.loadData = async function () {
  const seed = await fetch('data/seed.json').then(r => r.json());
  const { SUPABASE_URL: url, SUPABASE_KEY: key } = window.CIGALE_CONFIG;
  if (!key) return { ...seed, source: 'seed' };
  try {
    const headers = { apikey: key, Authorization: 'Bearer ' + key };
    const get = p => fetch(`${url}/rest/v1/${p}`, { headers }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const [rows, relations, gallery] = await Promise.all([
      get('content?select=key,data'),
      get('relations?select=*&order=sort.asc,name.asc'),
      get('gallery?select=*&order=sort.asc')
    ]);
    if (!rows.length) return { ...seed, source: 'seed' };
    const content = { ...seed.content };
    rows.forEach(r => { content[r.key] = r.data; });
    return { content, relations, gallery, source: 'supabase' };
  } catch (e) {
    console.warn('Supabase injoignable, contenu local utilisé.', e);
    return { ...seed, source: 'seed' };
  }
};
