/* Local-first practice. Only a confirmed server read opens the cloud write gate. */
(() => {
  'use strict';
  const P = window.Ke1Progress;
  const $ = id => document.getElementById(id);
  const VERSION = '20260920-fixes1';
  const CONFIG = {apiKey:'AIzaSyClOzy8OE5byDb-JRHg3WRBexpll6A_4Ow',authDomain:'papers-afc96.firebaseapp.com',projectId:'papers-afc96',storageBucket:'papers-afc96.firebasestorage.app',messagingSenderId:'96532598264',appId:'1:96532598264:web:2bfc852509f4d5373d1a0d'};
  const PREFIX = 'ke1:v2:';
  let bank, latestQuestions = [], session, auth, db, authUser = null, authMode = 'login', authBusy = false;
  let authInit, authEpoch = 0, importOnLogin = false, storageError = false, wrongPage = 0;
  let sequence = null, revealed = new Set(), imageState = 'none', imageId = '', imageTimer;
  let wrongReturnFocus, wrongSelection = false, filteredWrong = [];
  let returnFocus, resendAfter = 0, bankLoading = false, resolveBank;
  const bankReady = new Promise(resolve => { resolveBank = resolve; });
  const operationId = () => window.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2);
  const active = ctx => session === ctx;
  const current = () => bank.byId.get(session.data.currentId);
  function deadline(promise, ms, message) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error(message)), ms);})]).finally(() => clearTimeout(timer));
  }
  function status(message, error = false, retry = false) {
    $('status').textContent = storageError ? (message === '云端已同步' ? '云端已同步，但本机保存不可用；建议导出备份。' : '本机保存不可用；请导出备份后再离开页面。') : message;
    $('sync-bar').classList.toggle('error', error || storageError);
    $('retry-sync').hidden = !retry;
    $('export-progress').hidden = !storageError;
  }
  function readLocal(key) {
    try { return P.normalize(JSON.parse(localStorage.getItem(PREFIX + key) || 'null'), bank); }
    catch (_) { storageError = true; return P.normalize(null, bank); }
  }
  function persist(ctx = session) {
    if (!ctx) return false;
    try {localStorage.setItem(PREFIX + ctx.key, JSON.stringify(ctx.data)); return true;}
    catch (_) {storageError = true; status('本页仍可练习，但刷新可能丢失进度。', true); return false;}
  }
  function dispose(ctx) {
    if (!ctx) return;
    clearTimeout(ctx.timer);
    ctx.unsubscribe?.();
  }
  function makeSession(key, uid) {
    return {key, uid, data:readLocal(key), ready:false, reading:false, inFlight:false, timer:null, unsubscribe:null};
  }
  function updateAccount() {
    const verified = authUser?.emailVerified;
    $('account-button').textContent = verified ? authUser.email : authUser ? '验证邮箱' : '登录同步';
    $('account-button').title = verified ? '已登录：' + authUser.email : '';
    $('logout').hidden = !authUser;
    const unverified = !!authUser && !verified;
    $('verification').hidden = !unverified;
    $('auth-form').hidden = unverified;
    document.querySelector('.auth-tabs').hidden = unverified;
    $('auth-title').textContent = unverified ? '验证邮箱后同步进度' : '登录后同步进度';
  }
  async function activate(user) {
    authUser = user;
    const epoch = ++authEpoch;
    dispose(session);
    updateAccount();
    await bankReady;
    if (epoch !== authEpoch) return;
    const uid = user?.emailVerified ? user.uid : null;
    const key = uid ? 'user:' + uid : 'guest';
    session = makeSession(key, uid);
    sequence = null; revealed.clear(); wrongPage = 0;
    if ($('wrong-screen').open) $('wrong-screen').close();
    if (uid && importOnLogin) {
      const guest = readLocal('guest');
      session.data.answers = P.mergeAnswers(session.data.answers, guest.answers);
      session.data.pending = P.mergeAnswers(session.data.pending, guest.answers);
      if (guest.positionUpdatedAt >= session.data.positionUpdatedAt) {
        session.data.currentId = guest.currentId;
        session.data.positionUpdatedAt = guest.positionUpdatedAt;
        session.data.positionDirty = true;
      }
      // Clear the guest copy only after its account-specific durable copy exists.
      if (persist()) {
        try {localStorage.removeItem(PREFIX + 'guest');} catch (_) { /* Retain the safe extra copy. */ }
      }
      importOnLogin = false;
    }
    render();
    if (uid) {
      closeAuth();
      await connectCloud(session);
    } else {
      status('游客进度保存在本机 · 登录后可同步');
      if (user && $('auth-screen').open) $('auth-message').textContent = '请打开验证邮件，验证后点击“我已验证，继续登录”。';
    }
  }
  async function connectCloud(ctx) {
    if (!active(ctx) || !ctx.uid || !db || ctx.reading) return;
    ctx.ready = false;
    ctx.reading = true;
    ctx.unsubscribe?.(); ctx.unsubscribe = null;
    status('正在读取云端进度；新作答会先保存在本机。');
    const ref = db.collection('users').doc(ctx.uid);
    try {
      const snapshot = await deadline(ref.get({source:'server'}), 10000, '读取云端超时');
      if (!active(ctx)) return;
      const remote = P.normalize(snapshot.exists ? snapshot.data().ke1Progress : null, bank);
      const pendingPosition = ctx.data.positionDirty;
      ctx.data = P.mergeProgress(remote, ctx.data);
      acknowledge(ctx, remote);
      if (!pendingPosition) ctx.data.positionDirty = false;
      ctx.ready = true;
      persist(ctx); render();
      status(hasPending(ctx) ? '已保存在本机 · 等待同步' : '云端已同步');
      ctx.unsubscribe = ref.onSnapshot({includeMetadataChanges:true}, snapshot => {
        if (!active(ctx) || !ctx.ready || snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites) return;
        const incoming = P.normalize(snapshot.exists ? snapshot.data().ke1Progress : null, bank);
        // Do not move the question under the reader when another device advances.
        acknowledge(ctx, incoming);
        ctx.data.answers = P.mergeAnswers(incoming.answers, ctx.data.pending);
        persist(ctx); render();
      }, () => {
        if (!active(ctx)) return;
        ctx.ready = false;
        status('云端连接中断，进度保存在本机；请重试同步。', true, true);
      });
      if (hasPending(ctx)) scheduleSync(600);
    } catch (_) {
      if (active(ctx)) status('云端进度读取失败，已暂停上传；本机练习会保留。', true, true);
    } finally {ctx.reading = false;}
  }
  function acknowledge(ctx, remote) {
    for (const [id, entry] of Object.entries(ctx.data.pending)) {
      const saved = remote.answers[id];
      if (entry.operationId && saved?.operationId === entry.operationId && saved.updatedAt === entry.updatedAt) delete ctx.data.pending[id];
    }
    if (ctx.data.currentId === remote.currentId && ctx.data.positionUpdatedAt <= remote.positionUpdatedAt) ctx.data.positionDirty = false;
  }
  function hasPending(ctx) { return Object.keys(ctx.data.pending).length > 0 || ctx.data.positionDirty; }
  function scheduleSync(delay = 1200) {
    const ctx = session;
    if (!ctx.uid) {status('已保存在本机 · 登录后可同步'); return;}
    if (!ctx.ready) {if (!ctx.reading) status('已保存在本机；读取云端成功后才会上传。', true, true); return;}
    if (!navigator.onLine) {status('当前离线，进度保存在本机；联网后自动同步。', false, true); return;}
    status('已保存在本机 · 等待同步');
    if (!ctx.timer && !ctx.inFlight) ctx.timer = setTimeout(() => {ctx.timer = null; sync(ctx);}, delay);
  }
  async function sync(ctx) {
    if (!active(ctx) || !ctx.ready || ctx.inFlight || !hasPending(ctx)) return;
    ctx.inFlight = true;
    let succeeded = false;
    const pending = {...ctx.data.pending};
    const position = {dirty:ctx.data.positionDirty, id:ctx.data.currentId, at:ctx.data.positionUpdatedAt};
    const ref = db.collection('users').doc(ctx.uid);
    status('正在同步；进度已保存在本机。');
    const slow = setTimeout(() => {
      if (active(ctx)) status('同步较慢，进度仍保存在本机；可继续练习或退出。', false, true);
    }, 10000);
    try {
      const merged = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        if (!active(ctx) || !ctx.ready) throw new Error('会话已改变');
        const rawProgress = snapshot.exists ? snapshot.data().ke1Progress : null;
        const remote = P.normalize(rawProgress, bank);
        const patch = P.dict();
        for (const [id, entry] of Object.entries(pending)) patch[id] = P.mergeRecord(remote.answers[id], entry);
        const all = P.mergeAnswers(remote.answers, patch);
        const payload = {schemaVersion:2, bankVersion:VERSION, updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
        // Never send an empty answers map: merge:true would still clear that map.
        if (Object.keys(patch).length) payload.answers = patch;
        if ((position.dirty && position.at >= remote.positionUpdatedAt) || !bank.aliases.has(rawProgress?.currentId)) {
          payload.currentId = position.id; payload.positionUpdatedAt = position.at;
        }
        transaction.set(ref, {ke1Progress:payload}, {merge:true});
        return all;
      });
      if (!active(ctx)) return;
      succeeded = true;
      for (const [id, entry] of Object.entries(pending)) {
        if (ctx.data.pending[id]?.operationId === entry.operationId && ctx.data.pending[id]?.updatedAt === entry.updatedAt) delete ctx.data.pending[id];
      }
      if (position.dirty && ctx.data.positionUpdatedAt === position.at && ctx.data.currentId === position.id) ctx.data.positionDirty = false;
      ctx.data.answers = P.mergeAnswers(merged, ctx.data.pending);
      persist(ctx); render();
      status(hasPending(ctx) ? '已保存在本机 · 等待同步' : '云端已同步');
    } catch (_) {
      if (active(ctx)) status('同步失败，待同步进度保存在本机；请重试。', true, true);
    } finally {
      clearTimeout(slow); ctx.inFlight = false;
      // Failures wait for an explicit retry or network recovery, not an endless write loop.
      if (active(ctx) && succeeded && hasPending(ctx)) scheduleSync();
    }
  }
  function savePosition(id) {
    session.data.currentId = id;
    session.data.positionUpdatedAt = Date.now();
    session.data.positionDirty = true;
    persist(); scheduleSync(4000);
  }
  function navigate(id, focus = true) {
    if (!bank.byId.has(id)) return;
    $('practice-message').textContent = '';
    savePosition(id); render();
    if (focus) {$('question').focus({preventScroll:true}); $('question').scrollIntoView({block:'start',behavior:'instant'});}
  }
  function displayedAnswer() {
    const id = session.data.currentId;
    return sequence && !revealed.has(id) ? null : session.data.answers[id];
  }
  function render() {
    if (!bank || !session) return;
    const q = current();
    const index = bank.questions.findIndex(item => item.id === q.id);
    const saved = displayedAnswer();
    $('total').textContent = bank.questions.length.toLocaleString() + ' 道题 · 全部连续练习';
    $('type').textContent = q.supplemental ? '补充练习 · ' + (q.type === 'judgement' ? '判断题' : '单选题') : q.newRuleFlag ? '2026新规题' : q.type === 'judgement' ? '判断题' : '单选题';
    $('number').textContent = String(index + 1).padStart(4, '0') + ' / ' + bank.questions.length;
    $('question').textContent = q.question_zh;
    renderImage(q);
    $('options').replaceChildren(...q.options.map(option => {
      const button = document.createElement('button');
      button.className = 'option'; button.dataset.label = option.label;
      const letter = document.createElement('span'); letter.className = 'letter'; letter.textContent = option.label;
      const label = document.createElement('span'); label.textContent = option.text_zh;
      button.append(letter, label);
      if (saved) {
        if (option.label === q.answer) button.classList.add('correct');
        if (option.label === saved.choice && saved.choice !== q.answer) button.classList.add('wrong');
      }
      button.disabled = !!saved || (q.image && imageState !== 'ready');
      button.addEventListener('click', () => choose(option.label));
      return button;
    }));
    $('feedback').className = saved ? 'feedback show ' + (saved.choice === q.answer ? 'correct' : 'wrong') : 'feedback';
    $('feedback-label').textContent = saved ? (saved.choice === q.answer ? '回答正确' : '回答错误 · 正确答案是 ' + q.answer) : '';
    $('explanation').textContent = saved ? q.explanation_zh || '请结合相关交通法规核对。' : '';
    const ids = sequence?.ids || bank.questions.map(q => q.id);
    const position = ids.indexOf(q.id);
    $('prev').disabled = position <= 0;
    $('next').disabled = !saved;
    $('next').textContent = position === ids.length - 1 ? (sequence ? '完成本轮' : '查看练习结果') : sequence?.kind === 'wrong' ? '下一道错题 →' : '下一题 →';
    $('skip').disabled = false;
    $('redo-question').hidden = !saved || !!sequence;
    $('mode-banner').hidden = !sequence;
    if (sequence) $('mode-label').textContent = (sequence.kind === 'wrong' ? '错题重练' : '重新练习') + ' · ' + (position + 1) + '/' + ids.length + ' · 本轮已答 ' + revealed.size;
    const stats = P.stats(session.data.answers, bank);
    $('done').textContent = stats.done.toLocaleString();
    $('done-label').textContent = '已答 / ' + bank.questions.length.toLocaleString();
    $('score').textContent = '首次正确率 ' + (stats.done ? Math.round(stats.correct / stats.done * 100) + '%' : '—');
    $('progress').max = bank.questions.length; $('progress').value = stats.done;
    $('next-unanswered').hidden = stats.done === bank.questions.length;
    $('restart-practice').disabled = false;
    $('jump').disabled = false; $('jump-input').max = bank.questions.length;
    $('jump-range').textContent = '1–' + bank.questions.length;
    $('practice-new').disabled = !latestQuestions.length;
    $('practice-new').textContent = '练习本次新增 ' + latestQuestions.length + ' 题';
    $('bank-note').textContent = '共 ' + bank.questions.length + ' 道练习，含 ' + bank.questions.filter(q => q.supplemental).length + ' 道补充练习；已合并 ' + (bank.rawIds.length - bank.questions.length) + ' 道重复题。补充练习不是官方考题，考前请核对最新本地题库。';
    renderWrong(stats.wrong);
  }
  function renderImage(q, retry = false) {
    if (q.id === imageId && !retry) return;
    clearTimeout(imageTimer); imageId = q.id;
    const img = $('question-image');
    img.onload = null; img.onerror = null; img.removeAttribute('src');
    img.hidden = !q.image; $('image-notice').hidden = !q.image;
    $('retry-image').hidden = true;
    if (!q.image) {imageState = 'none'; return;}
    imageState = 'loading'; img.alt = '本题交通场景或标志配图';
    $('image-message').textContent = '正在加载配图，加载完成后可作答。';
    const id = q.id;
    const settle = ok => {
      if (imageId !== id) return;
      clearTimeout(imageTimer); imageState = ok ? 'ready' : 'error';
      $('image-notice').hidden = ok; $('retry-image').hidden = ok;
      $('image-message').textContent = ok ? '' : '配图加载失败。请重试，或跳过此题后再练习。';
      document.querySelectorAll('.option').forEach(button => {button.disabled = !!displayedAnswer() || !ok;});
    };
    img.onload = () => settle(img.naturalWidth > 0); img.onerror = () => settle(false);
    imageTimer = setTimeout(() => settle(false), 10000);
    img.src = q.image + (retry ? '?retry=' + Date.now() : '');
  }
  function renderWrong(ids) {
    $('wrong-count').textContent = ids.length + ' 题';
    $('wrong-summary-text').textContent = ids.length ? '集中重练，答对后自动移出。' : '答错的题会收在这里，答对后自动移出。';
    $('review-wrong').disabled = !ids.length;
    $('review-wrong').textContent = ids.length ? '开始重练' : '暂时没有错题';
    $('browse-wrong').disabled = !ids.length;
    if ($('wrong-screen').open) renderWrongPanel(ids);
  }
  function renderWrongPanel(ids = P.stats(session.data.answers, bank).wrong) {
    const query = $('wrong-search').value.trim().toLocaleLowerCase();
    const numbers = new Map(bank.questions.map((q, index) => [q.id, index + 1]));
    filteredWrong = ids.filter(id => !query || (/^\d+$/.test(query) ? numbers.get(id) === Number(query) : bank.byId.get(id).question_zh.toLocaleLowerCase().includes(query)));
    const pages = Math.max(1, Math.ceil(filteredWrong.length / 8));
    wrongPage = Math.min(wrongPage, pages - 1);
    const focusedId = $('wrong-list').contains(document.activeElement) ? document.activeElement.dataset.questionId : null;
    const buttons = filteredWrong.slice(wrongPage * 8, wrongPage * 8 + 8).map(id => {
      const button = document.createElement('button'); button.className = 'wrong-item'; button.dataset.questionId = id;
      const number = document.createElement('span'); number.className = 'wrong-question-number'; number.textContent = '第 ' + numbers.get(id) + ' 题';
      const text = document.createElement('span'); text.className = 'wrong-question-text'; text.textContent = bank.byId.get(id).question_zh;
      const arrow = document.createElement('span'); arrow.className = 'wrong-arrow'; arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true');
      button.append(number, text, arrow);
      button.addEventListener('click', () => {
        const queue = [...filteredWrong]; wrongSelection = true; $('wrong-screen').close(); startReview('wrong', queue, id);
      });
      return button;
    });
    if (!buttons.length) {
      const p = document.createElement('p'); p.className = 'wrong-panel-empty';
      p.textContent = ids.length ? '没有找到匹配的错题，试试其他关键词。' : '目前没有待复习的错题，继续练习吧。'; buttons.push(p);
    }
    $('wrong-list').replaceChildren(...buttons);
    $('wrong-list').scrollTop = 0;
    $('wrong-results').textContent = query ? '找到 ' + filteredWrong.length + ' 题 · 共 ' + ids.length + ' 道错题' : '共 ' + ids.length + ' 道待复习';
    $('wrong-pagination').hidden = pages <= 1;
    $('wrong-page').textContent = (wrongPage + 1) + ' / ' + pages;
    $('wrong-prev').disabled = wrongPage === 0; $('wrong-next').disabled = wrongPage >= pages - 1;
    $('review-filtered').disabled = !filteredWrong.length;
    $('review-filtered').textContent = query ? '重练筛选结果' : '重练全部错题';
    if (focusedId) (buttons.find(button => button.dataset?.questionId === focusedId) || $('wrong-search')).focus();
  }
  function openWrongPanel() {
    if (!bank || !session) return;
    wrongReturnFocus = document.activeElement; wrongSelection = false; wrongPage = 0; $('wrong-search').value = '';
    $('wrong-screen').showModal(); document.body.classList.add('modal-open'); renderWrongPanel(); $('wrong-search').focus();
  }
  function choose(choice) {
    const q = current();
    if (displayedAnswer() || (q.image && imageState !== 'ready') || !q.options.some(o => o.label === choice)) return;
    const old = session.data.answers[q.id], now = Date.now();
    const answer = {choice, firstChoice:old?.firstChoice || choice, ok:choice === q.answer,
      updatedAt:now, firstAt:old ? old.firstAt : now, operationId:operationId()};
    session.data.answers[q.id] = answer; session.data.pending[q.id] = answer;
    revealed.add(q.id);
    persist(); scheduleSync(); render();
    $('next').focus({preventScroll:true});
  }
  function startReview(kind, ids, first = ids[0]) {
    if (!ids.length) return;
    sequence = {kind, ids:[...ids]}; revealed = new Set(); navigate(first);
  }
  function nextQuestion(skip = false) {
    if (!skip && !displayedAnswer()) return;
    const ids = sequence?.ids || bank.questions.map(q => q.id);
    const index = ids.indexOf(session.data.currentId);
    if (index + 1 < ids.length) {navigate(ids[index + 1]); return;}
    if (sequence) {
      const remaining = ids.filter(id => !revealed.has(id));
      if (remaining.length) {
        $('practice-message').textContent = '本轮还有 ' + remaining.length + ' 题未答，已返回未答题。';
        const message = $('practice-message').textContent; navigate(remaining[0]); $('practice-message').textContent = message;
      } else {
        sequence = null; revealed.clear(); render(); $('practice-message').textContent = '本轮练习已完成。错题本已按最近作答更新。';
      }
      return;
    }
    const done = P.stats(session.data.answers, bank).done;
    $('practice-message').textContent = done === bank.questions.length ? '已完成全部题目，可以重新练习或复习错题。' : '已到最后一题，还有 ' + (bank.questions.length - done) + ' 题未答。点击“继续未答题”继续。';
  }
  function setMode(mode) {
    if (authBusy) return;
    authMode = mode;
    for (const name of ['login', 'register']) {
      $(name + '-tab').classList.toggle('active', mode === name);
      $(name + '-tab').setAttribute('aria-pressed', String(mode === name));
    }
    $('auth-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    $('auth-password').value = '';
    $('auth-submit').textContent = mode === 'register' ? '创建账号' : '登录';
    $('auth-message').textContent = '';
  }
  function openAuth() {
    if (authUser?.emailVerified) {status('当前账号：' + authUser.email + '；进度会在此账号的设备之间同步。'); return;}
    returnFocus = document.activeElement;
    updateAccount();
    if (!$('auth-screen').open) $('auth-screen').showModal();
    document.body.classList.add('modal-open');
    (authUser ? $('check-verification') : $('auth-email')).focus();
    initFirebase().catch(() => {$('auth-message').textContent = '账号服务暂不可用；可以继续本机练习，稍后再试。';});
  }
  function closeAuth() { if ($('auth-screen').open) $('auth-screen').close(); }
  function authError(error) {
    const errors = {
      'auth/email-already-in-use':'该邮箱已注册，请登录；未验证时可重新发送验证邮件。',
      'auth/invalid-email':'请输入有效的邮箱地址。', 'auth/weak-password':'密码至少需要 6 位。',
      'auth/invalid-credential':'邮箱或密码不正确。', 'auth/invalid-login-credentials':'邮箱或密码不正确。',
      'auth/user-not-found':'邮箱或密码不正确。', 'auth/wrong-password':'邮箱或密码不正确。',
      'auth/too-many-requests':'尝试次数过多，请稍后再试。',
      'auth/network-request-failed':'网络连接失败，请检查网络后重试。',
      'auth/operation-not-allowed':'账号服务暂不可用，请稍后再试。'
    };
    return errors[error?.code] || '账号服务连接失败或超时，请稍后重试。';
  }
  function setAuthBusy(value) {
    authBusy = value;
    for (const id of ['auth-submit','login-tab','register-tab','forgot-password','resend-verification','check-verification','switch-account']) $(id).disabled = value;
    $('auth-form').setAttribute('aria-busy', String(value));
  }
  async function emailVerification(user) {
    if (Date.now() < resendAfter) {
      $('auth-message').textContent = '请稍候 ' + Math.ceil((resendAfter - Date.now()) / 1000) + ' 秒再发送。'; return;
    }
    await deadline(user.sendEmailVerification(), 12000, '发送超时');
    resendAfter = Date.now() + 60000;
    $('auth-message').textContent = '验证邮件已发送，请检查收件箱及垃圾邮件。验证后点击“我已验证，继续登录”。';
  }
  async function submitAuth(event) {
    event.preventDefault();
    if (authBusy || !$('auth-form').reportValidity()) return;
    const email = $('auth-email').value.trim(), password = $('auth-password').value;
    importOnLogin = $('import-guest').checked;
    const mode = authMode;
    setAuthBusy(true); $('auth-message').textContent = '正在连接账号服务…';
    let created = false;
    try {
      await initFirebase();
      if (mode === 'register') {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        created = true;
        updateAccount();
        await emailVerification(result.user);
      } else {
        const result = await auth.signInWithEmailAndPassword(email, password);
        if (!result.user.emailVerified) {
          $('auth-message').textContent = '该邮箱尚未验证。可以重发验证邮件，验证后继续登录。';
          updateAccount();
        }
        // The auth listener exclusively owns profile restoration and cloud loading.
      }
      $('auth-password').value = '';
    } catch (error) {
      $('auth-message').textContent = created ? '账号已创建，但验证邮件发送失败。请点击“重新发送验证邮件”。' : authError(error);
      if (!created && !auth?.currentUser) importOnLogin = false;
    } finally {setAuthBusy(false);}
  }
  async function logout() {
    if (!auth) return;
    persist(); importOnLogin = false;
    // A pending cloud transaction must never prevent local sign-out.
    const result = auth.signOut();
    await activate(null);
    $('auth-email').value = ''; $('auth-password').value = '';
    closeAuth();
    try {await deadline(result, 5000, '退出超时');}
    catch (_) {
      authUser = auth.currentUser; updateAccount();
      status('账号退出未完成，请再次点击退出。进度已保留在本机。', true);
    }
  }
  function loadScript(name) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {script.remove(); reject(new Error('账号服务加载超时'));}, 8000);
      script.src = 'https://www.gstatic.com/firebasejs/10.13.0/' + name + '-compat.js';
      script.onload = () => {clearTimeout(timer); resolve();};
      script.onerror = () => {clearTimeout(timer); script.remove(); reject(new Error('账号服务加载失败'));};
      document.head.append(script);
    });
  }
  async function initFirebase() {
    if (auth) return;
    if (authInit) return authInit;
    authInit = (async () => {
      if (!window.firebase) await loadScript('firebase-app');
      if (!firebase.auth) await loadScript('firebase-auth');
      if (!firebase.firestore) await loadScript('firebase-firestore');
      if (!firebase.apps?.length) firebase.initializeApp(CONFIG);
      auth = firebase.auth(); db = firebase.firestore();
      auth.onAuthStateChanged(user => {activate(user).catch(() => status('账号状态加载失败，请重试同步。', true, true));}, () => {
        status('账号状态暂不可用；进度保存在本机。', true, true);
      });
    })();
    try {await authInit;}
    catch (error) {authInit = null; throw error;}
  }
  async function loadBank() {
    if (bankLoading) return;
    bankLoading = true; $('retry-bank').hidden = true;
    try {
      const raw = await deadline((async () => {
        const response = await fetch('data/questions.json?v=20260920-reviewed73', {cache:'no-cache'});
        if (!response.ok) throw new Error('题库不可用');
        return response.json();
      })(), 12000, '题库加载超时');
      bank = P.prepareBank(raw);
      const latestBatch = [...bank.questions].reverse().find(q => q.batchId)?.batchId;
      latestQuestions = bank.questions.filter(q => latestBatch ? q.batchId === latestBatch : q.supplemental);
      if (!session) session = makeSession('guest', null);
      persist(); render(); status('游客进度保存在本机 · 登录后可同步');
      resolveBank();
    } catch (_) {
      $('question').textContent = '题库加载失败';
      $('total').textContent = '请重试加载题库';
      $('retry-bank').hidden = false;
      status('暂时无法加载题库，请检查网络后重试。', true);
    } finally {bankLoading = false;}
  }
  $('account-button').addEventListener('click', openAuth);
  $('auth-close').addEventListener('click', closeAuth);
  $('auth-screen').addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    returnFocus?.focus?.();
  });
  $('auth-screen').addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...$('auth-screen').querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
  });
  $('login-tab').addEventListener('click', () => setMode('login'));
  $('register-tab').addEventListener('click', () => setMode('register'));
  $('auth-form').addEventListener('submit', submitAuth);
  $('logout').addEventListener('click', logout);
  $('switch-account').addEventListener('click', logout);
  $('forgot-password').addEventListener('click', async () => {
    if (authBusy) return;
    if (!$('auth-email').reportValidity()) return;
    setAuthBusy(true); $('auth-message').textContent = '正在发送重置邮件…';
    try {await initFirebase(); await deadline(auth.sendPasswordResetEmail($('auth-email').value.trim()), 12000, '发送超时'); $('auth-message').textContent = '若该邮箱已注册，将收到密码重置邮件，请检查收件箱及垃圾邮件。';}
    catch (error) {$('auth-message').textContent = authError(error);}
    finally {setAuthBusy(false);}
  });
  $('resend-verification').addEventListener('click', async () => {
    if (authBusy || !auth?.currentUser) return;
    setAuthBusy(true);
    try {await emailVerification(auth.currentUser);}
    catch (error) {$('auth-message').textContent = authError(error) + '可稍后重新发送。';}
    finally {setAuthBusy(false);}
  });
  $('check-verification').addEventListener('click', async () => {
    if (authBusy || !auth?.currentUser) return;
    setAuthBusy(true);
    try {
      await deadline(auth.currentUser.reload(), 10000, '验证状态读取超时');
      if (!auth.currentUser.emailVerified) {$('auth-message').textContent = '尚未检测到验证，请打开邮件里的链接后重试。'; return;}
      await deadline(auth.currentUser.getIdToken(true), 10000, '验证状态刷新超时');
      await activate(auth.currentUser);
    } catch (error) {$('auth-message').textContent = authError(error);}
    finally {setAuthBusy(false);}
  });
  $('next').addEventListener('click', () => nextQuestion());
  $('skip').addEventListener('click', () => nextQuestion(true));
  $('prev').addEventListener('click', () => {
    const ids = sequence?.ids || bank.questions.map(q => q.id);
    const index = ids.indexOf(session.data.currentId);
    if (index > 0) navigate(ids[index - 1]);
  });
  $('jump-form').addEventListener('submit', event => {
    event.preventDefault(); if (!bank) return;
    const index = P.questionIndex($('jump-input').value, bank.questions.length);
    if (index === null) {
      $('jump-error').textContent = '请输入 1–' + bank.questions.length + ' 之间的整数题号。';
      $('jump-input').setAttribute('aria-invalid', 'true'); return;
    }
    $('jump-error').textContent = ''; $('jump-input').removeAttribute('aria-invalid'); $('jump-input').value = '';
    sequence = null; revealed.clear(); navigate(bank.questions[index].id);
  });
  $('next-unanswered').addEventListener('click', () => {
    const q = bank.questions.find(q => !session.data.answers[q.id]);
    if (q) {sequence = null; revealed.clear(); navigate(q.id);}
  });
  $('practice-new').addEventListener('click', () => {
    const q = latestQuestions[0];
    if (q) {sequence = null; revealed.clear(); navigate(q.id);}
  });
  $('review-wrong').addEventListener('click', () => startReview('wrong', P.stats(session.data.answers, bank).wrong));
  $('redo-question').addEventListener('click', () => startReview('all', [session.data.currentId]));
  $('restart-practice').addEventListener('click', () => startReview('all', bank.questions.map(q => q.id)));
  $('exit-review').addEventListener('click', () => {sequence = null; revealed.clear(); render();});
  $('wrong-prev').addEventListener('click', () => {wrongPage = Math.max(0, wrongPage - 1); renderWrongPanel();});
  $('wrong-next').addEventListener('click', () => {wrongPage++; renderWrongPanel();});
  $('browse-wrong').addEventListener('click', openWrongPanel);
  $('wrong-close').addEventListener('click', () => $('wrong-screen').close());
  $('wrong-search').addEventListener('input', () => {wrongPage = 0; renderWrongPanel();});
  $('review-filtered').addEventListener('click', () => {
    if (!filteredWrong.length) return;
    const queue = [...filteredWrong]; wrongSelection = true; $('wrong-screen').close(); startReview('wrong', queue);
  });
  $('wrong-screen').addEventListener('close', () => {
    document.body.classList.toggle('modal-open', $('auth-screen').open);
    if (!wrongSelection) (wrongReturnFocus?.disabled ? $('question') : wrongReturnFocus)?.focus?.({preventScroll:true});
    wrongSelection = false; $('wrong-list').replaceChildren();
  });
  $('wrong-screen').addEventListener('keydown', event => {
    if (event.key === 'Escape') {event.preventDefault(); $('wrong-screen').close(); return;}
    if (event.key !== 'Tab') return;
    const items = [...$('wrong-screen').querySelectorAll('button:not(:disabled),input')].filter(el => el.getClientRects().length);
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
  });
  $('retry-image').addEventListener('click', () => {renderImage(current(), true); render();});
  $('retry-bank').addEventListener('click', loadBank);
  $('retry-sync').addEventListener('click', async () => {
    if (session?.uid) {
      if (!session.ready) await connectCloud(session);
      else await sync(session);
    } else {
      try {await initFirebase(); if (auth?.currentUser) await activate(auth.currentUser); else status('游客进度保存在本机 · 登录后可同步');}
      catch (_) {status('账号服务暂不可用；可以继续本机练习。', true, true);}
    }
  });
  $('export-progress').addEventListener('click', () => {
    if (!session) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(session.data, null, 2)], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'ke1-progress-' + new Date().toISOString().slice(0,10) + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener('online', () => {
    if (session?.uid) {if (session.ready) scheduleSync(0); else connectCloud(session);}
    else initFirebase().catch(() => {});
  });
  window.addEventListener('offline', () => status('当前离线，已载入题目可以继续练习；进度保存在本机。'));
  window.addEventListener('pagehide', () => persist());
  window.addEventListener('storage', event => {
    if (!bank || !session || event.key !== PREFIX + session.key || !event.newValue) return;
    try {
      const other = P.normalize(JSON.parse(event.newValue), bank);
      session.data.answers = P.mergeAnswers(session.data.answers, other.answers);
      session.data.pending = P.mergeAnswers(session.data.pending, other.pending);
      // A sibling tab can acknowledge the same operation after a successful upload.
      for (const [id, entry] of Object.entries(session.data.pending)) {
        if (!other.pending[id] && entry.operationId && other.answers[id]?.operationId === entry.operationId && other.answers[id]?.updatedAt === entry.updatedAt) delete session.data.pending[id];
      }
      render(); if (session.uid && hasPending(session)) scheduleSync();
    } catch (_) { /* Ignore malformed data without replacing the working copy. */ }
  });
  loadBank();
  initFirebase().catch(() => {
    if (bank && !authUser) status('账号服务暂不可用；进度仍保存在本机，可继续练习。', false, true);
  });
})();
