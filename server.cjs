'use strict';
/* 子平研习本机服务。
   除静态文件外提供两类接口：
   1) /api/search       古籍全文检索（需本机书库）
   2) /api/ai/*         AI 批盘的托管代理：密钥只留在服务端，浏览器同源调用，
                        因此任何拿到网址的手机、电脑都能直接用，无需各自配置。

   监听地址由 ZIPING_HOST 控制：
     默认 127.0.0.1  仅本机可访问
     0.0.0.0         局域网／公网可访问（此时放开 Host 校验，并建议配 shareToken）
   密钥来源（优先级从高到低）：
     环境变量 ZIPING_AI_KEY / ZIPING_AI_BASE / ZIPING_AI_MODEL
     ai.config.json（已在 .gitignore 中，不会上传）
*/
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.ZIPING_PORT || 4317);
const LISTEN_HOST = process.env.ZIPING_HOST || '127.0.0.1';
const PUBLIC = LISTEN_HOST !== '127.0.0.1' && LISTEN_HOST !== 'localhost';
// 反向代理后面跑时（Nginx/宝塔），Host 与 X-Forwarded-For 才可信；不设则只信本机直连
const TRUST_PROXY = /^(1|true|yes)$/i.test(String(process.env.ZIPING_TRUST_PROXY || ''));
let passages;

function getPassages() {
  return (passages ??= fs
    .readFileSync(path.join(ROOT, 'private', 'passages.jsonl'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map(JSON.parse));
}

/* ---------- AI 托管配置 ---------- */
const AI_FILE = process.env.ZIPING_AI_FILE ? path.resolve(process.env.ZIPING_AI_FILE) : path.join(ROOT, 'ai.config.json');
const DEFAULT_TEMP = 0.7; // 网页不再暴露温度：由站长在服务端统一，避免有人把它调到 2 让批盘跑飞
let aiCache = null;
let aiCacheAt = 0;

/* models 支持两种写法：
     字符串        "gpt": "gpt_6.2sol"
     对象          "gpt": { label, model, baseUrl?, apiKey? }
   带 baseUrl/apiKey 的条目可以指向不同的服务商——两档模型各走各的官方接口也能挂在同一个站点上。 */
function readModels(file, pick, providerName) {
  const raw = file && file.models && typeof file.models === 'object' && !Array.isArray(file.models) ? file.models : null;
  const out = [];
  if (raw) {
    for (const id of Object.keys(raw)) {
      const v = raw[id];
      if (!v) continue;
      const o = typeof v === 'string' ? { model: v } : v;
      const model = String(o.model || o.name || '').trim();
      if (!model) continue;
      out.push({
        id,
        label: String(o.label || providerName || id),
        model,
        baseUrl: String(o.baseUrl || '').replace(/\/+$/, ''),
        apiKey: String(o.apiKey || ''),
      });
    }
  }
  if (!out.length) {
    // 老配置（只有单个 model 字段）继续可用
    out.push({
      id: 'default',
      label: providerName || '默认模型',
      model: String(pick('ZIPING_AI_MODEL', 'model', 'gpt_6.2sol')).trim(),
      baseUrl: '',
      apiKey: '',
    });
  }
  return out;
}

function aiConfig() {
  const now = Date.now();
  if (aiCache && now - aiCacheAt < 5000) return aiCache; // 改配置后 5 秒内自动生效
  let file = {};
  try {
    if (fs.existsSync(AI_FILE)) file = JSON.parse(fs.readFileSync(AI_FILE, 'utf8'));
  } catch (err) {
    console.warn('ai.config.json 读取失败：' + err.message);
  }
  const pick = (envKey, fileKey, fallback) => {
    const v = process.env[envKey];
    if (v !== undefined && v !== '') return v;
    if (file[fileKey] !== undefined && file[fileKey] !== '') return file[fileKey];
    return fallback;
  };
  const baseUrl = String(pick('ZIPING_AI_BASE', 'baseUrl', 'https://api.kodechicken.top/v1')).replace(/\/+$/, '');
  const apiKey = String(pick('ZIPING_AI_KEY', 'apiKey', ''));
  const providerName = String(pick('ZIPING_AI_PROVIDER', 'providerName', ''));
  const options = readModels(file, pick, providerName).map((o) => ({
    ...o,
    baseUrl: o.baseUrl || baseUrl,
    apiKey: o.apiKey || apiKey,
  }));
  const usable = options.filter((o) => o.apiKey);
  const want = String(pick('ZIPING_AI_DEFAULT', 'defaultModel', ''));
  const def = usable.find((o) => o.id === want) || usable[0] || null;
  const cfg = {
    baseUrl,
    apiKey,
    options,
    usable,
    defaultModel: def ? def.id : '',
    model: def ? def.model : '',
    temperature: DEFAULT_TEMP,
    maxTokens: Number(pick('ZIPING_AI_MAXTOKENS', 'maxTokens', 2400)),
    perMinute: Number(pick('ZIPING_AI_PERMIN', 'perMinute', 6)),
    dailyLimit: Number(pick('ZIPING_AI_DAILY', 'dailyLimit', 200)),
    timeout: Number(pick('ZIPING_AI_TIMEOUT', 'timeout', 120000)),
    shareToken: String(pick('ZIPING_AI_TOKEN', 'shareToken', '')),
    providerName,
    configured: Boolean(def),
  };
  aiCache = cfg;
  aiCacheAt = now;
  return cfg;
}

/* 客户端只发 provider 这个短 id（例如 gpt），真实模型名由服务端查表决定：
   站外的人没法借这个接口跑任意模型。 */
function pickOption(cfg, want) {
  const id = String(want || '');
  return (
    cfg.usable.find((o) => o.id === id) ||
    cfg.usable.find((o) => o.id === cfg.defaultModel) ||
    cfg.usable[0] ||
    null
  );
}

/* 每 IP 限流：内存记录，重启即清零。防止公网托管被人白嫖额度。 */
const RATE = new Map();
const todayKey = () => new Date().toISOString().slice(0, 10);

function clientIp(req) {
  if (PUBLIC || TRUST_PROXY) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (fwd) return fwd;
    if (req.headers['x-real-ip']) return String(req.headers['x-real-ip']);
  }
  return req.socket.remoteAddress || 'local';
}

function takeRate(ip) {
  if (RATE.size > 8000) RATE.clear(); // 粗暴兜底，防内存无界增长
  const cfg = aiConfig();
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const day = todayKey();
  let rec = RATE.get(ip);
  if (!rec) {
    rec = { minute, minCount: 0, day, dayCount: 0 };
    RATE.set(ip, rec);
  }
  if (rec.minute !== minute) {
    rec.minute = minute;
    rec.minCount = 0;
  }
  if (rec.day !== day) {
    rec.day = day;
    rec.dayCount = 0;
  }
  if (rec.minCount >= cfg.perMinute) {
    return { ok: false, status: 429, error: `请求太频繁：每分钟最多 ${cfg.perMinute} 次，稍等一会儿再问。` };
  }
  if (rec.dayCount >= cfg.dailyLimit) {
    return { ok: false, status: 429, error: `本站今天可用的 AI 次数（${cfg.dailyLimit} 次）已经用完了，明天再来，或按说明自备密钥。` };
  }
  rec.minCount += 1;
  rec.dayCount += 1;
  return { ok: true, left: { minute: cfg.perMinute - rec.minCount, day: cfg.dailyLimit - rec.dayCount } };
}

/* ---------- 访问口令 ----------
   口令写在 ai.config.json 的 shareToken（也可用环境变量 ZIPING_AI_TOKEN）。
   三个 AI 接口都要过这道门：/chat、/models、/verify。
   比对用「先哈希再定时安全比较」，长度不同也不泄露；连错就临时锁 IP，
   因为站长可能只设两三个字符的口令，经不起无限重试。 */
function sameToken(got, want) {
  const a = crypto.createHash('sha256').update(String(got)).digest();
  const b = crypto.createHash('sha256').update(String(want)).digest();
  return crypto.timingSafeEqual(a, b);
}

const FAIL = new Map();
const FAIL_MAX = 10; // 15 分钟内连错 10 次
const FAIL_WINDOW = 15 * 60 * 1000;
const FAIL_LOCK = 10 * 60 * 1000;

function checkToken(req, cfg) {
  if (!cfg.shareToken) return { ok: true };
  const ip = clientIp(req);
  const now = Date.now();
  const rec = FAIL.get(ip);
  if (rec && rec.until > now) {
    return {
      ok: false,
      status: 429,
      code: 'locked',
      error: `口令连错太多次，${Math.max(1, Math.ceil((rec.until - now) / 60000))} 分钟后再试。`,
    };
  }
  const got = String(req.headers['x-ziping-token'] || '');
  if (got && sameToken(got, cfg.shareToken)) {
    FAIL.delete(ip);
    return { ok: true };
  }
  const r = rec && now - rec.first <= FAIL_WINDOW ? rec : { count: 0, first: now, until: 0 };
  r.count += 1;
  if (r.count >= FAIL_MAX) {
    r.count = 0;
    r.first = now;
    r.until = now + FAIL_LOCK;
  }
  if (FAIL.size > 8000) FAIL.clear();
  FAIL.set(ip, r);
  return { ok: false, status: 401, code: 'need-token', error: '口令不对，或者还没输入。' };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function openBrowser(url) {
  const { spawn } = require('node:child_process');
  if (process.platform === 'win32') {
    spawn('cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { windowsHide: true, stdio: 'ignore' }).on('error', () => {});
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore' }).on('error', () => {});
  }
}

const send = (res, status, data, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
};

function hostAllowed(host) {
  // 对外服务或前面有反代时不锁 Host：域名／局域网 IP／公网 IP 都要能进来
  if (PUBLIC || TRUST_PROXY) return true;
  return new RegExp(`^(127\\.0\\.0\\.1|localhost|\\[::1\\])(:${PORT})?$`, 'i').test(host || '');
}

function readBody(req, limit = 96 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('请求内容过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* 只放行必要字段，顺带挡住「借用本接口当通用网关」的用法 */
function sanitizeMessages(input) {
  if (!Array.isArray(input) || !input.length) throw Object.assign(new Error('缺少对话内容'), { status: 400 });
  if (input.length > 12) throw Object.assign(new Error('对话轮次过多'), { status: 400 });
  let total = 0;
  const out = input.map((m) => {
    const role = ['system', 'user', 'assistant'].includes(m && m.role) ? m.role : 'user';
    const content = String((m && m.content) || '');
    total += content.length;
    return { role, content };
  });
  if (total > 48000) throw Object.assign(new Error('对话内容过长'), { status: 413 });
  if (total < 2) throw Object.assign(new Error('对话内容为空'), { status: 400 });
  return out;
}

async function aiStatus(res) {
  const cfg = aiConfig();
  send(res, 200, {
    hosted: true,
    configured: cfg.configured,
    model: cfg.configured ? cfg.model : '',
    provider: cfg.providerName || (cfg.configured ? '自定义中转站' : ''),
    options: cfg.usable.map((o) => ({ id: o.id, label: o.label })),
    defaultModel: cfg.defaultModel,
    needsToken: Boolean(cfg.shareToken),
    limits: { perMinute: cfg.perMinute, daily: cfg.dailyLimit },
    hint: cfg.configured
      ? '本站已托管模型，直接提问即可，无需填写密钥。'
      : '服务端尚未配置密钥，可在「接口设置」里填你自己的。',
  });
}

async function aiChat(req, res) {
  const cfg = aiConfig();
  if (!cfg.configured) return send(res, 503, { error: '服务端没有配置模型密钥。', code: 'no-key' });
  const gate = checkToken(req, cfg);
  if (!gate.ok) return send(res, gate.status, { error: gate.error, code: gate.code });
  // 先校验请求，再计额度：被拒的请求不该占用别人的次数
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return send(res, err.status || 400, { error: err.message || '请求格式错误' });
  }
  let messages;
  try {
    messages = sanitizeMessages(body.messages);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message });
  }
  const opt = pickOption(cfg, body.provider);
  if (!opt) return send(res, 503, { error: '所选模型没有配置密钥。', code: 'no-key' });

  const rate = takeRate(clientIp(req));
  if (!rate.ok) return send(res, rate.status, { error: rate.error, code: 'rate' });

  const payload = {
    model: opt.model,
    messages,
    temperature: cfg.temperature,
    max_tokens: cfg.maxTokens,
    stream: true,
  };

  let upstream;
  try {
    upstream = await fetch(opt.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + opt.apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(cfg.timeout),
    });
  } catch (err) {
    const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return send(res, 504, {
      error: timedOut ? '上游模型响应超时，稍后重试或换一个更快的模型。' : '无法连接上游模型服务：' + (err.message || '未知错误'),
      code: 'upstream',
    });
  }

  if (!upstream.ok) {
    let detail = '';
    try {
      detail = await upstream.text();
    } catch {}
    // 上游报错可能回显请求头，先抹掉任何 sk- 片段再返回
    detail = detail.replace(/sk-[A-Za-z0-9_\-]{6,}/g, 'sk-***').slice(0, 300);
    return send(res, 502, {
      error: `模型接口返回 ${upstream.status}${detail ? '：' + detail : ''}`,
      code: 'upstream',
    });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Nginx 反代时别缓冲
  });
  if (!upstream.body) {
    res.end('data: [DONE]\n\n');
    return;
  }
  const reader = upstream.body.getReader();
  const close = () => {
    try {
      reader.cancel();
    } catch {}
  };
  req.on('close', close);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: '输出中断：' + (err.message || '') })}\n\n`);
  }
  res.end();
}

async function aiVerify(req, res) {
  const cfg = aiConfig();
  if (!cfg.configured) return send(res, 503, { error: '服务端没有配置模型密钥。', code: 'no-key' });
  const gate = checkToken(req, cfg);
  if (!gate.ok) return send(res, gate.status, { error: gate.error, code: gate.code });
  send(res, 200, { ok: true, needsToken: Boolean(cfg.shareToken) });
}

async function aiModels(req, res) {
  const cfg = aiConfig();
  const opt = pickOption(cfg, '');
  if (!opt) return send(res, 503, { error: '服务端没有配置模型密钥。', code: 'no-key' });
  const gate = checkToken(req, cfg);
  if (!gate.ok) return send(res, gate.status, { error: gate.error, code: gate.code });
  try {
    const r = await fetch(opt.baseUrl + '/models', {
      headers: { Authorization: 'Bearer ' + opt.apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return send(res, 502, { error: '上游返回 ' + r.status });
    const j = await r.json();
    const ids = (j.data || []).map((m) => m.id).slice(0, 60);
    send(res, 200, { models: ids, current: opt.model });
  } catch (err) {
    send(res, 504, { error: '拉取模型列表失败：' + (err.message || '') });
  }
}

const server = http.createServer(async (req, res) => {
  if (!hostAllowed(req.headers.host)) return send(res, 403, { error: '本服务未开放该访问地址。' });
  let url;
  try {
    url = new URL(req.url, 'http://127.0.0.1');
  } catch {
    return send(res, 400, { error: '无效地址。' });
  }

  /* ---- AI 接口（POST 与 GET 均可） ---- */
  if (url.pathname === '/api/ai/status') {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: '请用 GET。' });
    return aiStatus(res);
  }
  if (url.pathname === '/api/ai/chat') {
    if (req.method !== 'POST') return send(res, 405, { error: '请用 POST。' });
    return aiChat(req, res);
  }
  if (url.pathname === '/api/ai/verify') {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: '请用 GET。' });
    return aiVerify(req, res);
  }
  if (url.pathname === '/api/ai/models') {
    if (req.method !== 'GET') return send(res, 405, { error: '请用 GET。' });
    return aiModels(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: '只支持读取。' });

  if (url.pathname === '/api/health') {
    const cfg = aiConfig();
    return send(res, 200, {
      app: 'ziping-study',
      version: '0.9.5',
      localOnly: !PUBLIC,
      aiConfigured: cfg.configured,
      aiModel: cfg.configured ? cfg.model : null,
      aiOptions: cfg.usable.map((o) => o.id),
      tz: process.versions.tz,
      icu: process.versions.icu,
      node: process.version,
    });
  }
  if (url.pathname === '/api/search') {
    const q = (url.searchParams.get('q') || '').trim();
    const book = url.searchParams.get('book') || '';
    const offset = Math.max(0, Math.min(15000, Number(url.searchParams.get('offset')) || 0));
    if (q.length > 80 || !/^$|^BK0[1-7]$/.test(book)) return send(res, 400, { error: '检索参数无效。' });
    if (!q && !book) return send(res, 200, { total: 0, results: [] });
    if (!fs.existsSync(path.join(ROOT, 'private', 'passages.jsonl')))
      return send(res, 503, { error: '公开仓库未附全文语料。请使用已配置本机书库的版本；排盘、详批、教学和实训仍可用。' });
    const matches = getPassages().filter(
      (p) => (!book || p.source_id === book) && (!q || p.text.includes(q) || p.chapter.includes(q))
    );
    return send(res, 200, { total: matches.length, offset, results: matches.slice(offset, offset + 15), review_status: '网络整理本，待校勘；仅供本地研究' });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return send(res, 400, { error: '无效编码。' });
  }
  if (pathname === '/' || pathname === '/index.html') pathname = '/index.html';
  const allowed =
    pathname === '/index.html' ||
    [
      '/app.js',
      '/content.js',
      '/academy.js',
      '/academy-advanced.js',
      '/lessons-deep.js',
      '/lessons-order.js',
      '/cases-deep.js',
      '/cases-more.js',
      '/case-map.js',
      '/reading.js',
      '/deep.js',
      '/ai.js',
      '/engine.js',
      '/geo.js',
      '/places.js',
      '/extra.js',
      '/tables.js',
      '/styles.css',
    ].includes(pathname) ||
    /^\/books\/BK0[1-7]\.js$/.test(pathname) ||
    /^\/assets\/[a-zA-Z0-9_.-]+$/.test(pathname) ||
    /^\/vendor\/(lunar.js|lunar.LICENSE)$/.test(pathname);
  if (!allowed) return send(res, 404, { error: '未提供此文件。' });
  const filename = path.join(ROOT, pathname);
  fs.readFile(filename, (err, data) => {
    if (err) return send(res, 404, { error: '文件不存在。' });
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filename)] || 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

server.on('error', async (e) => {
  if (e.code === 'EADDRINUSE') {
    try {
      const health = await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.json());
      if (health.app === 'ziping-study') {
        console.log('子平研习已经运行，正在打开现有页面。');
        if (process.argv.includes('--open')) openBrowser(`http://127.0.0.1:${PORT}`);
        return;
      }
    } catch {}
    console.error(`端口${PORT}正在被其他程序使用，请关闭冲突服务或更换ZIPING_PORT。`);
  } else console.error(e.message);
  process.exitCode = 1;
});

server.listen(PORT, LISTEN_HOST, () => {
  const cfg = aiConfig();
  const url = `http://${LISTEN_HOST === '0.0.0.0' ? '127.0.0.1' : LISTEN_HOST}:${PORT}`;
  const aiLine = cfg.configured
    ? `AI 批盘：已托管（${cfg.usable.map((o) => `${o.label}→${o.model}`).join('、')}），访问本站的设备无需填密钥，每人每分钟 ${cfg.perMinute} 次、每天 ${cfg.dailyLimit} 次。`
    : 'AI 批盘：未配置密钥。想让它对所有访问者可用，请按「AI部署说明.md」填 ai.config.json。';
  console.log(
    `子平研习已启动：${url}\n监听地址：${LISTEN_HOST}${PUBLIC ? '（局域网／公网可访问）' : '（仅本机）'}\n${aiLine}\n关闭此窗口将停止本机服务；直接打开index.html仍可离线阅读。\n出生资料在浏览器本机计算，本服务不记录出生输入。`
  );
  if (process.argv.includes('--open')) openBrowser(url);
});
