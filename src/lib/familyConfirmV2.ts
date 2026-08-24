// Family Confirmation v2 — the ownership questionnaire's logic, exactly as
// designed: who is on the deed, who has died, who inherits, and who therefore
// has to sign. Ported verbatim from the approved model.
// @ts-nocheck
/* eslint-disable */

export const REL = ['Myself, I am on the deed', 'Husband or wife', 'Son or daughter', 'Daughter- or son-in-law', 'Grandchild', 'Brother or sister', 'Niece or nephew', 'Executor or trustee', 'Attorney or agent', 'Friend', 'Other'];
export const SELF = 'Myself, I am on the deed';

export function initials(n) {
  const t = String(n || '').trim();
  if (!t) return '?';
  const p = t.split(/\s+/);
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function shortName(n) {
  const t = String(n || '').trim();
  if (!t) return 'Not named yet';
  const p = t.split(/\s+/);
  return p.length > 1 ? p[0] + ' ' + p[p.length - 1][0] + '.' : p[0];
}

// Two spellings of one person should not become two people. Match on first
// and last token only, so "Margaret A. Ruiz" and "Margaret Ruiz" merge, while
// "John Smith Jr" and "John Smith Sr" stay apart.
export function nameKey(n) {
  const t = String(n || '').toLowerCase().replace(/[.,'\u2019]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const p = t.split(' ');
  return p.length > 1 ? p[0] + ' ' + p[p.length - 1] : p[0];
}

/** The blank questionnaire, seeded from what the admin typed off the deed. */
export function initialState(CRM) {
  return {
    rel: '', relOther: '', selfIs: '', youName: '',
    deed: (CRM.deed || []).map((n, i) => ({ id: 'd' + i, n: n, st: '' })),
    seq: (CRM.deed || []).length, kseq: 0,
    couple: '', poa: {}, spouse: {}, will: {}, taker: {},
    kids: [], noKids: {}, heirSpouse: {},
    spaces: (CRM.spaces || []).map(l => ({ label: l, used: '', who: '' })),
    contacts: {}, note: '', submitted: false, sent: false
  };
}

/** Every derived value the page renders, built fresh from the answers. */
export function buildLogic(state, setS, accent0, CRM) {
  const L = {



  accent: () => { return accent0 || '#4a6b54'; },


  named: () => { return state.deed.filter(d => d.n.trim()); },

  // Two names on one deed with the same surname are, nine times out of ten, a
  // husband and wife. We pre-tick that and skip asking each of them separately
  // whether they have a spouse, because their spouse is the other owner.
  coupleIds: () => {
    const named = L.named();
    if (named.length !== 2) return [];
    const last = n => { const k = nameKey(n).split(' '); return k[k.length - 1]; };
    const a = last(named[0].n), b = last(named[1].n);
    return a && a === b ? named.map(d => d.id) : [];
  },
  coupleAsk: () => { return L.coupleIds().length === 2; },
  coupleVal: () => { return state.couple || ''; },
  coupleYes: (id) => { return L.coupleVal() === 'yes' && L.coupleIds().indexOf(id) >= 0; },
  // The effective spouse answer for a deed owner: married-to-each-other means
  // there is no off-deed spouse to consent.
  sp: (id) => { return L.coupleYes(id) ? { has: 'no', n: '' } : (state.spouse[id] || {}); },

  living: () => { return L.named().filter(d => d.st === 'living'); },
  gone: () => { return L.named().filter(d => d.st === 'deceased'); },

  // A will that specifically identifies the plot sends that share to one
  // person, so the family line below it never comes into play.
  devised: (d) => {
    return state.will[d.id] === 'yes' && (state.taker[d.id] || '').trim().length > 0;
  },
  estates: () => { return L.gone().filter(d => !L.devised(d)); },
  deedName: (id) => { const d = state.deed.filter(x => x.id === id)[0]; return d ? d.n.trim() : ''; },

  // Everyone who takes a share by inheritance: living children, and the
  // children of any child who died before them.
  inheritors: () => {
    const out = [];
    state.kids.forEach(k => {
      const parents = (k.of || []).map(id => L.deedName(id)).filter(Boolean).join(' and ');
      if (k.st === 'deceased') {
        (k.kids || []).forEach(g => {
          if (g.n.trim()) out.push({ id: g.id, n: g.n, rel: 'Grandchild of ' + (parents || 'the deceased') + ', in place of ' + (k.n.trim() || 'their parent') });
        });
      } else if (k.n.trim()) {
        out.push({ id: k.id, n: k.n, rel: 'Child of ' + (parents || 'the deceased') });
      }
    });
    return out;
  },

  seg: (cur, opts, pick) => {
    return opts.map(o => ({
      label: o[1],
      bg: cur === o[0] ? '#ffffff' : 'transparent',
      fg: cur === o[0] ? '#1d1d1f' : '#86868b',
      sh: cur === o[0] ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
      pick: () => pick(o[0])
    }));
  },

  patch: (key, id, obj) => {
    setS(s => {
      const m = Object.assign({}, s[key]);
      m[id] = Object.assign({}, m[id] || {}, obj);
      return { [key]: m };
    });
  },

  mutKids: (fn) => {
    setS(s => {
      const list = JSON.parse(JSON.stringify(s.kids));
      fn(list);
      return { kids: list };
    });
  },

  addKid: (name) => {
    setS(s => {
      const of = L.estates().map(d => d.id);
      return {
        kids: s.kids.concat([{ id: 'k' + s.kseq, n: name || '', st: 'living', of: of.length === 1 ? of : [], kids: [] }]),
        kseq: s.kseq + 1
      };
    });
  },

  done1: () => {
    const named = L.named();
    if (!named.length) return false;
    // Every owner must be explicitly ticked living or died — no silent default.
    if (!named.every(d => d.st === 'living' || d.st === 'deceased')) return false;
    // And if the two names look like a couple, that question must be answered too.
    if (L.coupleAsk() && !state.couple) return false;
    return true;
  },
  done2: () => {
    const s = state;
    if (!s.rel) return false;
    if (s.rel === 'Other' && !s.relOther.trim()) return false;
    if (s.rel === SELF) return !!s.selfIs;
    return !!s.youName.trim();
  },
  done3: () => {
    return L.living().every(d => {
      const p = state.poa[d.id];
      return p && p.has && (p.has === 'no' || (p.n || '').trim());
    });
  },
  done4: () => { return state.spaces.every(s => s.used && (s.used !== 'yes' || s.who.trim())); },
  done5: () => {
    return L.named().every(d => {
      const sp = L.sp(d.id);
      if (!sp || !sp.has) return false;
      // The owner answering for themselves cannot say "don't know" about their
      // own marriage — we need it to draw up the consent.
      if (sp.has === 'unknown') return !(state.rel === SELF && state.selfIs === d.id);
      if (sp.has !== 'yes') return true;
      const n = (sp.n || '').trim();
      if (!n) return false;
      if (!sp.alive) return false;
      if (nameKey(n) === nameKey(d.n)) return false; // cannot be their own spouse
      return true;
    });
  },
  done6: () => { return L.gone().every(d => !!state.will[d.id]); },
  done7: () => {
    const est = L.estates();
    if (!est.length) return true;
    const multi = est.length > 1;
    const namedKids = state.kids.filter(k => k.n.trim() || (k.kids || []).some(g => g.n.trim()));
    if (multi && namedKids.some(k => !(k.of || []).length)) return false;
    // A child who died before their parent passes their share down: we must be
    // told either their children's names, or that there were none.
    const deceasedResolved = state.kids.every(k =>
      k.st !== 'deceased' || !k.n.trim() ||
      (k.kids || []).some(g => g.n.trim()) || (state.noKids || {})['kid:' + k.id]
    );
    if (!deceasedResolved) return false;
    return est.every(d => state.noKids[d.id] || namedKids.some(k => (k.of || []).indexOf(d.id) >= 0));
  },
  done8: () => {
    return L.inheritors().every(h => {
      const hs = state.heirSpouse[h.id];
      return hs && hs.has && (hs.has !== 'yes' || ((hs.n || '').trim() && !!hs.alive));
    });
  },

  // One person, however many hats they wear.
  people: () => {
    const s = state, map = {}, order = [];
    let anon = 0;
    const add = (raw, role, opts) => {
      const nm = (raw || '').trim();
      const k = nm ? nameKey(nm) : 'blank' + (anon++);
      if (!map[k]) { map[k] = { key: k, name: nm, roles: [], must: false, dead: false, blank: !nm, agentFor: '' }; order.push(k); }
      const e = map[k];
      if (nm.length > e.name.length) e.name = nm;
      if (e.roles.indexOf(role) < 0) e.roles.push(role);
      if (opts && opts.must) e.must = true;
      if (opts && opts.dead) e.dead = true;
      if (opts && opts.agentFor) e.agentFor = opts.agentFor;
      return e;
    };

    const relLabel = (s.rel === 'Other' ? s.relOther : s.rel || '').toLowerCase();
    if (s.rel && s.rel !== SELF && s.youName.trim()) add(s.youName, 'Our point of contact \u2014 ' + relLabel, {});

    s.deed.forEach(d => {
      if (!d.n.trim()) return;
      const isYou = s.rel === SELF && s.selfIs === d.id;
      if (d.st === 'deceased') {
        add(d.n, 'Named on the deed \u00b7 has died', { dead: true });
      } else {
        const p = s.poa[d.id] || {};
        add(d.n, p.has === 'yes' ? 'Named on the deed \u2014 signs through an attorney-in-fact' : 'Named on the deed \u2014 must sign', { must: true });
        if (p.has === 'yes' && (p.n || '').trim()) add(p.n, 'Holds power of attorney for ' + d.n + ' \u2014 signs in ' + d.n + '\u2019s name', { must: true, agentFor: d.n });
      }
      if (isYou) add(d.n, 'This is you, our point of contact', {});
      const sp = L.sp(d.id);
      if (sp.has === 'yes' && (sp.n || '').trim()) {
        const spDead = sp.alive === 'deceased';
        add(sp.n,
          spDead
            ? 'Husband or wife of ' + d.n + ' \u00b7 has died \u2014 no consent needed from them'
            : 'Husband or wife of ' + d.n + ', not on the deed \u2014 holds a right of interment and must sign a consent',
          spDead ? { dead: true } : { must: true });
      }
    });

    L.gone().forEach(d => {
      if (L.devised(d)) add(s.taker[d.id], 'Left ' + d.n + '\u2019s share by a will that names the plot', { must: true });
    });

    s.kids.forEach(k => {
      const parents = (k.of || []).map(id => L.deedName(id)).filter(Boolean).join(' and ');
      const of = parents || 'the deceased owner';
      if (k.st === 'deceased') {
        if (k.n.trim()) add(k.n, 'Child of ' + of + ' \u00b7 has died', { dead: true });
        (k.kids || []).forEach(g => {
          if (g.n.trim()) add(g.n, 'Grandchild of ' + of + ' \u2014 steps into ' + (k.n.trim() || 'their parent') + '\u2019s share', { must: true });
        });
      } else if (k.n.trim()) {
        add(k.n, 'Child of ' + of + ' \u2014 inherits a share', { must: true });
      }
    });

    L.inheritors().forEach(h => {
      const hs = s.heirSpouse[h.id] || {};
      if (hs.has === 'yes' && (hs.n || '').trim()) {
        const hsDead = hs.alive === 'deceased';
        add(hs.n,
          hsDead
            ? 'Husband or wife of ' + h.n.trim() + ' \u00b7 has died \u2014 no consent needed from them'
            : 'Husband or wife of ' + h.n.trim() + ', who inherits \u2014 holds a right of interment and must sign a consent',
          hsDead ? { dead: true } : { must: true });
      }
    });

    return order.map(k => map[k]);
  },

  // ---- live diagram -------------------------------------------------
  chip: (name, tone, tag, link) => {
    const acc = L.accent();
    const T = {
      sign: { ring: acc, avBg: '#eef1ea', avFg: acc, nameFg: '#1d1d1f', tagFg: acc },
      gone: { ring: '#dcdce1', avBg: '#f2f2f5', avFg: '#9a9aa2', nameFg: '#9a9aa2', tagFg: '#b7b7bf' },
      need: { ring: '#e6c3b4', avBg: '#fdf6f3', avFg: '#a8654c', nameFg: '#7d3a28', tagFg: '#a8654c' },
      info: { ring: '#e3e3e8', avBg: '#f5f5f7', avFg: '#86868b', nameFg: '#4c4c54', tagFg: '#b7b7bf' }
    };
    const t = T[(name || '').trim() ? tone : 'need'];
    return {
      initials: initials(name), short: shortName(name), tag: tag,
      ring: t.ring, avBg: t.avBg, avFg: t.avFg, nameFg: t.nameFg, tagFg: t.tagFg,
      linked: !!link, link: link || ''
    };
  },

  panel: () => {
    const s = state;
    const youKey = nameKey(s.youName);
    const deedCols = s.deed.filter(d => d.n.trim()).map(d => {
      const stack = [];
      const dead = d.st === 'deceased';
      const isYou = s.rel === SELF && s.selfIs === d.id;
      stack.push(L.chip(d.n, dead ? 'gone' : 'sign', dead ? 'Deed \u00b7 died' : (isYou ? 'Deed \u00b7 you' : 'On the deed'), ''));
      const p = s.poa[d.id] || {};
      if (!dead && p.has === 'yes') stack.push(L.chip(p.n, 'sign', 'Signs for them', 'power of attorney'));
      if (L.coupleYes(d.id)) {
        const other = L.named().filter(x => x.id !== d.id)[0];
        if (other) stack.push(L.chip(other.n, 'info', 'Married to each other', 'husband and wife'));
      }
      const sp = L.sp(d.id);
      if (sp.has === 'yes') stack.push(L.chip(sp.n, 'sign', 'Consents', 'married to'));
      if (sp.has === 'unknown') stack.push(L.chip('', 'need', 'We will check', 'spouse?'));
      return { stack };
    });

    const kidCols = s.kids.map(k => {
      const stack = [];
      const dead = k.st === 'deceased';
      const isYou = !!youKey && nameKey(k.n) === youKey;
      stack.push(L.chip(k.n, dead ? 'gone' : 'sign', dead ? 'Child \u00b7 died' : (isYou ? 'Child \u00b7 you' : 'Inherits'), ''));
      if (!dead) {
        const hs = s.heirSpouse[k.id] || {};
        if (hs.has === 'yes') stack.push(L.chip(hs.n, 'sign', 'Consents', 'married to'));
        if (hs.has === 'unknown') stack.push(L.chip('', 'need', 'We will check', 'spouse?'));
      }
      const kids = [];
      if (dead) {
        const hs0 = s.heirSpouse[k.id] || {};
        if (hs0.has === 'yes' && (hs0.n || '').trim()) stack.push(L.chip(hs0.n, 'info', 'Their surviving spouse', 'married to'));
        (k.kids || []).forEach(g => {
          kids.push(L.chip(g.n, 'sign', 'Steps in', ''));
          const hs = s.heirSpouse[g.id] || {};
          if (hs.has === 'yes') kids.push(L.chip(hs.n, 'sign', 'Consents', 'married to'));
        });
        if (!(k.kids || []).length) kids.push(L.chip('', 'need', 'Who inherits?', ''));
      }
      return { stack, kids, hasKids: kids.length > 0 };
    });

    L.gone().forEach(d => {
      if (L.devised(d)) kidCols.push({ stack: [L.chip(s.taker[d.id], 'sign', 'Takes by will', '')], kids: [], hasKids: false });
    });

    return { deed: deedCols, kids: kidCols };
  },

  docs: () => {
    const s = state, D = [];
    const add = (name, why, have) => D.push({ name, why, have: !!have });
    add('Certificate of ownership', 'The deed itself. It proves the right being sold.', true);
    add('Photo ID for everyone signing', 'A driving licence or passport, one per signer.');
    L.gone().forEach(d => {
      add('Death certificate for ' + d.n, 'A certified copy. It opens the chain of succession for their share.');
      const w = s.will[d.id];
      if (w === 'yes') add('The will of ' + d.n, 'Plus the probate order or muniment of title. A will transfers nothing until a court has acted on it.');
      if (w === 'no') add('Proof of who inherits from ' + d.n, 'A court order determining heirs, or a recorded affidavit of heirship signed by two people outside the family.');
      if (w === 'unsure') add('Anything you have from ' + d.n + '\u2019s estate', 'A will, probate papers, or nothing at all. We search the county records either way.');
    });
    L.living().forEach(d => {
      const p = s.poa[d.id] || {};
      if (p.has === 'yes') add('The power of attorney for ' + d.n, 'We check it covers property and allows the authority to be passed on to us.');
    });
    L.named().forEach(d => {
      const sp = L.sp(d.id);
      if (sp.has === 'yes' && sp.alive !== 'deceased') add('Spousal consent from ' + (sp.n || 'their spouse'), 'Signed by the husband or wife of ' + d.n + '. We send it already drawn up.');
    });
    s.kids.forEach(k => {
      if (k.st === 'deceased' && k.n.trim()) add('Death certificate for ' + k.n.trim(), 'It is what lets their children step into the share.');
    });
    L.inheritors().forEach(h => {
      const hs = s.heirSpouse[h.id] || {};
      if (hs.has === 'yes' && (hs.n || '').trim() && hs.alive !== 'deceased') add('Spousal consent from ' + hs.n.trim(), 'Signed by the husband or wife of ' + h.n.trim() + ', who inherits a share.');
    });
    if (s.spaces.some(x => x.used === 'yes')) add('The cemetery\u2019s interment record', 'We request this ourselves, but tell us anything you know about the burial.');
    add('The cemetery\u2019s transfer packet', 'We prepare and file it. The transfer is recorded within three business days.', true);
    add('Our limited power of attorney', 'One per signer, posted out. Signed only after you accept our offer.');
    return D;
  },

  flags: () => {
    const s = state, F = [], P = L.people();
    const push = (name, why) => F.push({ name, why });

    P.forEach(e => {
      if (e.blank && e.must) push('One person is still unnamed', 'A signature is needed from someone described as "' + e.roles[0] + '". We cannot post anything until we have their name.');
      const signing = e.roles.filter(r => r.indexOf('point of contact') < 0 && r.indexOf('This is you') < 0 && r.indexOf('has died') < 0);
      if (e.agentFor && e.must && signing.length > 1)
        push(e.name + ' signs twice', 'Once in their own right, and once as attorney-in-fact for ' + e.agentFor + '. Those are two separate signatures on two separate documents, and both are needed.');
      else if (signing.length > 1 && !e.dead)
        push(e.name + ' appears in more than one role', 'They came up as ' + signing.join(', and as ') + '. That is one person, so one power of attorney covers every capacity. We have merged them rather than writing twice.');
      if (e.dead && e.must)
        push(e.name + ' is listed as both living and deceased', 'The answers put this name on both sides. Tell us which is right and we will correct it.');
    });

    L.named().forEach(d => {
      const sp = L.sp(d.id);
      if (sp.has === 'unknown') push('We do not yet know whether ' + d.n + ' has a spouse', 'A husband or wife holds a right of interment even when they are not on the deed, so we search the marriage records before anything is signed. It is routine.');
      if (sp.has === 'yes' && (sp.n || '').trim() && L.named().some(x => x.id !== d.id && nameKey(x.n) === nameKey(sp.n)))
        push(sp.n.trim() + ' is already named on the deed', 'They are an owner in their own right, so no separate spousal consent is needed. One signature covers both.');
    });

    s.spaces.forEach(x => {
      if (x.used === 'yes') push(x.label + ' has been used' + (x.who.trim() ? ' \u2014 ' + x.who.trim() : ''), 'An interment reserves rights for the surviving spouse and children over the remaining spaces, and some cemeteries will not permit a resale at all. We check their rules first.');
      if (x.used === 'unsure') push('We are not sure whether ' + x.label.toLowerCase() + ' has been used', 'The cemetery holds the interment record. We will ask them directly.');
    });

    L.living().forEach(d => {
      const p = s.poa[d.id] || {};
      if (p.has === 'yes') push((p.n || 'Someone') + ' holds power of attorney for ' + d.n, 'They sign in ' + d.n + '\u2019s name, never their own, and only if the document covers property and expressly allows the authority to be passed to us. If it does not, ' + d.n + ' signs our form directly, which is usually simpler. A power of attorney also ends at death.');
    });

    L.gone().forEach(d => {
      const w = s.will[d.id];
      if (w === 'unsure') push('It is unclear whether ' + d.n + ' left a will', 'We search the probate records in the county where they lived. If nothing was ever filed, the plot follows the family line instead.');
      if (L.devised(d)) push((s.taker[d.id] || '').trim() + ' takes ' + d.n + '\u2019s share alone', 'Because the will names the plot, the rest of the family does not sign for it. The will still has to have been probated, or admitted as a muniment of title, before that signature counts.');
      if (s.noKids[d.id]) push(d.n + ' left no surviving descendants', 'The share then moves up the family ladder, to a surviving parent, or to brothers and sisters and their children. Tell us who is living and we will map it.');
    });

    s.kids.forEach(k => {
      if (k.st === 'deceased' && !(k.kids || []).some(g => g.n.trim()))
        push((k.n.trim() || 'A child') + ' has died and no children are listed', 'Their share has to go somewhere. Add their children, or tell us there were none, and we will work out who inherits it.');
    });

    L.inheritors().forEach(h => {
      const hs = s.heirSpouse[h.id] || {};
      if (hs.has === 'unknown') push('We do not know whether ' + h.n.trim() + ' is married', 'Once they inherit, their husband or wife gains a right of interment and has to consent. We will confirm it before drawing up the paperwork.');
    });

    if (P.filter(e => e.must).length > 1)
      push('Every owner has to agree', 'A plot cannot be split or sold in part. The decision must be unanimous between all owners and everyone holding a right of interment, so a single refusal or missing signature stops the sale.');

    return F;
  },

  renderVals: () => {
    const s = state, acc = L.accent();
    const d1 = L.done1(), d2 = d1 && L.done2(), d3 = d2 && L.done3(), d4 = d3 && L.done4(), d5 = d4 && L.done5();
    const hasGone = L.gone().length > 0;
    const est = L.estates();
    const d6 = d5 && L.done6();
    const d7 = d6 && L.done7();
    const d8 = d7 && L.done8();
    const stage2Done = !hasGone || d8;
    const ready = d5 && stage2Done;

    const num = ok => ({ bg: ok ? acc : '#f0f0f3', fg: ok ? '#ffffff' : '#9a9aa2' });
    const N = [d1, d2, d3, d4, d5, d6, d7, d8].map(num);
    const stage1Count = [d1, d2, d3, d4, d5].filter(Boolean).length;
    const stage2Count = [d6, d7, d8].filter(Boolean).length;

    const P = L.people();
    const alive = P.filter(e => !e.dead);
    const signers = alive.filter(e => e.must);
    const F = s.submitted ? L.flags() : [];
    const multiEstate = est.length > 1;
    const youKey = nameKey(s.youName);
    const inTree = s.kids.some(k => nameKey(k.n) === youKey && youKey);
    const youCouldBeChild = (s.rel === 'Son or daughter' || s.rel === 'Grandchild') && !!s.youName.trim();
    const pane = L.panel();
    const missingNames = signers.filter(e => e.blank).length;

    return {
      accent: acc, family: CRM.family, cemetery: CRM.cemetery, location: CRM.location, deedNote: CRM.deedNote,
      progressPct: (s.submitted ? 100 : Math.round((stage1Count + (hasGone ? stage2Count : 0)) / ((hasGone ? 8 : 5) + 1) * 100)) + '%',
      progressLabel: s.submitted ? 'Ready to send'
        : !d5 ? 'Stage one \u00b7 ' + stage1Count + ' of 5'
        : (hasGone && !stage2Done) ? 'Stage two \u00b7 ' + stage2Count + ' of 3'
        : 'Last step',
      showForm: !s.submitted,

      n1bg: N[0].bg, n1fg: N[0].fg, n2bg: N[1].bg, n2fg: N[1].fg, n3bg: N[2].bg, n3fg: N[2].fg, n4bg: N[3].bg, n4fg: N[3].fg,
      n5bg: N[4].bg, n5fg: N[4].fg, n6bg: N[5].bg, n6fg: N[5].fg, n7bg: N[6].bg, n7fg: N[6].fg, n8bg: N[7].bg, n8fg: N[7].fg,

      panelEmpty: pane.deed.length === 0,
      panelShow: pane.deed.length > 0,
      pDeed: pane.deed,
      pKids: pane.kids,
      pHasKids: pane.kids.length > 0,
      panelCount: signers.length === 0 ? 'nobody yet' : (signers.length === 1 ? '1 signature' : signers.length + ' signatures'),
      panelNote: missingNames > 0
        ? (missingNames === 1 ? 'One person on the tree still needs a name before we can write to them.' : missingNames + ' people on the tree still need names before we can write to them.')
        : '',
      legend: [
        { label: 'Signs', bg: '#eef1ea', ring: acc },
        { label: 'Has died', bg: '#f2f2f5', ring: '#dcdce1' },
        { label: 'Needs a name', bg: '#fdf6f3', ring: '#e6c3b4' }
      ],

      deedRows: s.deed.map((d, i) => {
        const sp = L.sp(d.id);
        return {
        name: d.n, initials: initials(d.n),
        cardBg: d.st === 'deceased' ? '#fafafa' : '#ffffff',
        cardBd: d.st === 'deceased' ? '#e6e6eb' : (!d.st && d.n.trim() ? '#e6c3b4' : '#ececf0'),
        avBg: d.st === 'deceased' ? '#f2f2f5' : (d.st === 'living' && d.n.trim() ? '#eef1ea' : '#f5f5f7'),
        avFg: d.st === 'deceased' ? '#9a9aa2' : (d.st === 'living' && d.n.trim() ? acc : '#b7b7bf'),
        marriedYes: sp.has === 'yes',
        marriedAsk: !!d.n.trim() && !!d.st && !L.coupleYes(d.id) && !(L.coupleAsk() && !s.couple),
        marriedLabel: (d.st === 'deceased' ? 'Was ' : 'Is ') + (d.n.trim() || 'this owner') + ' married?',
        spouseName: sp.n || '',
        spousePlaceholder: 'Full legal name of ' + (d.n.trim() || 'this owner') + '\u2019s husband or wife',
        marriedSeg: L.seg(sp.has, [['no', 'No'], ['yes', 'Yes'], ['unknown', "Don't know"]], v => L.patch('spouse', d.id, { has: v })),
        setSpouseName: ev => { const v = ev.target.value; L.patch('spouse', d.id, { n: v }); },
        seg: L.seg(d.st, [['living', 'Still living'], ['deceased', 'Has died']], v => setS(st => {
          const l = st.deed.slice(); l[i] = Object.assign({}, l[i], { st: v }); return { deed: l };
        })),
        setName: ev => { const v = ev.target.value; setS(st => { const l = st.deed.slice(); l[i] = Object.assign({}, l[i], { n: v }); return { deed: l }; }); },
        remove: () => setS(st => { const l = st.deed.slice(); l.splice(i, 1); return { deed: l }; })
        };
      }),
      coupleAsk: L.coupleAsk(),
      coupleNames: L.coupleIds().length === 2 ? L.named().map(d => d.n.trim()).join(' and ') : '',
      coupleSeg: L.seg(L.coupleVal(), [['yes', 'Yes'], ['no', 'No'], ['unknown', "Don't know"]], v => setS({ couple: v })),

      addDeed: () => setS(st => ({ deed: st.deed.concat([{ id: 'd' + st.seq, n: '', st: '' }]), seq: st.seq + 1 })),

      show2: d1,
      relOpts: REL.map(r => ({
        label: r,
        bg: s.rel === r ? acc : '#ffffff',
        fg: s.rel === r ? '#ffffff' : '#1d1d1f',
        bd: s.rel === r ? acc : '#e3e3e8',
        pick: () => setS({ rel: r })
      })),
      relIsSelf: s.rel === SELF,
      relIsOther: s.rel === 'Other',
      relOther: s.relOther,
      setRelOther: ev => { const v = ev.target.value; setS({ relOther: v }); },
      selfOpts: L.named().map(d => ({
        label: d.n,
        bg: s.selfIs === d.id ? acc : '#ffffff',
        fg: s.selfIs === d.id ? '#ffffff' : '#1d1d1f',
        bd: s.selfIs === d.id ? acc : '#e3e3e8',
        pick: () => setS({ selfIs: d.id })
      })),
      needYourName: !!s.rel && s.rel !== SELF,
      youName: s.youName,
      setYouName: ev => { const v = ev.target.value; setS({ youName: v }); },

      show3: d2,
      noLiving: L.living().length === 0,
      poaRows: L.living().map(d => {
        const p = s.poa[d.id] || {};
        return {
          name: d.n, yes: p.has === 'yes', agent: p.n || '',
          seg: L.seg(p.has, [['no', 'No'], ['yes', 'Yes']], v => L.patch('poa', d.id, { has: v })),
          setAgent: ev => { const v = ev.target.value; L.patch('poa', d.id, { n: v }); }
        };
      }),

      show4: d3,
      spaceRows: s.spaces.map((x, i) => ({
        label: x.label, used: x.used === 'yes', who: x.who,
        seg: L.seg(x.used, [['no', 'Never used'], ['yes', 'Used'], ['unsure', "Don't know"]], v => setS(st => {
          const l = st.spaces.slice(); l[i] = Object.assign({}, l[i], { used: v }); return { spaces: l };
        })),
        setWho: ev => { const v = ev.target.value; setS(st => { const l = st.spaces.slice(); l[i] = Object.assign({}, l[i], { who: v }); return { spaces: l }; }); }
      })),

      show5: d4,
      spouseRows: L.named().filter(d => !L.coupleYes(d.id)).map(d => {
        const sp = L.sp(d.id);
        const who = d.n.trim() || 'this owner';
        const past = d.st === 'deceased';
        return {
          name: d.n, status: d.st === 'deceased' ? 'Has died' : 'Living',
          question: past ? 'Was ' + who + ' married?' : 'Is ' + who + ' married?',
          yes: sp.has === 'yes', unknown: sp.has === 'unknown', spouseName: sp.n || '',
          placeholder: 'Full legal name of ' + who + '\u2019s husband or wife',
          pair: (sp.n || '').trim()
            ? (sp.n || '').trim() + ' \u2014 husband or wife of ' + who
            : 'We record this person as the husband or wife of ' + who + '.',
          aliveAsk: sp.has === 'yes',
          aliveSeg: L.seg(sp.alive, [['living', 'Still living'], ['deceased', 'Has died']], v => L.patch('spouse', d.id, { alive: v })),
          aliveNeeded: sp.has === 'yes' && !sp.alive,
          aliveNote: sp.alive === 'living'
            ? 'They will be sent their own consent and power of attorney to sign, so we will ask for their address at the end.'
            : sp.alive === 'deceased'
              ? 'Nothing to sign from them. We may ask for a death certificate later.'
              : 'Tell us whether they are still living \u2014 only a living spouse signs.',
          seg: L.seg(sp.has, [['no', 'No'], ['yes', 'Yes'], ['unknown', "Don't know"]], v => L.patch('spouse', d.id, { has: v })),
          setSpouse: ev => { const v = ev.target.value; L.patch('spouse', d.id, { n: v }); }
        };
      }),

      showStage2: d5 && hasGone,
      stage2Intro: 'Because ' + L.gone().map(d => d.n).join(' and ') + ' ' + (L.gone().length > 1 ? 'have' : 'has') + ' died, their share passes to someone else. These answers tell us who, and who else that brings in.',
      willRows: L.gone().map(d => ({
        name: d.n, yes: s.will[d.id] === 'yes', taker: s.taker[d.id] || '',
        seg: L.seg(s.will[d.id], [['yes', 'Yes, it named the plot'], ['no', 'No'], ['unsure', "Don't know"]], v => setS(st => ({ will: Object.assign({}, st.will, { [d.id]: v }) }))),
        setTaker: ev => { const v = ev.target.value; setS(st => ({ taker: Object.assign({}, st.taker, { [d.id]: v }) })); }
      })),

      show7: d6 && est.length > 0,
      estates: est.map(d => {
        const none = !!s.noKids[d.id];
        return {
          name: d.n, initials: initials(d.n), sub: 'Named on the deed \u00b7 has died',
          noneLabel: none ? 'No surviving children \u2713' : 'No surviving children',
          noneBg: none ? acc : '#ffffff',
          noneFg: none ? '#ffffff' : '#4c4c54',
          noneBd: none ? acc : '#e3e3e8',
          toggleNone: () => setS(st => ({ noKids: Object.assign({}, st.noKids, { [d.id]: !st.noKids[d.id] }) }))
        };
      }),
      showAddMe: youCouldBeChild && !inTree,
      addMeLabel: '+ Add yourself, ' + s.youName.trim(),
      addMe: () => L.addKid(s.youName.trim()),
      kidRows: s.kids.map((k, i) => ({
        name: k.n, initials: initials(k.n), dead: k.st === 'deceased',
        isYou: !!youKey && nameKey(k.n) === youKey,
        rel: k.st === 'deceased' ? 'Child, has died \u2014 their children step in' : 'Child',
        cardBg: k.st === 'deceased' ? '#fafafa' : '#ffffff',
        cardBd: k.st === 'deceased' ? '#e6e6eb' : '#ececf0',
        avBg: k.st === 'deceased' ? '#f2f2f5' : (k.n.trim() ? '#eef1ea' : '#f5f5f7'),
        avFg: k.st === 'deceased' ? '#9a9aa2' : (k.n.trim() ? acc : '#b7b7bf'),
        passLabel: (k.kids || []).length ? 'Their children step into this share and sign in their place, alongside their living aunts and uncles.' : 'Their share does not disappear \u2014 it passes to their own children. Add them here, or tell us there were none.',
        noneKids: !!(s.noKids || {})['kid:' + k.id],
        noneKidsLabel: (s.noKids || {})['kid:' + k.id] ? 'They had no children \u2713' : 'They had no children',
        toggleNoneKids: () => setS(st => ({ noKids: Object.assign({}, st.noKids, { ['kid:' + k.id]: !(st.noKids || {})['kid:' + k.id] }) })),
        showParents: multiEstate,
        parents: est.map(d => {
          const on = (k.of || []).indexOf(d.id) >= 0;
          return {
            label: d.n,
            bg: on ? acc : '#ffffff',
            fg: on ? '#ffffff' : '#4c4c54',
            bd: on ? acc : '#e3e3e8',
            toggle: () => L.mutKids(l => {
              const of = l[i].of || [];
              const at = of.indexOf(d.id);
              if (at >= 0) of.splice(at, 1); else of.push(d.id);
              l[i].of = of;
            })
          };
        }),
        seg: L.seg(k.st, [['living', 'Living'], ['deceased', 'Has died']], v => L.mutKids(l => { l[i].st = v; })),
        setName: ev => { const v = ev.target.value; L.mutKids(l => { l[i].n = v; }); },
        remove: () => L.mutKids(l => { l.splice(i, 1); }),
        addKid: () => setS(st => {
          const l = JSON.parse(JSON.stringify(st.kids));
          l[i].kids.push({ id: 'g' + st.kseq, n: '', st: 'living' });
          return { kids: l, kseq: st.kseq + 1 };
        }),
        kids: (k.kids || []).map((g, j) => ({
          name: g.n, initials: initials(g.n),
          avBg: g.n.trim() ? '#eef1ea' : '#f5f5f7',
          avFg: g.n.trim() ? acc : '#b7b7bf',
          setName: ev => { const v = ev.target.value; L.mutKids(l => { l[i].kids[j].n = v; }); },
          remove: () => L.mutKids(l => { l[i].kids.splice(j, 1); })
        }))
      })),
      addKid: () => L.addKid(''),

      show8: d7 && L.inheritors().length > 0,
      heirSpouseRows: L.inheritors().map(h => {
        const hs = s.heirSpouse[h.id] || {};
        const who = h.n.trim() || 'this person';
        return {
          name: h.n.trim(), rel: h.rel, yes: hs.has === 'yes', spouseName: hs.n || '',
          question: 'Is ' + who + ' married?',
          placeholder: 'Full legal name of ' + who + '\u2019s husband or wife',
          pair: (hs.n || '').trim()
            ? (hs.n || '').trim() + ' \u2014 husband or wife of ' + who
            : 'We record this person as the husband or wife of ' + who + '.',
          aliveAsk: hs.has === 'yes',
          aliveSeg: L.seg(hs.alive, [['living', 'Still living'], ['deceased', 'Has died']], v => L.patch('heirSpouse', h.id, { alive: v })),
          aliveNeeded: hs.has === 'yes' && !hs.alive,
          aliveNote: hs.alive === 'living'
            ? 'They will be sent their own consent and power of attorney to sign, so we will ask for their address at the end.'
            : hs.alive === 'deceased'
              ? 'Nothing to sign from them. We may ask for a death certificate later.'
              : 'Tell us whether they are still living \u2014 only a living spouse signs.',
          seg: L.seg(hs.has, [['no', 'Not married'], ['yes', 'Married'], ['unknown', "Don't know"]], v => L.patch('heirSpouse', h.id, { has: v })),
          setSpouse: ev => { const v = ev.target.value; L.patch('heirSpouse', h.id, { n: v }); }
        };
      }),

      showContacts: ready,
      contactsTitle: signers.length === 1 ? 'One person needs a power of attorney' : signers.length + ' people need a power of attorney',
      contacts: alive.map(c => {
        const st = s.contacts[c.key] || {};
        const needAddr = c.must && !(st.addr || '').trim();
        return {
          name: c.name || 'Name still needed', roles: c.roles,
          nameFg: c.blank ? '#7d3a28' : '#1d1d1f',
          tag: c.must ? 'Must sign' : 'For contact only',
          tagBg: c.must ? '#eef1ea' : '#f0f0f3',
          tagFg: c.must ? acc : '#86868b',
          bd: needAddr ? '#f2ddd5' : (c.must ? '#e0e6dd' : '#ececf0'),
          needAddr,
          addrLabel: c.must
            ? 'Postal address \u2014 required, this is where their power of attorney is posted'
            : 'Postal address, if you have it',
          addrPlaceholder: c.must
            ? 'Street, city, state and ZIP for ' + (c.name || 'this person')
            : 'Postal address',
          addr: st.addr || '', email: st.email || '', phone: st.phone || '',
          setAddr: ev => { const v = ev.target.value; L.patch('contacts', c.key, { addr: v }); },
          setEmail: ev => { const v = ev.target.value; L.patch('contacts', c.key, { email: v }); },
          setPhone: ev => { const v = ev.target.value; L.patch('contacts', c.key, { phone: v }); }
        };
      }),
      note: s.note,
      setNote: ev => { const v = ev.target.value; setS({ note: v }); },
      submit: () => setS({ submitted: true }),

      submitted: s.submitted,
      signerHeadline: signers.length === 1 ? 'One person has to sign' : signers.length + ' people have to sign',
      signers: signers.map(c => {
        const st = s.contacts[c.key] || {};
        const missing = !(st.addr || '').trim() || c.blank;
        const bits = [st.addr, st.email, st.phone].filter(x => (x || '').trim()).join('\n');
        return {
          name: c.name || 'Name still needed', roles: c.roles,
          tag: c.agentFor ? 'Signs for another' : 'Must sign',
          tagBg: missing ? '#f6e3da' : '#eef1ea',
          tagFg: missing ? '#7d3a28' : acc,
          addr: missing ? 'Address still needed \u2014 we will ask you for it, or trace it ourselves.' : bits,
          bg: missing ? '#fdf6f3' : '#fafafc',
          bd: missing ? '#f2ddd5' : '#ececf0',
          rule: missing ? '#f2ddd5' : '#e6e6eb',
          nameFg: missing ? '#7d3a28' : '#1d1d1f',
          roleFg: missing ? '#96543f' : '#6e6e73',
          addrFg: missing ? '#96543f' : '#4c4c54'
        };
      }),
      docs: (s.submitted ? L.docs() : []).map(d => ({
        name: d.name, why: d.why, have: d.have,
        boxBd: d.have ? acc : '#c9c9cf',
        boxBg: d.have ? acc : '#ffffff'
      })),
      flags: F, hasFlags: F.length > 0,
      steps: [
        { n: '1', t: 'A senior broker reviews your answers', d: 'Usually the same day. Please do not send any documents yet \u2014 there is nothing for you to do right now.' },
        { n: '2', t: 'We confirm the picture', d: 'Marriage and probate records, and the cemetery\u2019s own file, so nobody with a claim is missed.' },
        { n: '3', t: 'You get one follow-up email', d: 'It contains the official list of documents for your file and a secure link where you can upload each one.' },
        { n: '4', t: 'Everyone signs', d: 'A limited power of attorney goes out to each person on the list, already prepared. A notary comes to them. We then record the transfer with the cemetery.' }
      ],
      sendLabel: s.sent ? 'Sent to Texas Cemetery Brokers' : 'Send this to Texas Cemetery Brokers',
      sendBg: s.sent ? '#f0f0f3' : acc,
      sendFg: s.sent ? '#86868b' : '#ffffff',
      send: () => setS({ sent: true }),
      reopen: () => setS({ submitted: false, sent: false }),
      print: () => window.print()
    };
  }

  };
  return L;
}
