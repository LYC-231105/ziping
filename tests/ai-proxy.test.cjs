/* AI 托管代理的集成测试：本地假上游模拟中转站，不触碰真实密钥。
   覆盖：状态上报、流式转发、密钥不外泄、上游报错脱敏、限流、
        口令校验、请求体校验、静态页 CSP。 */
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () =>
  new Promise((resolve) => {
    const s = http.createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });

let pass = 0;
const failures = [];
const t = async (name, fn) => {
  try {
    await fn();
    pass++;
  } catch (e) {
    failures.push(name + ' :: ' + e.message);
  }
};

/* ---------- 假上游 ---------- */
const received = { paths: [], auth: [], body: null };
function startUpstream() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      received.paths.push(req.url);
      received.auth.push(req.headers.authorization || '');
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        if (req.url.endsWith('/models')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ data: [{ id: 'test-model' }, { id: 'backup-model' }] }));
          return;
        }
        try {
          received.body = JSON.parse(raw);
        } catch {}
        if (received.body && /boom/.test(JSON.stringify(received.body.messages))) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'bad key sk-secretleak1234567890' } }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        const chunks = ['子平', '判读', '：身弱喜印比。'];
        let i = 0;
        const tick = () => {
          if (i < chunks.length) {
            res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: chunks[i++] } }] }) + '\n\n');
            setTimeout(tick, 30);
          } else {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        };
        tick();
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

/* ---------- 被测服务 ---------- */
function startServer(port, env) {
  const child = spawn(process.execPath, ['server.cjs'], {
    cwd: ROOT,
    env: { ...process.env, ZIPING_PORT: String(port), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

const rawGet = (port, p, hostHeader) =>
  new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method: 'GET', headers: { Host: hostHeader } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });

async function waitReady(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(800) });
      if (r.ok) return await r.json();
    } catch {}
    await sleep(150);
  }
  throw new Error('服务未就绪');
}

async function main() {
  const up = await startUpstream();

  /* ===== 场景 A：未配置密钥 ===== */
  const pA = await freePort();
  const emptyCfg = path.join(os.tmpdir(), `zp-ai-empty-${process.pid}.json`);
  fs.writeFileSync(emptyCfg, JSON.stringify({ baseUrl: 'http://127.0.0.1:1/v1', apiKey: '', model: 'x' }));
  const srvA = startServer(pA, { ZIPING_AI_FILE: emptyCfg, ZIPING_AI_KEY: '' });
  await waitReady(pA);

  await t('未配置时 status 如实上报 configured=false', async () => {
    const j = await fetch(`http://127.0.0.1:${pA}/api/ai/status`).then((r) => r.json());
    assert.strictEqual(j.hosted, true);
    assert.strictEqual(j.configured, false);
    assert.ok(!j.model, '未配置不应回模型名');
  });

  await t('未配置时 chat 返回 503 且不尝试上游', async () => {
    const r = await fetch(`http://127.0.0.1:${pA}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
    });
    assert.strictEqual(r.status, 503);
    const j = await r.json();
    assert.strictEqual(j.code, 'no-key');
  });

  await t('静态页仍带 connect-src 收紧的 CSP', async () => {
    const r = await fetch(`http://127.0.0.1:${pA}/index.html`);
    const csp = r.headers.get('content-security-policy') || '';
    assert.ok(/connect-src 'self'/.test(csp), 'CSP 丢了');
  });

  srvA.kill();
  fs.rmSync(emptyCfg, { force: true });

  /* ===== 场景 B：已配置（走托管） ===== */
  const pB = await freePort();
  const srvB = startServer(pB, {
    ZIPING_AI_KEY: 'sk-test-key-abcdefghijklmn',
    ZIPING_AI_BASE: `http://127.0.0.1:${up.port}/v1`,
    ZIPING_AI_MODEL: 'test-model',
    ZIPING_AI_PERMIN: '2',
    ZIPING_AI_DAILY: '50',
    ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'),
  });
  const health = await waitReady(pB);

  await t('health 报告 AI 已配置但不含密钥', async () => {
    assert.strictEqual(health.aiConfigured, true);
    assert.strictEqual(health.aiModel, 'test-model');
    assert.ok(!JSON.stringify(health).includes('sk-test'), 'health 泄露密钥');
  });

  await t('status 下发模型与限额，不下发密钥', async () => {
    const raw = await fetch(`http://127.0.0.1:${pB}/api/ai/status`).then((r) => r.text());
    assert.ok(!raw.includes('sk-test'), 'status 泄露密钥');
    const j = JSON.parse(raw);
    assert.strictEqual(j.configured, true);
    assert.strictEqual(j.model, 'test-model');
    assert.strictEqual(j.limits.perMinute, 2);
  });

  let streamText = '';
  await t('chat 透传流式输出，且由服务端注入密钥', async () => {
    const r = await fetch(`http://127.0.0.1:${pB}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '批这张盘' }] }),
    });
    assert.strictEqual(r.status, 200);
    assert.ok((r.headers.get('content-type') || '').includes('text/event-stream'));
    streamText = await r.text();
    assert.ok(streamText.includes('子平') && streamText.includes('[DONE]'), '流式内容不完整');
    assert.ok(!streamText.includes('sk-test'), '响应里出现了密钥');
  });

  await t('上游收到的 Authorization 是服务端密钥', async () => {
    assert.ok(received.auth.some((a) => a === 'Bearer sk-test-key-abcdefghijklmn'), '未注入密钥');
  });

  await t('请求体被降级为固定模型与 token 上限', async () => {
    assert.strictEqual(received.body.model, 'test-model', '模型未锁定');
    assert.ok(received.body.max_tokens > 0, '缺 max_tokens');
    assert.strictEqual(received.body.stream, true);
  });

  await t('每分钟限流生效（perMinute=2，已用 1 次）', async () => {
    const call = () =>
      fetch(`http://127.0.0.1:${pB}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: '再来' }] }),
      });
    const second = await call();
    assert.strictEqual(second.status, 200, '第二次应放行');
    await second.text();
    const third = await call();
    assert.strictEqual(third.status, 429, '第三次应被限流');
    const j = await third.json();
    assert.strictEqual(j.code, 'rate');
  });

  await t('空消息被拒（400）', async () => {
    const r = await fetch(`http://127.0.0.1:${pB}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });
    assert.strictEqual(r.status, 400);
  });

  await t('上游报错时密钥被打码后再回传', async () => {
    const pC = await freePort();
    const srvC = startServer(pC, {
      ZIPING_AI_KEY: 'sk-test-key-abcdefghijklmn',
      ZIPING_AI_BASE: `http://127.0.0.1:${up.port}/v1`,
      ZIPING_AI_MODEL: 'test-model',
      ZIPING_AI_PERMIN: '99',
      ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'),
    });
    await waitReady(pC);
    const r = await fetch(`http://127.0.0.1:${pC}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'boom' }] }),
    });
    const txt = await r.text();
    assert.strictEqual(r.status, 502);
    assert.ok(!txt.includes('sk-secretleak'), '上游报错里的密钥没被抹掉：' + txt.slice(0, 120));
    srvC.kill();
  });

  await t('模型列表接口可用', async () => {
    const j = await fetch(`http://127.0.0.1:${pB}/api/ai/models`).then((r) => r.json());
    assert.ok(Array.isArray(j.models) && j.models.includes('test-model'));
  });

  await t('POST 到非 AI 路径仍是 405', async () => {
    const r = await fetch(`http://127.0.0.1:${pB}/api/search`, { method: 'POST', body: '{}' });
    assert.strictEqual(r.status, 405);
  });

  /* ===== 场景 B2：多个模型选项（两档 id 各自映射到不同上游模型名） ===== */
  await t('多模型：status 下发选项，chat 按 id 切换上游模型', async () => {
    const p2 = await freePort();
    const cfg2 = path.join(os.tmpdir(), `zp-ai-models-${process.pid}.json`);
    fs.writeFileSync(
      cfg2,
      JSON.stringify({
        baseUrl: `http://127.0.0.1:${up.port}/v1`,
        apiKey: 'sk-test-key-abcdefghijklmn',
        models: {
          gpt: { label: 'GPT', model: 'gpt_6.2sol' },
          big: { label: '深度', model: 'gpt_6.2sol-pro' },
        },
        defaultModel: 'gpt',
        perMinute: 50,
      })
    );
    const srv2 = startServer(p2, { ZIPING_AI_FILE: cfg2, ZIPING_AI_KEY: '', ZIPING_AI_MODEL: '', ZIPING_AI_PERMIN: '50' });
    await waitReady(p2);

    const st = await fetch(`http://127.0.0.1:${p2}/api/ai/status`).then((r) => r.json());
    assert.deepStrictEqual(
      st.options.map((o) => o.id),
      ['gpt', 'big'],
      '选项没下发'
    );
    assert.strictEqual(st.options[0].label, 'GPT');
    assert.strictEqual(st.defaultModel, 'gpt');
    assert.ok(!JSON.stringify(st).includes('sk-'), 'status 泄露密钥');

    const send = (provider, extra = {}) =>
      fetch(`http://127.0.0.1:${p2}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }], provider, ...extra }),
      });

    let r = await send('gpt');
    assert.strictEqual(r.status, 200);
    await r.text();
    assert.strictEqual(received.body.model, 'gpt_6.2sol', 'gpt 没切到对应模型');

    r = await send('big');
    await r.text();
    assert.strictEqual(received.body.model, 'gpt_6.2sol-pro', '第二档没切到对应模型');

    r = await send('写什么都行');
    await r.text();
    assert.strictEqual(received.body.model, 'gpt_6.2sol', '未知 id 应回落到默认模型');

    r = await send('big', { temperature: 1.9 });
    await r.text();
    assert.strictEqual(received.body.temperature, 0.7, '客户端传的温度应被忽略');

    srv2.kill();
    fs.rmSync(cfg2, { force: true });
  });

  /* ===== 场景 C：口令 ===== */
  const pD = await freePort();
  const srvD = startServer(pD, {
    ZIPING_AI_KEY: 'sk-test-key-abcdefghijklmn',
    ZIPING_AI_BASE: `http://127.0.0.1:${up.port}/v1`,
    ZIPING_AI_MODEL: 'test-model',
    ZIPING_AI_TOKEN: 'letmein',
    ZIPING_AI_PERMIN: '99',
    ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'),
  });
  await waitReady(pD);

  await t('设了口令时未带口令返回 401', async () => {
    const r = await fetch(`http://127.0.0.1:${pD}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
    });
    assert.strictEqual(r.status, 401);
    assert.strictEqual((await r.json()).code, 'need-token');
  });

  await t('口令正确时放行，status 提示需要口令', async () => {
    const st = await fetch(`http://127.0.0.1:${pD}/api/ai/status`).then((r) => r.json());
    assert.strictEqual(st.needsToken, true);
    const r = await fetch(`http://127.0.0.1:${pD}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ziping-Token': 'letmein' },
      body: JSON.stringify({ messages: [{ role: 'user', content: '你好' }] }),
    });
    assert.strictEqual(r.status, 200);
    await r.text();
  });

  await t('verify：无口令 401、错口令 401、对口令 200', async () => {
    const no = await fetch(`http://127.0.0.1:${pD}/api/ai/verify`);
    assert.strictEqual(no.status, 401);
    const bad = await fetch(`http://127.0.0.1:${pD}/api/ai/verify`, { headers: { 'X-Ziping-Token': 'nope' } });
    assert.strictEqual(bad.status, 401);
    const ok = await fetch(`http://127.0.0.1:${pD}/api/ai/verify`, { headers: { 'X-Ziping-Token': 'letmein' } });
    assert.strictEqual(ok.status, 200);
    assert.strictEqual((await ok.json()).ok, true);
  });

  await t('设了口令时模型列表也要口令', async () => {
    const no = await fetch(`http://127.0.0.1:${pD}/api/ai/models`);
    assert.strictEqual(no.status, 401);
    const ok = await fetch(`http://127.0.0.1:${pD}/api/ai/models`, { headers: { 'X-Ziping-Token': 'letmein' } });
    assert.strictEqual(ok.status, 200);
    await ok.text();
  });

  await t('口令连错 10 次锁 IP，锁定期内即使口令正确也拒绝', async () => {
    const pX = await freePort();
    const srvX = startServer(pX, {
      ZIPING_AI_KEY: 'sk-test-key-abcdefghijklmn',
      ZIPING_AI_BASE: `http://127.0.0.1:${up.port}/v1`,
      ZIPING_AI_MODEL: 'test-model',
      ZIPING_AI_TOKEN: 'letmein',
      ZIPING_AI_PERMIN: '99',
      ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'),
    });
    await waitReady(pX);
    let last = 0;
    for (let i = 0; i < 10; i++) {
      const r = await fetch(`http://127.0.0.1:${pX}/api/ai/verify`, { headers: { 'X-Ziping-Token': 'bad-' + i } });
      last = r.status;
    }
    assert.strictEqual(last, 401, '前 10 次应回 401');
    const locked = await fetch(`http://127.0.0.1:${pX}/api/ai/verify`, { headers: { 'X-Ziping-Token': 'letmein' } });
    assert.strictEqual(locked.status, 429, '锁定期内对口令也应拒绝');
    assert.strictEqual((await locked.json()).code, 'locked');
    srvX.kill();
  });

  /* ===== 场景 D：Host 校验与反代信任 ===== */
  const pE = await freePort();
  const srvE = startServer(pE, { ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'), ZIPING_AI_KEY: '' });
  await waitReady(pE);

  await t('本机模式下伪造 Host 被 403 拦住', async () => {
    const code = await rawGet(pE, '/api/health', 'evil.example.com');
    assert.strictEqual(code, 403);
  });

  const pF = await freePort();
  const srvF = startServer(pF, {
    ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'),
    ZIPING_AI_KEY: '',
    ZIPING_TRUST_PROXY: '1',
  });
  await waitReady(pF);

  await t('开启反代信任后域名 Host 可访问（公网反代场景）', async () => {
    const code = await rawGet(pF, '/api/health', 'ziping.example.com');
    assert.strictEqual(code, 200);
  });

  await t('监听 0.0.0.0 时 status 声明为对外提供服务', async () => {
    const pG = await freePort();
    const srvG = startServer(pG, {
      ZIPING_HOST: '0.0.0.0',
      ZIPING_AI_FILE: path.join(os.tmpdir(), 'zp-ai-none.json'),
      ZIPING_AI_KEY: '',
    });
    const h = await waitReady(pG);
    assert.strictEqual(h.localOnly, false, '未标记为对外服务');
    const code = await rawGet(pG, '/api/health', '192.168.1.23:' + pG);
    assert.strictEqual(code, 200, '局域网地址被误拦');
    srvG.kill();
  });

  srvE.kill();
  srvF.kill();
  srvD.kill();
  srvB.kill();
  up.srv.close();
  console.log(
    JSON.stringify(
      { passed: pass, failed: failures.length, failures, scope: 'AI 托管代理：状态、流式、脱敏、限流、口令与试错锁定' },
      null,
      1
    )
  );
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
