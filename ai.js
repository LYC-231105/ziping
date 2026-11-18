/* AI 批盘面板。
   两种工作方式，打开页面时自动判断：
   1) 托管模式（推荐，所有人开箱可用）：本站服务端配置了模型密钥，
      浏览器只调同源的 /api/ai/chat，密钥不下发、不需要任何设置。
      手机、电脑、别人转发链接打开，都能直接用。
   2) 自备密钥模式：页面没有后端（例如直接双击 index.html、或部署在纯静态托管），
      由使用者自己填 Base URL 与密钥，请求从浏览器直发。

   红线：生死寿元、重大疾病、子女数量与堕胎、投资标的、诉讼胜负、他人隐私，一律拒答。 */
(function (root) {
  'use strict';
  const KEY = 'ziping.ai';
  const MODE_KEY = 'ziping.ai.mode';
  const TOKEN_KEY = 'ziping.ai.token';
  /* 界面上只出现「模型」一个选项；真实模型名分两种来源：
     - 走本站托管：由服务端 ai.config.json 的 models 表决定，浏览器只发短 id；
     - 自备密钥直连：用这里登记的默认名，也可以在上面的「模型名」里覆盖。 */
  const PROVIDERS = {
    gpt: { label: 'GPT', model: 'gpt_6.2sol' },
  };
  const DEFAULTS = { baseUrl: 'https://api.kodechicken.top/v1', key: '', provider: 'gpt', modelName: '' };
  const read = () => {
    let v;
    try {
      v = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
    } catch {
      v = { ...DEFAULTS };
    }
    if (!v.provider || typeof v.provider !== 'string') v.provider = DEFAULTS.provider;
    return v;
  };
  const write = (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* 探测结果缓存：{ hosted, configured, model, needsToken, limits } */
  const S = { status: null, probing: false, chart: null, busy: false };

  const SYSTEM = `你是一位严谨的子平八字研习顾问，服务于一个排盘网站。规则：
1) 只依据用户给出的命盘数据（四柱、十神、藏干、旺衰分数、格局、喜忌、大运流年）解读，不得自行编造干支或改盘；
2) 先说结论，再说依据，依据要能指回具体某柱、某字；
3) 不要给生死寿元、重大疾病诊断、子女数量/堕胎、股票具体标的、诉讼胜负、他人隐私的结论，遇到就说明不在此范围内；
4) 不用"一定、必然、肯定"这类绝对断言，用"倾向于、可以理解为、建议观察"；
5) 涉及金额、职位、婚期这类算不出来的事，直接说算不出来，只给观察方向；
6) 中文回答，短句，说人话；不确定的地方要标"存疑"。
7) 结尾给一句可证伪的观察点：明年之内，看哪一件事发生与否，就能验证这次判断。`;

  function brief(c) {
    if (!c) return '';
    const X = root.ZipingExtra;
    const D = root.ZipingDeep;
    const ys = D ? D.yongshen(c) : null;
    const sc = X.strengthScore(c);
    const gj = X.geju(c);
    const ss = X.shensha(c).map((r) => r.name + '(' + r.found.map((f) => f.pos).join('/') + ')');
    const rows = c.details.map(
      (p, i) => `${['年', '月', '日', '时'][i]}柱 ${p.stem}${p.branch}（${i === 2 ? '日主' : p.god}）藏 ${p.hidden.map((h) => h.stem + h.god).join('、')}`
    );
    const luck = c.luck.rows
      .slice(0, 8)
      .map((r) => `${r.number || ''}${r.pillar}（${r.year}起，${r.age}岁）`)
      .join('、');
    return [
      `称谓：${c.input.name}；${c.input.gender === 'male' ? '乾造（男）' : '坤造（女）'}`,
      `出生：${c.civil}（${c.input.place}，${c.input.timezone}，${c.input.clock === 'civil' ? '钟表时' : c.input.clock === 'mean' ? '平太阳时' : '真太阳时'}）`,
      `四柱：${c.pillars.join(' ')}`,
      rows.join('；'),
      `旺衰：得令 ${sc.items[0].score}/40、得地 ${sc.items[1].score}/35、得势 ${sc.items[2].score}/25，合计 ${sc.total}（${sc.grade}）`,
      ys ? `判定：${ys.level}；喜 ${ys.favorGods}；忌 ${ys.avoidGods}；${ys.elements}；调候 ${ys.climate}` : '',
      `格局：${gj.primary.name}（${gj.primary.condition}）`,
      `神煞：${ss.join('、') || '本页表未命中'}`,
      `大运：${luck}`,
      `起运：出生后 ${c.luck.years} 年 ${c.luck.months} 月 ${c.luck.days} 天 ${c.luck.hours} 时，${c.luck.forward ? '顺行' : '逆行'}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /* ---------- 模式判定 ---------- */
  function hosted() {
    return Boolean(S.status && S.status.hosted && S.status.configured);
  }
  function ownMode() {
    try {
      return localStorage.getItem(MODE_KEY) === 'own';
    } catch {
      return false;
    }
  }
  function useHosted() {
    return hosted() && !ownMode();
  }
  function token() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  /* ---------- 模型选项 ---------- */
  function optionList() {
    const st = S.status;
    if (useHosted() && st && Array.isArray(st.options) && st.options.length) return st.options;
    return Object.keys(PROVIDERS).map((id) => ({ id, label: PROVIDERS[id].label }));
  }
  function currentProvider() {
    const opts = optionList();
    const want = read().provider;
    if (opts.some((o) => o.id === want)) return want;
    const st = S.status;
    if (useHosted() && st && st.defaultModel && opts.some((o) => o.id === st.defaultModel)) return st.defaultModel;
    return opts.length ? opts[0].id : 'gpt';
  }
  function modelNote() {
    if (useHosted()) return '本站托管，密钥留在服务端';
    const p = PROVIDERS[currentProvider()];
    return p ? `自备密钥：默认模型名 ${p.model}` : '自备密钥：模型名按你填的接口来';
  }
  function modelRowInner() {
    const opts = optionList();
    const cur = currentProvider();
    if (opts.length < 2) {
      const only = opts[0];
      return `<span class="ai-model-label">模型</span><span class="ai-model-only">${esc(only ? only.label : '未配置')}</span><span class="micro-note ai-model-note" id="ai-model-note">${esc(modelNote())}</span>`;
    }
    return `<span class="ai-model-label">模型</span><div class="segmented" role="group" aria-label="选择模型">${opts
      .map((o) => `<button type="button" data-ai-model="${esc(o.id)}" class="${o.id === cur ? 'selected' : ''}" aria-pressed="${o.id === cur}">${esc(o.label)}</button>`)
      .join('')}</div><span class="micro-note ai-model-note" id="ai-model-note">${esc(modelNote())}</span>`;
  }
  function modelRowHTML() {
    return `<div class="ai-model" id="ai-model-row">${modelRowInner()}</div>`;
  }

  function probe(force) {
    if (S.probing) return S.probing;
    if (S.status && !force) return Promise.resolve(S.status);
    S.probing = fetch('/api/ai/status', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { hosted: true, configured: false, hint: '服务端状态读取失败（' + r.status + '）。' }))
      .catch(() => ({ hosted: false, configured: false, reason: 'network' }))
      .then(async (j) => {
        S.status = j;
        S.probing = false;
        // 配了口令就先拿本机记住的口令去核一次：对就直开，不对就停在门禁上
        S.verified = j && j.configured && j.needsToken ? await verify() : true;
        paint();
        return j;
      });
    return S.probing;
  }

  /* ---------- 面板 ---------- */
  function modeBadge() {
    if (!S.status) return '<span class="ai-badge wait">正在检查可用模型…</span>';
    if (locked()) return '<span class="ai-badge wait">要口令</span>';
    if (useHosted()) {
      const opt = optionList().find((o) => o.id === currentProvider());
      return `<span class="ai-badge ok">本站已托管 · ${esc(opt ? opt.label : S.status.model || '模型')}</span>`;
    }
    if (hosted()) return '<span class="ai-badge own">已切换为自备密钥</span>';
    if (S.status.hosted) return '<span class="ai-badge wait">本站尚未配置模型</span>';
    return '<span class="ai-badge own">离线/静态页面 · 需自备密钥</span>';
  }

  function quotaLine() {
    const lim = S.status && S.status.limits;
    if (!useHosted() || !lim) return '';
    return `<span class="ai-quota">每人每分钟 ${lim.perMinute} 次 · 每天 ${lim.daily} 次</span>`;
  }

  function entryHint() {
    if (!S.status) return '正在检查本站可用的模型…';
    if (locked()) return '这一页的 AI 加了口令：输对一次就能提问，之后这台设备记住。';
    if (useHosted()) return `本站已托管模型（${S.status.model || '默认'}），不用填任何东西，直接问就行。它读的是这张盘的结构数据。`;
    if (hosted()) return '你已切换为自备密钥模式，提问会从本机直发你填的接口。';
    if (S.status.hosted) return '还没接上模型。点进去填一次你自己的密钥就能用，密钥只存在这台设备的浏览器里，换设备要重填。';
    return '这个页面没有后端，需要你自备一个 OpenAI 兼容接口的地址与密钥，填一次就记住。';
  }

  function entryHTML() {
    return `<section class="card ai-entry" id="ai-entry"><div class="ai-entry-in">
      <div class="ai-entry-main">
        <span class="ai-entry-tag">AI · 就这张盘提问</span>
        <h3>看完判断，还想追问？</h3>
        <p id="ai-entry-hint">${esc(entryHint())}</p>
      </div>
      <a class="button primary" href="#ai">打开 AI 批盘页 →</a>
    </div></section>`;
  }

  /* ---------- 口令门禁 ----------
     口令真伪由服务端 ai.config.json 的 shareToken 决定，浏览器只负责记住它。
     拦的是接口不是页面：没带对口令时 /api/ai/chat、/api/ai/models、/api/ai/verify 一律 401，
     密钥和模型名都用不上；页面这层只负责别让人白点。 */
  function locked() {
    return Boolean(S.status && S.status.configured && S.status.needsToken && !S.verified);
  }
  function lockState() {
    if (!S.status) return 'checking';
    return locked() ? 'locked' : 'open';
  }

  async function verify() {
    if (!S.status) return false;
    if (!S.status.configured) return false;
    if (!S.status.needsToken) {
      S.verified = true;
      return true;
    }
    const tk = token();
    if (!tk) {
      S.verified = false;
      return false;
    }
    try {
      const r = await fetch('/api/ai/verify', { headers: { 'X-Ziping-Token': tk }, cache: 'no-store' });
      let j = {};
      try {
        j = await r.json();
      } catch {}
      S.verified = r.ok && j.ok === true;
      S.verifyNote = S.verified ? '' : j.error || '口令不对。';
      return S.verified;
    } catch {
      S.verified = false;
      S.verifyNote = '连不上本站服务，检查窗口里的 node 是否还在跑。';
      return false;
    }
  }

  function gateInner() {
    return `<div class="ai-gate">
      <span class="ai-gate-tag">LOCKED · 需要口令</span>
      <h3>这页的 AI 要口令才能用</h3>
      <p>口令由站长给。输对一次就记在这台设备上，下次打开不用再输；换设备、或者站长换了口令，要重来。</p>
      <form class="ai-gate-form" id="ai-gate-form" novalidate>
        <label for="ai-pass">口令<input id="ai-pass" type="password" autocomplete="current-password" placeholder="输入口令"></label>
        <button class="button primary" type="submit">进入 →</button>
      </form>
      <p class="ai-state" id="ai-gate-state" aria-live="polite"></p>
      <p class="micro-note">口令只发给本站服务换一次调用，不写进网址、不下发到别的地方。输错太多次会被临时锁住，等几分钟再试。</p>
      </div>`;
  }

  function chatInner(c) {
    const s = read();
    const hm = useHosted();
    const cur = currentProvider();
    const lead = hm
      ? `这台设备不用做任何配置：本站服务端已经接好模型，你排完盘直接提问即可。密钥留在服务端，不会下发到浏览器；请求只带<b>这张盘的结构数据</b>（四柱、藏干、分数、喜忌、大运），不带你的浏览记录。`
      : `这个页面没有可用的托管模型，需要你自备一个 OpenAI 兼容接口：填地址与密钥，请求从你的浏览器直接发往你填的那个地址，不经过本站。`;
    return `<p class="ai-lead" id="ai-lead">${lead}</p><p class="ai-state" id="ai-status" aria-live="polite"></p>
    ${modelRowHTML()}
    <details class="ai-settings" id="ai-settings"${hm ? '' : ' open'}><summary>${hm ? '改用我自己的密钥（可选）' : '接口设置'}</summary>
      <div class="ai-grid">
        <label><span>Base URL</span><input data-ai="baseUrl" value="${esc(s.baseUrl)}" placeholder="https://api.kodechicken.top/v1" autocomplete="off" spellcheck="false"></label>
        <label><span>模型名（可留空）</span><input data-ai="modelName" value="${esc(s.modelName)}" placeholder="${esc((PROVIDERS[cur] && PROVIDERS[cur].model) || '按接口文档填')}" autocomplete="off" spellcheck="false"></label>
        <label><span>密钥</span><input data-ai="key" type="password" value="${esc(s.key)}" placeholder="sk-..." autocomplete="off"></label>
      </div>
      <div class="ai-actions"><button class="button small" data-ai-save>保存设置</button><button class="button small" data-ai-test>测试连接</button><button class="button small" data-ai-models>拉取模型列表</button>${hosted() ? `<button class="button small" data-ai-mode="${hm ? 'own' : 'hosted'}">${hm ? '改用我的密钥' : '回退到本站托管'}</button>` : ''}<span class="micro-note" id="ai-status-in"></span></div>
      <p class="micro-note">兼容 OpenAI 的 <code>/chat/completions</code> 格式即可，Base URL 填到 <code>/v1</code> 为止。自备模式下密钥以明文存在本机 localStorage，公用电脑用完请清空；本站托管的密钥不经过浏览器。</p>
    </details>
    <div class="ai-ask"><label for="ai-input">问它什么？</label><textarea id="ai-input" rows="3" placeholder="例：按这张盘，我 2027 年换工作合适吗？重点看哪一层？">${esc(c ? '请按这张盘，先给一段完整批盘（强弱、喜忌、格局、六亲、事业财运婚恋、当前大运与未来三年），再指出最不确定的两处。' : '')}</textarea><div class="ai-actions"><button class="button primary" data-ai-send ${c ? '' : 'disabled'}>让 AI 批这张盘 →</button><button class="button small" data-ai-clear>清空输出</button><span class="micro-note" id="ai-quota">${quotaLine()}</span></div></div>
    <div class="ai-out" id="ai-out" aria-live="polite"></div>
    <p class="micro-note">AI 的输出可能与本站判读不一致——不一致时以可复核的盘面事实为准。命理只作参考，不替代医疗、法律、投资建议。</p>`;
  }

  function bodyInner(c) {
    const st = lockState();
    if (st === 'checking') return '<p class="ai-thinking">正在检查这台设备有没有通行口令…</p>';
    if (st === 'locked') return gateInner();
    return chatInner(c);
  }

  function panelHTML(c) {
    if (!S.status) probe();
    S.painted = lockState();
    return `<section class="card ai-card" id="ai-panel"><div class="card-head"><h2 class="card-title">对着这张盘提问</h2><span class="card-kicker" id="ai-mode">${modeBadge()}</span></div><div class="ai-body" id="ai-body">${bodyInner(c)}</div></section>`;
  }

  /* 探测结果回来后只改状态相关的几处，不动输入框内容。
     详批页只有入口卡、没有对话框，所以这里不能因为找不到 #ai-panel 就整段跳过。 */
  function paint() {
    const mode = document.getElementById('ai-mode');
    if (mode) mode.innerHTML = modeBadge();
    const hint = document.getElementById('ai-entry-hint');
    if (hint) hint.textContent = entryHint();
    const card = document.getElementById('ai-panel');
    if (!card) return;
    // 门禁状态一变（检查中 → 要口令 / 对话），整块身子换掉；平时不动，免得吞掉已输入的问题
    if (lockState() !== S.painted) {
      S.painted = lockState();
      const body = document.getElementById('ai-body');
      if (body) body.innerHTML = bodyInner(S.chart);
      return;
    }
    const lead = document.getElementById('ai-lead');
    if (lead) {
      lead.innerHTML = useHosted()
        ? `这台设备不用做任何配置：本站服务端已经接好模型，你排完盘直接提问即可。密钥留在服务端，不会下发到浏览器；请求只带<b>这张盘的结构数据</b>。`
        : hosted()
          ? `已切换为自备密钥：请求从你的浏览器直接发往你填的地址，不再走本站。`
          : `这个页面没有可用的托管模型，需要你自备一个 OpenAI 兼容接口：填地址与密钥，请求从你的浏览器直接发往你填的那个地址，不经过本站。`;
    }
    const q = document.getElementById('ai-quota');
    if (q) q.innerHTML = quotaLine();
    const row = document.getElementById('ai-model-row');
    if (row) row.innerHTML = modelRowInner();
    const det = document.getElementById('ai-settings');
    if (det) {
      det.open = !useHosted();
      const sum = det.querySelector('summary');
      if (sum) sum.textContent = useHosted() ? '改用我自己的密钥（可选）' : '接口设置';
    }
  }

  function gateSay(msg, tone) {
    const el = document.getElementById('ai-gate-state');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ai-state' + (msg ? ' on' : '') + (tone === 'bad' ? ' bad' : '') + (tone === 'ok' ? ' ok' : '');
  }

  async function unlock() {
    const input = document.getElementById('ai-pass');
    const pass = (input && input.value.trim()) || '';
    if (!pass) {
      gateSay('先输入口令', 'bad');
      if (input) input.focus();
      return;
    }
    const btn = document.querySelector('#ai-gate-form button');
    if (btn) btn.disabled = true;
    gateSay('正在核对…');
    try {
      localStorage.setItem(TOKEN_KEY, pass);
    } catch {}
    const ok = await verify();
    if (btn) btn.disabled = false;
    if (ok) {
      S.painted = null;
      paint();
      const ta = document.getElementById('ai-input');
      if (ta) ta.focus();
      return;
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    gateSay(S.verifyNote || '口令不对。', 'bad');
    if (input) {
      input.value = '';
      input.focus();
    }
  }

  /* ---------- 请求 ---------- */
  function parseStream(res, onChunk) {
    if (!res.body || !onChunk) {
      return res.json().then((j) => (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '');
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let full = '';
    return (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n');
        buf = parts.pop();
        for (const line of parts) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            if (j.error) throw new Error(typeof j.error === 'string' ? j.error : '上游报错');
            const d = (j.choices && j.choices[0] && j.choices[0].delta) || {};
            if (d && d.content) {
              full += d.content;
              onChunk(full);
            }
          } catch (err) {
            if (err && err.message && err.message !== 'Unexpected end of JSON input') throw err;
          }
        }
      }
      return full;
    })();
  }

  async function callHosted(messages, onChunk, provider) {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token() ? { 'X-Ziping-Token': token() } : {}) },
      // 只发模型短 id，不发温度：温度由服务端统一
      body: JSON.stringify({ messages, provider: provider || currentProvider() }),
    });
    if (!res.ok) {
      let msg = 'HTTP ' + res.status;
      try {
        const j = await res.json();
        msg = j.error || msg;
        if (j.code === 'need-token') msg += '（口令不对或已更换，需重新输入）';
      } catch {}
      if (res.status === 401) {
        // 口令被换了或输错了：忘掉本机这一份，退回门禁重输
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {}
        S.verified = false;
        S.painted = null;
        paint();
      }
      throw new Error(msg);
    }
    return parseStream(res, onChunk);
  }

  async function callDirect(messages, onChunk, cfg) {
    const base = String(cfg.baseUrl || '').replace(/\/+$/, '');
    if (!base) throw new Error('先填 Base URL');
    if (!cfg.key) throw new Error('先填密钥');
    const model = String(cfg.modelName || '').trim() || (PROVIDERS[cfg.provider] && PROVIDERS[cfg.provider].model) || 'gpt_6.2sol';
    let res;
    try {
      res = await fetch(base + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
        body: JSON.stringify({ model, messages, stream: true }),
      });
    } catch (err) {
      if (location.protocol.startsWith('http'))
        throw new Error(
          '浏览器直连被拦下了（当前页面由服务端提供，安全策略只允许同源请求）。两种办法：让站长在服务端配好密钥走托管；或按「AI部署说明.md」部署后再用。'
        );
      throw new Error('连不上这个地址：' + (err.message || ''));
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error('接口返回 ' + res.status + '：' + (t || res.statusText).slice(0, 300));
    }
    return parseStream(res, onChunk);
  }

  function status(msg, tone) {
    const color = tone === 'bad' ? '#96442f' : tone === 'ok' ? '#4f6d33' : '#9a8f76';
    ['ai-status', 'ai-status-in'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = msg;
      el.style.color = color;
    });
    const bar = document.getElementById('ai-status');
    if (bar) bar.className = 'ai-state' + (msg ? ' on' : '') + (tone === 'bad' ? ' bad' : '') + (tone === 'ok' ? ' ok' : '');
  }

  /* 点「测试」「发送」时直接读输入框现值，省掉必须先按保存这一步 */
  function liveCfg(cfg) {
    const v = (k) => {
      const el = document.querySelector('[data-ai="' + k + '"]');
      return el ? el.value.trim() : '';
    };
    return { ...cfg, key: v('key') || cfg.key, baseUrl: v('baseUrl') || cfg.baseUrl, modelName: v('modelName') || cfg.modelName };
  }

  function bind(c) {
    S.chart = c || S.chart;
    probe();
    if (S.bound) return;
    S.bound = true;
    document.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-ai-save],[data-ai-test],[data-ai-models],[data-ai-send],[data-ai-clear],[data-ai-mode],[data-ai-model]');
      if (!t) return;
      const cfg = read();
      const chart = S.chart;

      if (t.dataset.aiModel) {
        cfg.provider = t.dataset.aiModel;
        write(cfg);
        document.querySelectorAll('[data-ai-model]').forEach((b) => {
          const on = b.dataset.aiModel === cfg.provider;
          b.classList.toggle('selected', on);
          b.setAttribute('aria-pressed', on);
        });
        const note = document.getElementById('ai-model-note');
        if (note) note.textContent = modelNote();
        const badge = document.getElementById('ai-mode');
        if (badge) badge.innerHTML = modeBadge();
        const name = document.querySelector('[data-ai="modelName"]');
        const p = PROVIDERS[cfg.provider];
        if (name && p) name.placeholder = p.model;
        return;
      }

      if (t.dataset.aiMode) {
        try {
          localStorage.setItem(MODE_KEY, t.dataset.aiMode === 'own' ? 'own' : 'hosted');
        } catch {}
        document.getElementById('ai-panel')?.replaceWith(
          (() => {
            const wrap = document.createElement('div');
            wrap.innerHTML = panelHTML(chart);
            return wrap.firstElementChild;
          })()
        );
        return;
      }
      if (t.hasAttribute('data-ai-save')) {
        document.querySelectorAll('[data-ai]').forEach((el) => {
          cfg[el.dataset.ai] = el.value.trim();
        });
        write(cfg);
        status('已保存到本机', 'ok');
        return;
      }
      if (t.hasAttribute('data-ai-models')) {
        if (useHosted()) {
          status('正在拉取…');
          try {
            const r = await fetch('/api/ai/models', { headers: token() ? { 'X-Ziping-Token': token() } : {} });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
            status('可用模型：' + ((j.models || []).slice(0, 20).join('、') || '接口没返回列表'), 'ok');
          } catch (err) {
            status('拉取失败：' + err.message, 'bad');
          }
          return;
        }
        if (!cfg.key) {
          status('先填密钥再拉模型', 'bad');
          return;
        }
        status('正在拉取模型…');
        try {
          const r = await fetch(String(cfg.baseUrl).replace(/\/+$/, '') + '/models', { headers: { Authorization: 'Bearer ' + cfg.key } });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const j = await r.json();
          const ids = (j.data || []).map((m) => m.id).slice(0, 40);
          status('可用模型：' + (ids.join('、') || '接口没返回列表'), 'ok');
        } catch (err) {
          status('拉取失败：' + err.message, 'bad');
        }
        return;
      }
      if (t.hasAttribute('data-ai-test')) {
        status('正在测试…');
        const msgs = [{ role: 'user', content: '回四个字：连接正常' }];
        try {
          const out = useHosted() ? await callHosted(msgs, null) : await callDirect(msgs, null, liveCfg(cfg));
          status('连接正常：' + String(out).slice(0, 40), 'ok');
        } catch (err) {
          status('连接失败：' + err.message, 'bad');
        }
        return;
      }
      if (t.hasAttribute('data-ai-clear')) {
        const out = document.getElementById('ai-out');
        if (out) out.innerHTML = '';
        return;
      }
      if (t.hasAttribute('data-ai-send')) {
        if (S.busy) return;
        const input = document.getElementById('ai-input');
        const out = document.getElementById('ai-out');
        const question = (input && input.value.trim()) || '请按这张盘给一段完整批盘。';
        if (!useHosted() && !cfg.key) {
          status('先填密钥（设置里）', 'bad');
          const d = document.querySelector('.ai-settings');
          if (d) d.open = true;
          return;
        }
        if (S.status?.needsToken && useHosted() && !token()) {
          status('本站需要访问口令，填在设置里', 'bad');
          const d = document.querySelector('.ai-settings');
          if (d) d.open = true;
          return;
        }
        if (!chart) {
          status('先起一张盘', 'bad');
          return;
        }
        S.busy = true;
        t.disabled = true;
        out.innerHTML = '<p class="ai-thinking">正在生成…（长回答可能要半分钟）</p>';
        status('请求中…');
        try {
          const messages = [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: '命盘数据如下：\n' + brief(chart) + '\n\n问题：' + question },
          ];
          await (useHosted() ? callHosted : callDirect)(messages, (full) => {
            out.innerHTML = '<div class="ai-answer">' + esc(full).replace(/\n/g, '<br>') + '</div>';
            out.scrollTop = out.scrollHeight;
          }, useHosted() ? undefined : liveCfg(cfg));
          status('完成', 'ok');
        } catch (err) {
          out.innerHTML = '<p class="ai-error">' + esc(err.message) + '</p>';
          status('失败：' + err.message, 'bad');
        } finally {
          S.busy = false;
          t.disabled = false;
        }
      }
    });
    document.addEventListener('submit', (e) => {
      if (e.target && e.target.id === 'ai-gate-form') {
        e.preventDefault();
        unlock();
      }
    });
  }

  root.ZipingAI = { panelHTML, entryHTML, bind, brief, read, probe, verify, unlock, status: () => S.status };
})(typeof window !== 'undefined' ? window : globalThis);
