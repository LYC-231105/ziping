# AI 批盘部署说明：让所有人的手机、电脑都能直接用

## 先说结论

AI 能不能"所有人打开就能用"，取决于**页面从哪来**，不取决于代码。

| 你怎么打开 | AI 能力 | 别人能用吗 |
|---|---|---|
| 双击 `index.html`（`file://`） | 自备密钥，浏览器直连 | 不能，只能自己用 |
| `node server.cjs` 本机 | 托管，零配置 | 不能，只有本机能开 |
| 本机服务 + 局域网地址 | 托管，零配置 | 能，同一个 WiFi 下的手机 |
| **部署到公网服务器** | **托管，零配置** | **能，任何人、任何设备** |
| GitHub Pages 等纯静态托管 | 自备密钥，浏览器直连 | 能，但每个访客要自己填密钥（还受中转站 CORS 限制） |

原因很简单：模型密钥不能放在网页里，一放就等于公开。所以必须有一个服务端替你拿着密钥、替所有访客转发请求。**要"所有人零配置"，就必须把这份 Node 服务部署到公网**，纯静态托管做不到。

---

## 一、先配密钥（三种模式都要）

在 `server.cjs` 同目录新建 `ai.config.json`（照 `ai.config.example.json` 复制改）：

```json
{
  "baseUrl": "https://api.kodechicken.top/v1",
  "apiKey": "sk-你的密钥",
  "models": {
    "gpt": { "label": "GPT", "model": "gpt_6.2sol" }
  },
  "defaultModel": "gpt",
  "maxTokens": 2400,
  "perMinute": 6,
  "dailyLimit": 200,
  "shareToken": ""
}
```

`models` 里的每个键就是网页上「模型」按钮的 id（这里是 `gpt`），`label` 是按钮上显示的字，`model` 是真正发给上游的模型名（这里是 `gpt_6.2sol`）。

温度不再由网页控制：服务端固定 0.7，省得有人把它调到 2 让批盘跑飞。

`shareToken` 是 AI 的访问口令：**留空表示谁打开都能用**，填上就只放行输对口令的人（第四节「公网部署后必须做的两件事」里细说）。

`ai.config.json` 已经在 `.gitignore` 里，**不会被上传到 GitHub**。也可以用环境变量，环境变量优先级更高：

| 环境变量 | 对应字段 | 说明 |
|---|---|---|
| `ZIPING_AI_KEY` | apiKey | 密钥，必填 |
| `ZIPING_AI_BASE` | baseUrl | 接口地址，填到 `/v1` 为止 |
| `ZIPING_AI_MODEL` | model | 只配一个模型时用；模型名必须上游支持 |
| `ZIPING_AI_DEFAULT` | defaultModel | 默认选中哪个选项 id |
| `ZIPING_AI_MAXTOKENS` | maxTokens | 单次回答上限，控成本用 |
| `ZIPING_AI_PERMIN` | perMinute | 每人每分钟次数 |
| `ZIPING_AI_DAILY` | dailyLimit | 每人每天次数 |
| `ZIPING_AI_TOKEN` | shareToken | 访问口令，公网建议设 |
| `ZIPING_AI_TIMEOUT` | timeout | 上游超时毫秒 |

改完配置**不用重启**，5 秒内自动生效。

自检：

```bash
curl http://127.0.0.1:4317/api/ai/status
# {"hosted":true,"configured":true,"model":"gpt_6.2sol",
#  "options":[{"id":"gpt","label":"GPT"}],
#  "defaultModel":"gpt",...}
```

`configured:true` 且 `options` 里能看到 `gpt`，就说明服务端认到密钥了。注意 `options` 只列**配了密钥的**模型：只填了 `apiKey`、没配 `models` 的老写法会退化成一个 `default` 选项。

### 现在只挂一个 GPT，怎么改

**默认配置**（就是上面那份）：中转站 `https://api.kodechicken.top/v1`，模型名 `gpt_6.2sol`，网页上只出现一个「GPT」按钮。

| 服务 | Base URL | 模型名 |
|---|---|---|
| 本页默认中转站 | `https://api.kodechicken.top/v1` | `gpt_6.2sol` |
| OpenAI 官方（备选） | `https://api.openai.com/v1` | `gpt-4o-mini`、`gpt-4o` |

**只换服务商**：改 `baseUrl` 与 `apiKey`，`model` 改成那家支持的模型名。中转站常常自己改名，遇到 502 先看报错里写的"model not found"。

**想加第二档**（比如贵一点的大模型做深批）：在 `models` 里再加一个键，网页会自动多一个按钮，前端一行都不用改：

```json
"models": {
  "gpt": { "label": "GPT", "model": "gpt_6.2sol" },
  "big": { "label": "深度", "model": "gpt_6.2sol-pro" }
}
```

**某一档要走别的地址或别的密钥**：把 `baseUrl`、`apiKey` 写进它自己的条目，优先于全局那份：

```json
{
  "models": {
    "gpt": { "label": "GPT", "model": "gpt_6.2sol",
             "baseUrl": "https://api.kodechicken.top/v1", "apiKey": "sk-这一档的密钥" }
  }
}
```

---

## 二、路径一：本机自用（现在就能用）

```bash
cd D:/子平/网页
node server.cjs
```

打开 `http://127.0.0.1:4317/#ai`（左侧导航第三项「AI 批盘」，或详批页右上角的 ✦ 按钮）。页面上应该显示**「本站已托管 · GPT」**徽标，模型那一栏显示当前这一档，设置区自动折叠，排完盘直接点「让 AI 批这张盘」就行，不用填任何东西。

---

## 三、路径二：家里 / 宿舍共用（手机同 WiFi）

```bash
# Windows PowerShell
$env:ZIPING_HOST="0.0.0.0"; node server.cjs
```

```bash
# macOS / Linux
ZIPING_HOST=0.0.0.0 node server.cjs
```

然后查本机内网 IP（`ipconfig` 看 IPv4，一般是 `192.168.x.x`），手机浏览器打开：

```
http://192.168.1.23:4317/
```

手机端会自动识别托管模式，同样零配置。注意两点：

1. **首次运行可能弹出 Windows 防火墙提示，要选「允许访问」**，选「取消」手机就连不上；
2. 电脑休眠或关机，手机就打不开。

> `ZIPING_HOST` 不是 `127.0.0.1` 时，服务会自动放开 Host 校验（否则局域网 IP 会被 403 挡掉）。这是一个明确的信任开关，只想自己用时别设它。

---

## 四、路径三：公网部署（真正的"所有人"）

要让任何网络下的任何设备都能打开，需要一台带 Node 的公网机器。三种做法，按省事程度排：

### 做法 A：云服务器 + 宝塔 / 1Panel（推荐，可控）

1. 买一台 1 核 2G 的轻量服务器（阿里云、腾讯云学生机都够）；
2. 装 Node 20+，把整个项目目录传上去；
3. 在项目目录放好 `ai.config.json`；
4. 用 PM2 常驻：

```bash
npm i -g pm2
ZIPING_HOST=127.0.0.1 ZIPING_PORT=4317 pm2 start server.cjs --name ziping
pm2 save && pm2 startup
```

5. Nginx 反代 + HTTPS（宝塔面板点选即可）：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:4317;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # AI 是流式返回，这两行必须加，否则回答会憋到最后一次性蹦出来
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

这里 `ZIPING_HOST` 保持 `127.0.0.1`（只让 Nginx 转发），**不要**直接 `0.0.0.0` 暴露 4317 端口——否则别人可以绕过 HTTPS 直连。

但这样设了之后，服务端的 Host 校验会拦掉域名请求。所以公网反代场景要显式打开信任：

```bash
ZIPING_HOST=127.0.0.1 ZIPING_TRUST_PROXY=1 pm2 start server.cjs --name ziping
```

（`ZIPING_TRUST_PROXY=1` 表示"我前面有反向代理，Host 与 X-Forwarded-For 可信"。）

### 做法 B：Render（免运维，免费档够测试）

1. 把仓库接到 Render，新建 **Web Service**；
2. Build Command 留空，Start Command 填 `node server.cjs`；
3. 在 Environment 里加 `ZIPING_HOST=0.0.0.0`、`ZIPING_AI_KEY`、`ZIPING_AI_MODEL`、`ZIPING_AI_BASE`；
4. 部署完拿到 `https://xxx.onrender.com`，手机电脑都能开。

**注意**：Render 免费档的文件系统是临时的，`ai.config.json` 重启就没了——必须用环境变量；且 15 分钟无访问会休眠，首次打开慢十几秒。

### 做法 C：Railway / Fly.io / Zeabur

同理：`ZIPING_HOST=0.0.0.0` + 环境变量。这几个对流式响应支持都正常。

### 公网部署后必须做的两件事

**① 设访问口令**（这一版已经做成一道门），否则拿到链接的人都能烧你的额度：

```json
"shareToken": "给朋友的四个字口令"
```

设了之后，AI 页面上只显示一块「要口令」的界面，对话区和提问框根本不渲染；输对才进得去，输一次记在这台设备上（localStorage），下次打开自动放行。

拦住的不只是页面，是三个接口：

| 接口 | 没带对口令 |
|---|---|
| `POST /api/ai/chat` | 401，不转发给上游，不花你的额度 |
| `GET /api/ai/models` | 401（不让人白拿你的模型列表） |
| `GET /api/ai/verify` | 401（这就是门禁用来核对口令的那个接口） |

口令比对是「先哈希再定时安全比较」，长度不同也不泄露；**连错 10 次锁这台 IP 10 分钟**——因为口令可能只有两三个字符，不设限就等于没有。

要注意两件事：

1. 页面本身（版式、提示文字）是公开的，别人看得到；被保护的是**模型调用和你的密钥**；
2. 口令放在请求头里，走 HTTP 时是明文。只在局域网用没关系，**放到公网一定要配 HTTPS**（第四节里的 Nginx 做法已经带证书）。

**② 把限额调小**：

```json
"perMinute": 3,
"dailyLimit": 50
```

按自己的预算算：一次批盘约 1500—2500 token，`dailyLimit: 50` 就是每天最多 50 次。

---

## 五、路径四：GitHub Pages（只能自备密钥）

纯静态托管没有 Node，`/api/ai/*` 不存在，页面会自动退回"自备密钥"模式，让每个访客自己填中转站地址与密钥。

这条路有两个现实限制，先说清楚：

1. **CORS**：浏览器直连中转站，需要对方返回 `Access-Control-Allow-Origin`。部分中转站不放行浏览器跨域，那就连不上；
2. **密钥在访客自己的浏览器里**：换设备要重填，也没法替他保管。

所以 Pages 适合"自己用 + 给懂行的朋友用"，不适合"所有人打开就能用"。要后者，走路径三。

---

## 六、安全边界（已实现，不用你操心）

| 风险 | 处理 |
|---|---|
| 密钥泄露给前端 | 密钥只在服务端，`/api/ai/status`、`/api/health`、错误响应都做过脱敏，测试会验证 |
| 被当成免费 API 网关 | 只接受 `messages` 与模型短 id；模型名、`max_tokens`、`stream`、温度由服务端锁定，站外的人没法借接口跑任意模型 |
| 请求体攻击 | 上限 96KB，消息 ≤12 条、总长 ≤48000 字 |
| 刷额度 | 按 IP 每分钟／每天双限流，被拒的请求不占额度 |
| 密钥回显 | 上游报错里的 `sk-****` 片段会被打码后再回传 |
| 跨站盗用 | 页面 CSP 是 `connect-src 'self'`，只能请求自己的源 |
| 出生资料落库 | 服务端不写日志、不存 body，只在内存里转发一次 |

**没有做的事**（如实说明）：没有用户系统，所以限额是按 IP 算的，同一 WiFi 下多人共用一个 IP 会共享额度；也没有内容审核，模型说什么取决于你接的那家。

---

## 七、出问题怎么查

| 现象 | 原因 | 处理 |
|---|---|---|
| 徽标显示「本站尚未配置模型」 | 服务端没读到密钥 | 跑 `curl /api/ai/status`，检查 `ai.config.json` 位置与 JSON 格式 |
| 模型只有一个选项「默认模型」 | `ai.config.json` 里没写 `models`，退化成老写法 | 按上面「现在只挂一个 GPT，怎么改」补 `models` |
| 徽标显示「离线/静态页面」 | 没有后端（`file://` 或静态托管） | 走路径三，或让别人自备密钥 |
| 点发送提示"浏览器直连被拦下" | 在服务页里用了自备模式，被 CSP 挡了 | 改用托管（服务端配密钥），别切"用自己的密钥" |
| 回答卡住不动，最后一次性出现 | Nginx 缓冲没关 | 加 `proxy_buffering off` |
| 提示 502 且带上游报错 | 密钥错、模型名错、余额不足 | 看报错原文，多半是模型名不在这家中转站 |
| 提示 429 | 触发限流 | 等一分钟，或调大 `perMinute` |
| 手机打开是白屏 | 访问的不是 `index.html` 所在的服务 | 确认用 `http://IP:4317/` 而不是 `file://` |

---

## 八、一句话总结

**代码已经改好了：浏览器不再直连模型，改为调本站的 `/api/ai/chat`，密钥只留在服务端。** 你要做的只有一件事——把这份服务放到一个别人能访问的地址上（路径三），然后把自己的密钥填进 `ai.config.json`。之后不管谁用什么手机什么电脑，打开就能用。
