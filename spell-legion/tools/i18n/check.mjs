// Drive the game in each language: menus, a solo run with cards, boss, pause, stats, results, a duel.
// Saves screenshots and every string that fell back to English (I18N.miss).
// usage: node check.mjs <url> <outdir> [locs]
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const [url, out, locsArg] = process.argv.slice(2);
const locs = (locsArg || 'zh,zt,en,ja,ko').split(',');
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 600000,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const report = {};
for (const loc of locs) {
  for (const vp of [{ name: 'desk', width: +(process.env.W || 1280), height: +(process.env.H || 720) }, { name: 'phone', width: 844, height: 390, isMobile: true, hasTouch: true }]) {
    if (vp.name === 'phone' && process.env.NOPHONE) continue;
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)) });
    await page.setRequestInterception(true);
    page.on('request', r => { const u = r.url(); if (/googleapis|gstatic|firebase|google\.com|script\.google|country\.is|geojs/.test(u)) r.abort(); else r.continue() });
    await page.evaluateOnNewDocument(() => { if (window.__slow) return; window.__slow = 1; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => setTimeout(() => raf(f), +(localStorage.getItem('__raf') || 0)) });
    if (process.env.SLOWRAF) await page.evaluateOnNewDocument(v => localStorage.setItem('__raf', v), process.env.SLOWRAF);
    await page.evaluateOnNewDocument(l => { try { localStorage.setItem('sl_lang', l); localStorage.setItem('sl_tutorial', '1') } catch (_) {} }, loc);
    await page.goto(url, { waitUntil: 'load' });
    await sleep(3500);
    const shot = async n => { if (process.env.NOSHOT && !/1menu|5cards|10end/.test(n)) return; await page.screenshot({ path: `${out}/${loc}-${vp.name}-${n}.png` }) };
    const ev = async (f, ...a) => { try { return await page.evaluate(f, ...a) } catch (e) { errs.push('harness: ' + String(e).slice(0, 160)) } };
    await shot('1menu');
    if (vp.name === 'desk') {
      for (const t of ['road', 'ach', 'settings']) { await ev(t => showTab(t), t); await sleep(400); await shot('2tab-' + t) }
      await ev(() => showTab(''));
      await ev(() => { try { renderCodex(); showScreen('codex') } catch (e) {} }); await sleep(400); await shot('3codex');
      await ev(() => { try { showScreen('menu') } catch (e) {} });
      await ev(() => { const b = document.querySelector('.leaderboard,#lbbtn,[data-t=lb]'); b && b.click() }); await sleep(300);
    }
    // solo run
    await ev(() => { SAVE.mode = 'solo'; startRun() }); await sleep(1500); await shot('4run');
    await ev(() => { gainXP(xpNeed(G.lv) * 1.05) }); await sleep(700); await shot('5cards');
    for (let i = 0; i < 14; i++) { await ev(() => { if (G.pick) choose(0); gainXP(xpNeed(G.lv) * 1.05) }); await sleep(120) }
    await ev(() => { if (G.pick) choose(0) });
    await sleep(300); await shot('6cards-late');
    await ev(() => { while (G.pick) choose(0); G.t = Math.max(G.t, 238) }); await sleep(3500); await shot('7boss');
    await ev(() => { while (G.pick) choose(0); togglePanel() }); await sleep(500); await shot('8stats');
    await ev(() => togglePanel()); await sleep(200);
    await ev(() => togglePause()); await sleep(400); await shot('9pause');
    await ev(() => togglePause());
    await ev(() => { G.P.hp = 0; lose() }); await sleep(1500); await ev(() => { if ($('#end') && $('#end').hidden !== false) try { showEnd(false) } catch (e) {} }); await sleep(1200); await shot('10end');
    // duel vs AI
    await ev(() => { try { toLobby() } catch (e) {} SAVE.mode = 'qpk'; startRun() }); await sleep(2000);
    await ev(() => { while (G.pick) choose(0) }); await shot('11duel');
    await ev(() => { G.t = (G.dur || 180) - 1 }); await sleep(3000); await ev(() => { try { pkEnd() } catch (e) {} }); await sleep(1500); await shot('12duelend');
    // room panel
    await ev(() => { try { toLobby() } catch (e) {} SAVE.mode = 'room'; renderTitle() }); await sleep(800); await shot('13room');
    const miss = await ev(() => [...I18N.miss]);
    report[`${loc}-${vp.name}`] = { miss: miss || [], errs };
    await page.close();
  }
}
await browser.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const k in report) console.log(k, 'missing', report[k].miss.length, 'errors', report[k].errs.length, report[k].errs.slice(0, 4).join(' | '));
