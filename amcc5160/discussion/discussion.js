// AMCC 5160 · Course Q&A widget
// Usage: <div class="qa" data-qa-page="assignment-3"></div> + config.js + this script.
(() => {
  'use strict';

  const API_URL = window.AMCC5160_DISCUSSION_API || '';
  const NAME_KEY = 'amcc5160-qa-name';
  const TOKEN_KEY = 'amcc5160-qa-tokens';
  const CLIENT_KEY = 'amcc5160-qa-client';
  const REFRESH_MS = 60000;
  const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

  const storage = {
    get(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  };

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === false || value === null || value === undefined) return;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : value);
    });
    children.flat().forEach(child => { if (child !== null && child !== undefined && child !== false) el.append(child.nodeType ? child : document.createTextNode(String(child))); });
    return el;
  }

  function linkify(text) {
    const fragment = document.createDocumentFragment();
    let last = 0;
    String(text).replace(URL_PATTERN, (match, url, offset) => {
      fragment.append(text.slice(last, offset));
      fragment.append(h('a', { href: url, target: '_blank', rel: 'noopener noreferrer nofollow ugc' }, url));
      last = offset + match.length;
      return match;
    });
    fragment.append(text.slice(last));
    return fragment;
  }

  function timeAgo(iso) {
    const date = new Date(iso);
    const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const units = [[60, 'min'], [24, 'h'], [7, 'd']];
    let value = seconds / 60;
    for (let i = 0; i < units.length; i += 1) {
      const [limit, label] = units[i];
      if (value < limit) return `${Math.floor(value)} ${label} ago`;
      value /= limit;
    }
    return date.toLocaleDateString('en-HK', { month: 'short', day: 'numeric', timeZone: 'Asia/Hong_Kong' });
  }

  function exactTime(iso) {
    return new Date(iso).toLocaleString('en-HK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hong_Kong' }) + ' HKT';
  }

  function initWidget(root) {
    const page = root.dataset.qaPage;
    const state = { adminCode: '', staff: false, posts: [], filter: 'all', kind: 'question', replyTo: '', loading: false };
    let refreshTimer;
    let clientId = storage.get(CLIENT_KEY, '');
    if (!clientId) { clientId = Math.random().toString(36).slice(2) + Date.now().toString(36); storage.set(CLIENT_KEY, clientId); }

    async function api(payload) {
      const body = Object.assign({ page: page, clientId: clientId }, payload, state.adminCode ? { adminCode: state.adminCode } : {});
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
      if (!response.ok) throw new Error('The Q&A service could not be reached. Please try again.');
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || 'The request could not be completed.');
      return result;
    }

    const status = h('p', { class: 'qa-status', role: 'status', 'aria-live': 'polite' });
    let statusTimer;
    function showStatus(message, kind) {
      clearTimeout(statusTimer);
      status.textContent = message;
      status.className = `qa-status ${kind || ''}`.trim();
      if (kind !== 'error') statusTimer = setTimeout(() => { status.textContent = ''; }, 4000);
    }

    // ---------- Not connected yet ----------
    if (!API_URL) {
      root.append(h('div', { class: 'qa-card' },
        h('p', { class: 'qa-kicker' }, 'Q&A'),
        h('h3', {}, 'Q&A opens soon'),
        h('p', { class: 'qa-muted' }, 'Questions and comments for this page will appear here shortly. Until then, please post on Canvas or email the teaching team.')));
      return;
    }

    // ---------- Compose ----------
    const nameInput = h('input', { type: 'text', maxlength: '60', autocomplete: 'name', placeholder: 'Your name or nickname', value: storage.get(NAME_KEY, '') });
    const messageInput = h('textarea', { maxlength: '2000', placeholder: 'Ask a question about the brief, share an idea or a work-in-progress link, or answer a classmate…' });
    const kindButtons = ['question', 'comment'].map(kind => h('button', {
      type: 'button', 'aria-pressed': String(kind === state.kind),
      onclick: () => { state.kind = kind; kindButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === kind))); }
    }, kind === 'question' ? 'Question' : 'Comment'));
    kindButtons.forEach((button, index) => { button.dataset.kind = index === 0 ? 'question' : 'comment'; });
    const postButton = h('button', { class: 'qa-primary', type: 'submit' }, 'Post');
    const trapInput = h('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    const trap = h('label', { style: 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden', 'aria-hidden': 'true' }, 'Website', trapInput);
    const charCount = h('span', { class: 'qa-hint' }, '0 / 2000');
    messageInput.addEventListener('input', () => { charCount.textContent = `${messageInput.value.length} / 2000`; });
    const composeForm = h('form', { class: 'qa-card qa-compose', onsubmit: onPost },
      h('div', { class: 'qa-compose-top' },
        h('label', {}, 'Name shown to the class', nameInput),
        h('div', { class: 'qa-kinds', role: 'group', 'aria-label': 'Post type' }, kindButtons)),
      h('label', {}, 'Message', messageInput),
      trap,
      h('div', { class: 'qa-compose-foot' },
        h('span', { class: 'qa-hint' }, 'Posts are public on this page. Be kind, and don’t share personal details such as student IDs. ', charCount),
        postButton));

    // ---------- List ----------
    const countLabel = h('strong', {}, 'Discussion');
    const filterButtons = [['all', 'All'], ['question', 'Questions'], ['unanswered', 'Unanswered'], ['comment', 'Comments']].map(([key, label]) => h('button', {
      type: 'button', 'aria-pressed': String(key === state.filter),
      onclick: () => { state.filter = key; filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.key === key))); render(); }
    }, label));
    filterButtons.forEach((button, index) => { button.dataset.key = ['all', 'question', 'unanswered', 'comment'][index]; });
    const refreshButton = h('button', { class: 'qa-ghost', type: 'button', onclick: () => load(true) }, '↻ Refresh');
    const list = h('div', { class: 'qa-list', 'aria-live': 'polite' });
    const board = h('div', {},
      composeForm,
      h('div', { class: 'qa-toolbar' }, countLabel, h('div', { class: 'qa-filters' }, filterButtons, refreshButton)),
      list);

    // ---------- Staff sign-in ----------
    const staffInput = h('input', { type: 'password', autocomplete: 'off', placeholder: 'Staff code', 'aria-label': 'Staff code' });
    const staffForm = h('form', { class: 'qa-staff-form', hidden: true, onsubmit: onStaff },
      staffInput, h('button', { class: 'qa-primary', type: 'submit' }, 'Sign in'),
      h('button', { class: 'qa-ghost', type: 'button', onclick: () => { staffForm.hidden = true; } }, 'Cancel'));
    const staffState = h('span', {}, '');
    const staffToggle = h('button', { class: 'qa-ghost', type: 'button', onclick: () => {
      if (state.staff) { state.staff = false; state.adminCode = ''; updateStaff(); load(true); return; }
      staffForm.hidden = !staffForm.hidden; if (!staffForm.hidden) staffInput.focus();
    } }, 'Teaching team sign-in');
    const staffBar = h('div', {}, h('div', { class: 'qa-staff-bar' }, staffState, staffToggle), staffForm);

    root.append(board, status, staffBar);

    function updateStaff() {
      staffState.textContent = state.staff ? 'Signed in as teaching team: your posts carry a badge, and you can pin, hide, and mark answered.' : '';
      staffState.className = state.staff ? 'qa-staff-on' : '';
      staffToggle.textContent = state.staff ? 'Sign out of staff mode' : 'Teaching team sign-in';
    }

    function startRefresh() {
      clearInterval(refreshTimer);
      refreshTimer = setInterval(() => {
        const typing = root.contains(document.activeElement) && /TEXTAREA|INPUT/.test(document.activeElement.tagName);
        if (document.visibilityState === 'visible' && !typing) load(false);
      }, REFRESH_MS);
    }

    async function onStaff(event) {
      event.preventDefault();
      const value = staffInput.value.trim();
      if (!value) return;
      const previous = state.adminCode;
      state.adminCode = value;
      try {
        const result = await api({ action: 'discussion-staff-check' });
        if (!result.staff) throw new Error('Incorrect staff code.');
        state.staff = true; staffInput.value = ''; staffForm.hidden = true;
        updateStaff(); await load(true);
        showStatus('Staff mode on.', 'success');
      } catch (error) {
        state.adminCode = previous; state.staff = Boolean(previous);
        showStatus(error.message, 'error');
      }
    }

    async function load(showErrors) {
      if (state.loading) return;
      state.loading = true;
      try {
        const result = await api({ action: 'discussion-list' });
        state.posts = result.posts || [];
        render();
      } catch (error) {
        if (showErrors) showStatus(error.message, 'error');
      } finally { state.loading = false; }
    }

    async function onPost(event) {
      event.preventDefault();
      const name = nameInput.value.trim();
      const message = messageInput.value.trim();
      if (name.length < 2) { showStatus('Please enter your name (at least 2 characters).', 'error'); nameInput.focus(); return; }
      if (message.length < 2) { showStatus('Please write a message.', 'error'); messageInput.focus(); return; }
      postButton.disabled = true;
      try {
        const result = await api({ action: 'discussion-post', name: name, kind: state.kind, message: message, website: trapInput.value });
        storage.set(NAME_KEY, name);
        messageInput.value = ''; charCount.textContent = '0 / 2000';
        if (result.post) { rememberToken(result.post.id, result.token); state.posts.push(result.post); }
        render();
        showStatus('Posted. Thank you!', 'success');
      } catch (error) { showStatus(error.message, 'error'); }
      finally { postButton.disabled = false; }
    }

    async function postReply(parentId, textarea, button) {
      const name = nameInput.value.trim();
      const message = textarea.value.trim();
      if (name.length < 2) { showStatus('Please enter your name in the box at the top first.', 'error'); nameInput.focus(); return; }
      if (message.length < 2) { showStatus('Please write a reply.', 'error'); textarea.focus(); return; }
      button.disabled = true;
      try {
        const result = await api({ action: 'discussion-post', name: name, parentId: parentId, message: message, website: trapInput.value });
        if (result.post) rememberToken(result.post.id, result.token);
        storage.set(NAME_KEY, name);
        state.replyTo = '';
        await load(true);
        showStatus('Reply posted.', 'success');
      } catch (error) { showStatus(error.message, 'error'); button.disabled = false; }
    }

    function rememberToken(id, token) { const tokens = storage.get(TOKEN_KEY, {}); tokens[id] = token; storage.set(TOKEN_KEY, tokens); }
    function ownToken(id) { return storage.get(TOKEN_KEY, {})[id] || ''; }

    async function removePost(post) {
      if (!window.confirm('Remove this post? It will disappear for everyone.')) return;
      try { await api({ action: 'discussion-delete', id: post.id, token: ownToken(post.id) }); await load(true); showStatus('Post removed.', 'success'); }
      catch (error) { showStatus(error.message, 'error'); }
    }

    async function moderate(post, field, value) {
      try { await api({ action: 'discussion-moderate', id: post.id, field: field, value: value }); await load(true); }
      catch (error) { showStatus(error.message, 'error'); }
    }

    function postHead(post) {
      return h('div', { class: 'qa-post-head' },
        h('strong', {}, post.name),
        post.staff ? h('span', { class: 'qa-badge staff' }, 'Teaching team') : null,
        post.kind === 'question' ? h('span', { class: 'qa-badge question' }, 'Question') : null,
        post.kind === 'comment' ? h('span', { class: 'qa-badge comment' }, 'Comment') : null,
        post.kind === 'question' && post.answered ? h('span', { class: 'qa-badge answered' }, '✓ Answered') : null,
        post.pinned ? h('span', { class: 'qa-badge pinned' }, 'Pinned') : null,
        post.hidden ? h('span', { class: 'qa-badge hidden' }, 'Hidden') : null,
        h('time', { class: 'qa-time', datetime: post.createdAt, title: exactTime(post.createdAt) }, timeAgo(post.createdAt)));
    }

    function postActions(post, isTop) {
      const actions = [];
      if (isTop) actions.push(h('button', { class: 'qa-ghost', type: 'button', onclick: () => { state.replyTo = state.replyTo === post.id ? '' : post.id; render(); } }, state.replyTo === post.id ? 'Cancel reply' : 'Reply'));
      if (ownToken(post.id) && !state.staff) actions.push(h('button', { class: 'qa-ghost is-danger', type: 'button', onclick: () => removePost(post) }, 'Remove'));
      if (state.staff) {
        if (isTop) actions.push(h('button', { class: 'qa-ghost', type: 'button', onclick: () => moderate(post, 'pinned', !post.pinned) }, post.pinned ? 'Unpin' : 'Pin'));
        if (isTop && post.kind === 'question') actions.push(h('button', { class: 'qa-ghost', type: 'button', onclick: () => moderate(post, 'answered', !post.answered) }, post.answered ? 'Mark unanswered' : 'Mark answered'));
        actions.push(h('button', { class: 'qa-ghost is-danger', type: 'button', onclick: () => moderate(post, 'hidden', !post.hidden) }, post.hidden ? 'Unhide' : 'Hide'));
      }
      return actions.length ? h('div', { class: 'qa-actions' }, actions) : null;
    }

    function render() {
      const tops = state.posts.filter(post => !post.parentId);
      const replies = state.posts.filter(post => post.parentId);
      const repliesFor = id => replies.filter(reply => reply.parentId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const activity = post => repliesFor(post.id).reduce((latest, reply) => reply.createdAt > latest ? reply.createdAt : latest, post.createdAt);
      const visibleTops = tops.filter(post => {
        if (state.filter === 'question') return post.kind === 'question';
        if (state.filter === 'comment') return post.kind === 'comment';
        if (state.filter === 'unanswered') return post.kind === 'question' && !post.answered;
        return true;
      }).sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || activity(b).localeCompare(activity(a)));

      const questions = tops.filter(post => post.kind === 'question');
      const open = questions.filter(post => !post.answered).length;
      countLabel.textContent = `${tops.length} ${tops.length === 1 ? 'post' : 'posts'} · ${open} open ${open === 1 ? 'question' : 'questions'}`;

      list.replaceChildren();
      if (!visibleTops.length) {
        list.append(h('div', { class: 'qa-empty' }, tops.length ? 'Nothing matches this filter.' : 'No posts yet. Be the first to ask a question!'));
        return;
      }
      visibleTops.forEach(post => {
        const threadReplies = repliesFor(post.id);
        const replyBox = state.replyTo === post.id ? (() => {
          const textarea = h('textarea', { maxlength: '2000', placeholder: `Reply to ${post.name}…` });
          const send = h('button', { class: 'qa-primary', type: 'button' }, 'Post reply');
          send.addEventListener('click', () => postReply(post.id, textarea, send));
          setTimeout(() => textarea.focus(), 0);
          return h('div', { class: 'qa-reply-form' }, textarea, h('div', {}, send));
        })() : null;
        list.append(h('article', { class: `qa-thread${post.pinned ? ' is-pinned' : ''}${post.hidden ? ' is-hidden' : ''}`, id: `qa-${post.id}` },
          postHead(post),
          h('p', { class: 'qa-message' }, linkify(post.message)),
          postActions(post, true),
          replyBox,
          threadReplies.length ? h('div', { class: 'qa-replies' }, threadReplies.map(reply => h('div', { class: `qa-reply${reply.staff ? ' is-staff' : ''}${reply.hidden ? ' is-hidden' : ''}` },
            postHead(reply), h('p', { class: 'qa-message' }, linkify(reply.message)), postActions(reply, false)))) : null));
      });
    }
    list.append(h('div', { class: 'qa-empty' }, 'Loading questions…'));
    load(true);
    startRefresh();
  }

  document.querySelectorAll('.qa[data-qa-page]').forEach(initWidget);
})();
