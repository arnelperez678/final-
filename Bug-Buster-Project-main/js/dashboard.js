/* Admin dashboard: live account and learning overview. */
(() => {
  'use strict';
  const PG = window.PG;
  if (!PG) return;
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => new Intl.NumberFormat().format(Number(n || 0));
  let data = null;
  let loading = false;
  let heartbeatTimer = 0;

  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function renderLevels() {
    const host = $('per-level');
    if (!host || !data) return;
    const chapter = $('filter-chapter')?.value || 'all';
    const levels = data.per_lesson.filter((item) => chapter === 'all' || String(item.chapter_id) === chapter);
    host.replaceChildren();
    if (!levels.length) { host.appendChild(PG.el('p', 'empty', 'No levels match this chapter.')); return; }
    const max = Math.max(1, ...levels.map((item) => item.done));
    levels.forEach((item) => {
      const row = PG.el('div', 'bar-item');
      const label = PG.el('div', 'bar-label');
      label.append(PG.el('span', null, item.title), PG.el('span', null, `${fmt(item.done)} ${item.done === 1 ? 'completion' : 'completions'}`));
      const track = PG.el('div', 'bar-track');
      const fill = PG.el('div', 'bar-fill');
      fill.style.width = `${(item.done / max) * 100}%`;
      track.appendChild(fill); row.append(label, track); host.appendChild(row);
    });
  }
  function renderActivity() {
    const host = $('recent-activity');
    if (!host || !data) return;
    const type = $('filter-activity')?.value || 'all';
    const rows = data.activity.filter((item) => type === 'all' || item.type === type);
    host.replaceChildren();
    if (!rows.length) { host.appendChild(PG.el('li', 'empty', 'No recent activity.')); return; }
    rows.forEach((item) => {
      const li = PG.el('li', 'activity-item');
      li.append(document.createTextNode(item.message), PG.el('div', 'activity-time', new Date(item.created_at).toLocaleString()));
      host.appendChild(li);
    });
  }
  function drawChart() {
    const canvas = $('growth-canvas');
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.parentElement.clientWidth || 600;
    const height = 160;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio; canvas.height = height * ratio;
    canvas.style.width = '100%'; canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    const max = Math.max(1, ...data.weekly.flatMap((d) => [d.signups, d.completions]));
    const slot = width / Math.max(1, data.weekly.length); const bar = Math.min(18, slot * 0.28);
    data.weekly.forEach((d, i) => {
      const x = i * slot + slot / 2;
      [[d.signups, '#24865f', -bar], [d.completions, '#e9a43b', 1]].forEach(([value, color, offset]) => {
        const h = (value / max) * 110; ctx.fillStyle = color; ctx.fillRect(x + offset, 125 - h, bar, Math.max(2, h));
      });
      ctx.fillStyle = '#55716a'; ctx.font = '11px Nunito, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(new Date(`${d.date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }), x, 151);
    });
  }
  function render() {
    const weeklyDone = data.weekly.reduce((sum, d) => sum + d.completions, 0);
    setText('val-users', fmt(data.users)); setText('change-users', `${fmt(data.new_users_7d)} new this week`);
    setText('val-plays', fmt(weeklyDone)); setText('change-plays', 'Level completions in the last 7 days');
    setText('val-seeds', fmt(data.seeds_held)); setText('change-seeds', 'Combined gardener balance');
    setText('val-completions', fmt(data.completions)); setText('change-completions', `${fmt(data.active_30d)} active in 30 days`);
    setText('val-active', fmt(data.online_now)); setText('val-rate', `${data.completion_rate}%`);
    setText('val-new-users', fmt(data.new_users_7d)); setText('val-active-month', fmt(data.active_30d)); setText('val-suspended', fmt(data.suspended));
    const chapter = $('filter-chapter');
    if (chapter) {
      const selected = chapter.value; chapter.replaceChildren(new Option('All Chapters', 'all'));
      data.chapters.forEach((c) => chapter.add(new Option(c.title, String(c.id))));
      chapter.value = [...chapter.options].some((o) => o.value === selected) ? selected : 'all';
    }
    renderLevels(); renderActivity(); drawChart();
    const alerts = [];
    if (data.suspended) alerts.push(`${fmt(data.suspended)} suspended account${data.suspended === 1 ? '' : 's'} need review.`);
    if (!data.published_lessons) alerts.push('No levels are published for learners.');
    if (!alerts.length) alerts.push('Everything looks good. Dashboard data is up to date.');
    const list = $('system-alerts'); list.replaceChildren(...alerts.map((message) => PG.el('li', 'alert-item', message)));
    setText('alert-count', String(alerts.length));
  }
  async function heartbeat() { try { await PG.api('/api/heartbeat.php', { body: {} }); } catch (_) { /* Presence is best effort. */ } }
  async function load() {
    if (loading) return;
    loading = true;
    const buttons = [$('btn-refresh'), $('btn-sync')]; buttons.forEach((b) => { if (b) b.disabled = true; });
    setText('server-status', 'Syncing…');
    try {
      const me = await PG.api('/api/me.php');
      if (me.role !== 'admin') { location.replace('/adventure.html'); return; }
      await heartbeat();
      if (!heartbeatTimer) heartbeatTimer = window.setInterval(heartbeat, 30000);
      data = await PG.api('/api/admin/stats.php'); render();
      setText('server-status', 'Connected'); setText('last-sync', new Date().toLocaleTimeString());
    } catch (error) { setText('server-status', 'Unavailable'); PG.toast(error.message, true); }
    finally { loading = false; buttons.forEach((b) => { if (b) b.disabled = false; }); }
  }
  $('filter-chapter')?.addEventListener('change', renderLevels);
  $('filter-activity')?.addEventListener('change', renderActivity);
  $('btn-refresh')?.addEventListener('click', load); $('btn-sync')?.addEventListener('click', load);
  $('btn-clear-cache')?.addEventListener('click', () => { if ($('filter-chapter')) $('filter-chapter').value = 'all'; if ($('filter-activity')) $('filter-activity').value = 'all'; data ? render() : load(); });
  $('btn-logout')?.addEventListener('click', async (event) => { event.preventDefault(); try { await PG.api('/api/logout.php', { method: 'POST', body: {}, noRedirect: true }); } catch (_) {} location.href = '/login.html'; });
  setText('current-date', new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  $('growth-canvas')?.setAttribute('aria-label', 'Weekly chart of gardener signups and level completions');
  load();
})();
