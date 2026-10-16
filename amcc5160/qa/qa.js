(() => {
  'use strict';
  const API = window.AMCC5160_QA_API || '';
  const root = document.getElementById('questions');
  if (!root) return;
  const $ = sel => root.querySelector(sel);
  const feed = $('#qa-feed');
  const form = $('#qa-form');
  const status = $('#qa-status');
  const count = $('#qa-count');
  const filters = [...root.querySelectorAll('.qa-filter')];
  const store = {
    get(key) { try { return localStorage.getItem(key) || ''; } catch (_) { return ''; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} },
    sget(key) { try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; } },
    sset(key, value) { try { value ? sessionStorage.setItem(key, value) : sessionStorage.removeItem(key); } catch (_) {} }
  };
  let clientId = store.get('qa-client');
  if (!clientId) { clientId = Math.random().toString(36).slice(2) + Date.now().toString(36); store.set('qa-client', clientId); }
  const state = { posts: [], filter: 'all', adminCode: store.sget('qa-admin'), admin: false, replyTo: '', loading: true, error: '' };
  if (form.name && store.get('qa-name')) form.name.value = store.get('qa-name');

  async function api(payload) {
    if (!API) throw new Error('The Q&A board is being connected. Please check back soon.');
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...payload, clientId, adminCode: state.adminCode }), redirect: 'follow' });
    if (!response.ok) throw new Error('The Q&A board could not be reached. Please try again.');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Something went wrong.');
    return result;
  }

  function say(message, kind = '') {
    status.textContent = message;
    status.className = `qa-status ${kind}`.trim();
  }

  function timeAgo(iso) {
    const then = new Date(iso); const diff = (Date.now() - then.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
    return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Hong_Kong' });
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function adminButton(label, action) {
    const b = el('button', 'qa-admin-btn', label); b.type = 'button';
    b.addEventListener('click', action); return b;
  }

  function postNode(post, replies) {
    const card = el('article', `qa-post qa-${post.kind}${post.instructor ? ' qa-instructor' : ''}${post.hidden ? ' qa-hidden' : ''}`);
    const head = el('div', 'qa-post-head');
    const avatar = el('span', 'qa-avatar', (post.name || '?').trim().charAt(0).toUpperCase());
    const who = el('div', 'qa-who');
    const name = el('strong', '', post.name);
    if (post.instructor) name.append(el('span', 'qa-badge', 'Instructor'));
    who.append(name, el('small', '', timeAgo(post.createdAt)));
    head.append(avatar, who);
    if (post.kind !== 'reply') {
      const tag = el('span', `qa-tag ${post.kind === 'question' ? (post.answered ? 'is-answered' : 'is-open') : ''}`.trim(), post.kind === 'question' ? (post.answered ? 'Answered' : 'Question') : 'Comment');
      head.append(tag);
    }
    card.append(head, el('p', 'qa-text', post.text));
    if (post.hidden) card.append(el('p', 'qa-hidden-note', 'Hidden from students'));

    if (post.kind !== 'reply') {
      const list = el('div', 'qa-replies');
      replies.forEach(reply => list.append(postNode(reply, [])));
      card.append(list);
      const actions = el('div', 'qa-actions');
      const replyBtn = el('button', 'qa-reply-btn', replies.length ? `Reply · ${replies.length}` : 'Reply'); replyBtn.type = 'button';
      replyBtn.addEventListener('click', () => { state.replyTo = state.replyTo === post.id ? '' : post.id; render(); });
      actions.append(replyBtn);
      if (state.admin) {
        if (post.kind === 'question') actions.append(adminButton(post.answered ? 'Mark open' : 'Mark answered', () => update(post.id, { answered: !post.answered })));
        actions.append(adminButton(post.hidden ? 'Unhide' : 'Hide', () => update(post.id, { hidden: !post.hidden })));
        actions.append(deleteButton(post.id));
      }
      card.append(actions);
      if (state.replyTo === post.id) card.append(replyForm(post.id));
    } else if (state.admin) {
      const actions = el('div', 'qa-actions');
      actions.append(adminButton(post.hidden ? 'Unhide' : 'Hide', () => update(post.id, { hidden: !post.hidden })), deleteButton(post.id));
      card.append(actions);
    }
    return card;
  }

  function deleteButton(id) {
    const b = adminButton('Delete', () => {
      if (b.dataset.armed) { remove(id); return; }
      b.dataset.armed = '1'; b.textContent = 'Confirm delete'; b.classList.add('is-danger');
      setTimeout(() => { delete b.dataset.armed; b.textContent = 'Delete'; b.classList.remove('is-danger'); }, 4000);
    });
    return b;
  }

  function replyForm(parentId) {
    const f = el('form', 'qa-reply-form');
    const nameInput = el('input'); nameInput.name = 'name'; nameInput.placeholder = 'Name or nickname'; nameInput.maxLength = 40; nameInput.value = store.get('qa-name'); nameInput.required = !state.admin; nameInput.hidden = state.admin;
    const text = el('textarea'); text.name = 'text'; text.rows = 3; text.maxLength = 2000; text.required = true; text.placeholder = 'Write a reply…';
    const send = el('button', 'qa-submit', state.admin ? 'Reply as instructor' : 'Post reply'); send.type = 'submit';
    f.append(nameInput, text, send);
    f.addEventListener('submit', async event => {
      event.preventDefault(); send.disabled = true;
      try {
        if (!state.admin) store.set('qa-name', nameInput.value.trim());
        const result = await api({ action: 'post', kind: 'reply', parentId, name: nameInput.value, text: text.value });
        state.replyTo = ''; apply(result); say('Reply posted. Thank you!', 'ok');
      } catch (error) { say(error.message, 'error'); send.disabled = false; }
    });
    setTimeout(() => text.focus(), 0);
    return f;
  }

  function apply(result) {
    state.posts = result.posts || [];
    if (typeof result.admin === 'boolean') state.admin = result.admin;
    state.loading = false; state.error = '';
    render();
  }

  async function update(id, change) {
    try { apply(await api({ action: 'admin-update', id, ...change })); } catch (error) { say(error.message, 'error'); }
  }
  async function remove(id) {
    try { apply(await api({ action: 'admin-delete', id })); say('Deleted.', 'ok'); } catch (error) { say(error.message, 'error'); }
  }

  function render() {
    const top = state.posts.filter(p => p.kind !== 'reply');
    const replies = state.posts.filter(p => p.kind === 'reply').sort((a, b) => a.createdAt < b.createdAt ? -1 : 1);
    const shown = top.filter(p => state.filter === 'all' || (state.filter === 'open' ? p.kind === 'question' && !p.answered : p.kind === state.filter));
    const questions = top.filter(p => p.kind === 'question');
    count.textContent = `${questions.length} question${questions.length === 1 ? '' : 's'} · ${top.length - questions.length} comment${top.length - questions.length === 1 ? '' : 's'}`;
    filters.forEach(b => b.classList.toggle('is-active', b.dataset.filter === state.filter));
    feed.replaceChildren();
    root.classList.toggle('qa-is-admin', state.admin);
    if (state.loading) { feed.append(el('p', 'qa-empty', 'Loading questions and comments…')); return; }
    if (state.error) { feed.append(el('p', 'qa-empty', state.error)); return; }
    if (!shown.length) { feed.append(el('p', 'qa-empty', top.length ? 'Nothing here yet for this filter.' : 'No posts yet. Be the first to ask a question or share a thought!')); return; }
    shown.forEach(post => feed.append(postNode(post, replies.filter(r => r.parentId === post.id))));
  }

  filters.forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.filter; render(); }));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; say('Posting…');
    try {
      store.set('qa-name', form.name.value.trim());
      const result = await api({ action: 'post', kind: form.kind.value, name: form.name.value, text: form.text.value, website: form.website.value });
      form.text.value = ''; apply(result); say('Posted. Thank you!', 'ok');
    } catch (error) { say(error.message, 'error'); }
    button.disabled = false;
  });

  const adminForm = $('#qa-admin-form');
  $('#qa-admin-toggle').addEventListener('click', () => {
    if (state.admin) { state.adminCode = ''; state.admin = false; store.sset('qa-admin', ''); load(); return; }
    adminForm.hidden = !adminForm.hidden; if (!adminForm.hidden) adminForm.code.focus();
  });
  adminForm.addEventListener('submit', async event => {
    event.preventDefault();
    state.adminCode = adminForm.code.value.trim();
    try { await api({ action: 'admin-check' }); store.sset('qa-admin', state.adminCode); adminForm.hidden = true; adminForm.reset(); await load(); say('Instructor mode on.', 'ok'); }
    catch (error) { state.adminCode = ''; say(error.message, 'error'); }
  });

  async function load() {
    try { apply(await api({ action: 'list' })); }
    catch (error) { state.loading = false; state.error = error.message; render(); }
    $('#qa-admin-toggle').textContent = state.admin ? 'Leave instructor mode' : 'Instructor';
  }
  render();
  load();
  setInterval(() => { if (!document.hidden && !state.replyTo) load(); }, 60000);
})();
