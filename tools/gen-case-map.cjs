/* 生成 case-map.js：把每一讲的配套案例补到至少五盘。
   原则：
   1) 手写过的映射（cases-deep.js 自带的）保留在原位，不动、不改写；
   2) 补充的盘只从已有的 82 盘里挑，不新造案例、不编生平；
   3) 每条的「与本讲的关系」由本讲主题句 + 该盘现算出来的事实拼成，
      事实（四柱、分数、十神、关系、起运）全部来自 engine / extra，不是手写数字；
   4) 同一张盘可在多讲复现，但会按已用次数降权，避免某几盘被反复用。

   用法：node tools/gen-case-map.cjs
*/
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const Z = require(path.join(ROOT, 'engine.js'));
const X = require(path.join(ROOT, 'extra.js'));

const sandbox = { console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
['content.js', 'academy.js', 'academy-advanced.js', 'lessons-deep.js', 'lessons-order.js', 'cases-deep.js', 'cases-more.js'].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f })
);
const C = sandbox.ZIPING_CONTENT;
const lessons = C.lessons;
const cases = C.teachingCases;
const handMade = JSON.parse(JSON.stringify(C.caseMap || {}));

/* ---------- 一、算事实 ---------- */
function factsOf(c) {
  const r = Z.calculate({
    name: c.name, date: c.birth.date, time: c.birth.time, calendar: 'solar',
    gender: c.birth.gender, place: c.birth.place, timezone: c.birth.tz || 'Asia/Shanghai',
    longitude: c.birth.lon, clock: 'true', dayBoundary: 0, ziStem: 'next',
  });
  const sc = X.strengthScore(r);
  const gj = X.geju(r);
  const tm = X.threeMethods(r);
  const en = X.tenGodEnergy(r);
  const top = en.list.slice().sort((a, b) => b.val - a.val)[0] || { god: '', val: 0 };
  const godsFace = [...new Set(r.details.slice(0, 3).map((p) => p.god).filter(Boolean))];
  const rels = (Z.relations(r.pillars) || []).map((x) => `${x.positions}${x.pair}${String(x.type).replace('地支', '')}`);
  const luck0 = (r.luck.rows || [])[0] || null;
  const val = (name) => (en.list.find((x) => x.god === name) || { val: 0 }).val;
  const wealth = val('正财') + val('偏财');
  const spouse = c.birth.gender === 'male' ? wealth : val('正官') + val('七杀');
  const items = sc.items || [];
  return {
    c,
    pillars: r.pillars.join(' '),
    dm: r.dayMaster,
    monthBranch: r.pillars[1][1],
    total: sc.total,
    grade: sc.grade,
    ling: (items[0] || {}).score || 0,
    di: (items[1] || {}).score || 0,
    shi: (items[2] || {}).score || 0,
    topGod: top.god,
    topVal: top.val,
    godsFace,
    geju: gj.primary.name,
    gejuGod: gj.primary.god || '',
    gejuStem: (gj.primary.hidden || {}).stem || '',
    climate: tm.climate,
    relText: rels.length ? rels.slice(0, 2).join('、') : '全盘没有合冲刑害破',
    luck0: luck0 ? `${luck0.pillar}（${luck0.age}岁起）` : '起运信息不足',
    counts: Object.keys(r.counts).map((k) => k + r.counts[k]).join(' '),
    br: r.pillars[2][1],
    p0: r.pillars[0], p1: r.pillars[1], p3: r.pillars[3],
    wealth, spouse, gender: c.birth.gender,
    date: c.birth.date, time: c.birth.time, place: c.birth.place,
    _r: r,
  };
}

/* ---------- 二、每讲主题句：这张盘该拿来看什么 ---------- */
const HINT = {
  L01: '先分清错在历法、口径还是推断', L02: '记录精度决定能推到哪一步', L03: '同一钟点，不同时区是两个瞬间',
  L11: '经度差与均时差都要算进去', L04: '立春前后分属两个命理年', L05: '月柱在交节那一刻才换',
  L06: '先把阴阳五行认全', L07: '地支不是单字，里面还分层', L08: '干支组合有合法与非法之分',
  L09: '年→月→日→时，一步不能跳', L10: '换日边界在子时，不是零点', L12: '十神只相对日主成立',
  L49: '五行、阴阳、相对十神并到一行看', L50: '生不总吉，克不总凶', L51: '合是牵住，冲是撞开，克是压制',
  L52: '本气、中气、余气分量不同', L53: '半合缺一字就不成局', L54: '先看冲在哪两宫，再谈轻重',
  L55: '刑是内耗，害是暗损，破是拆散', L13: '透出来才算明面有，通根才算站得住', L17: '合不等于化，化要有条件',
  L18: '五种关系五种读法，别一句「逢冲必动」', L14: '数五行个数最容易被骗', L56: '把分数拆三栏，看弱在哪一栏',
  L57: '失令未必弱，得令未必旺', L60: '同一张盘两套口径，先看差异在哪', L15: '先问成不成，再问用不用',
  L59: '生克路线决定救应从哪来', L19: '压力与输出怎么互相牵制', L20: '钱、靠山、同辈三方的分配',
  L42: '成格看条件，破格看缺哪一口气', L43: '先学怎么否证，再谈成立', L16: '调候、扶抑、通关不是一回事',
  L58: '三法打架时先救急', L21: '寒暖燥湿先定，再谈补什么', L22: '阳男阴女顺排，起运按三天折一年',
  L32: '先把第一步运手推出来', L31: '同一套结构，男女取星不同', L23: '运管十年，年管一年，月只做窗口',
  L44: '原局、运、年分三层写，不要混', L73: '每步运按八类分析过一遍', L74: '立春年与交运年要取交集',
  L75: '写清为什么，也写清什么情况下不成立', L24: '神煞只作线索，不单独断事', L25: '原文、原注、评注分三层看',
  L26: '事实与解释分栏，别混成一段', L27: '反例比顺例更有用', L28: '先定评分标准，再动笔',
  L29: '每条解释都要能追到依据', L45: '把推理过程写完整，别只给结论', L76: '财富、健康、婚姻三类最容易越界',
  L33: '星与宫分开看，再看是否相合', L34: '财、食伤、比劫合读才准', L36: '官杀是压力也是位置',
  L37: '伤官见官要有制化条件', L38: '主体性看日主有没有根', L40: '同一张盘，两套问法',
  L41: '取法有分歧，分开写清楚', L61: '星、宫、结构三条线一起看', L62: '星到、宫动、窗口三层',
  L63: '财官印食伤怎么配合', L64: '象义只给方向，要靠任务验证', L65: '机会与压力往往同时到',
  L66: '来源、承载、分配、留存四问', L67: '古今富贵标准不同，别直接换算', L68: '五行脏腑只讲倾向，不讲病名',
  L69: '哪些结论不能越界，写清楚', L70: '星与时宫，男女取法有异说', L71: '财印与年月合看',
  L72: '比劫既帮身也分钱', L77: '同一年不止一种解释，要写清取舍', L35: '从核盘到收束，一步不省',
  L39: '同一流程换一套取星', L46: '按十二步走完，别跳步', L47: '不看答案，先自己写一遍',
  L48: '考核的是过程，不是结论漂亮', L30: '整盘作业要有依据也有反证', L78: '八运逐年写完，才算走完一轮',
};

/* ---------- 三、每讲的观察面：决定用哪套句式、优先哪些盘 ---------- */
const FOCUS = {};
const setFocus = (key, ids) => ids.forEach((id) => { FOCUS[id] = key; });
setFocus('time', ['L01', 'L02', 'L03', 'L11', 'L04', 'L05', 'L10']);
setFocus('ganzhi', ['L06', 'L07', 'L08', 'L09', 'L49', 'L52']);
setFocus('tengod', ['L12', 'L13', 'L50', 'L59', 'L19', 'L20', 'L53', 'L51']);
setFocus('relation', ['L17', 'L18', 'L54', 'L55']);
setFocus('strength', ['L14', 'L56', 'L57', 'L60']);
setFocus('geju', ['L15', 'L42', 'L43']);
setFocus('yongshen', ['L16', 'L58', 'L21']);
setFocus('luck', ['L22', 'L32', 'L31', 'L23', 'L44', 'L73', 'L74', 'L75']);
setFocus('method', ['L24', 'L25', 'L26', 'L27', 'L28', 'L29', 'L45', 'L76']);
setFocus('marriage', ['L33', 'L34', 'L36', 'L37', 'L38', 'L40', 'L61', 'L62', 'L77', 'L41']);
setFocus('career', ['L63', 'L64', 'L65']);
setFocus('wealth', ['L66', 'L67']);
setFocus('family', ['L70', 'L71', 'L72']);
setFocus('health', ['L68', 'L69']);
setFocus('demo', ['L35', 'L39', 'L46', 'L47', 'L48', 'L30', 'L78']);

const PREF = {
  time: ['TC19', 'TC20', 'TC21', 'TC22', 'TC10'],
  ganzhi: ['TC16', 'TC17', 'TC18', 'CA20', 'CA45', 'TC10'],
  tengod: ['TC14', 'TC16', 'CA02', 'CA19', 'CA37'],
  relation: ['TC06', 'TC07', 'TC08', 'TC09', 'CA51', 'CA56'],
  strength: ['CA06', 'CA07', 'CA08', 'TC03', 'TC13', 'CA31'],
  geju: ['TC11', 'TC12', 'TC13', 'TC05', 'TC03'],
  yongshen: ['TC01', 'TC02', 'CA41', 'CA46', 'TC17'],
  luck: ['TC15', 'TC13', 'CA16', 'CA11', 'TC01'],
  method: ['TC22', 'TC19', 'TC20', 'TC21', 'TC10'],
  marriage: ['TC04', 'CA24', 'CA36', 'TC05', 'CA11'],
  career: ['CA21', 'CA16', 'TC15', 'CA26', 'TC05'],
  wealth: ['TC03', 'CA11', 'TC14', 'CA01', 'TC15'],
  family: ['TC05', 'CA31', 'CA01', 'TC13', 'TC18'],
  health: ['TC01', 'TC02', 'CA41', 'CA46', 'TC18'],
  demo: ['TC01', 'TC03', 'TC05', 'TC10', 'TC13'],
};

/* 分类组对应的讲次，直接从 caseGroups 读，避免手抄 */
const groupOfLesson = {};
(C.caseGroups || []).forEach((g) => (g.lessons || []).forEach((lid) => {
  (groupOfLesson[lid] = groupOfLesson[lid] || []).push(...g.ids);
}));

/* ---------- 四、句子：主题句 + 现算事实，轮换三种写法 ---------- */
function point(f, lid, i) {
  const h = HINT[lid] || '拿它练一遍本讲的方法';
  const v = i % 3;
  switch (FOCUS[lid]) {
    case 'time':
      return [
        `${h}。这份记录是「${f.date} ${f.time} · ${f.place}」，推到 ${f.pillars}；先定口径，再读结构。`,
        `「${f.date} ${f.time} · ${f.place}」→ ${f.pillars}。${h}，就用它走一遍。`,
        `${f.pillars}，来源「${f.date} ${f.time} · ${f.place}」，每个字都可复算；${h}。`,
      ][v];
    case 'ganzhi':
      return [
        `${h}。此盘日主 ${f.dm}坐${f.br}，月令 ${f.monthBranch}，四柱 ${f.pillars}。`,
        `四柱 ${f.pillars}：${f.dm}日、月令 ${f.monthBranch}。${h}。`,
        `日主${f.dm}、月令${f.monthBranch}；${h}——先用这张盘把字认清。`,
      ][v];
    case 'tengod':
      return [
        `${h}。此盘明面见${f.godsFace.join('、')}，其中${f.topGod}${f.topVal} 最重。`,
        `日主${f.dm}，明面${f.godsFace.join('、')}；${f.topGod}${f.topVal} 居首。${h}。`,
        `${h}：${f.dm}日见${f.godsFace.join('、')}，先把相对关系摆正。`,
      ][v];
    case 'relation':
      return [
        `${h}。此盘${f.relText}，四柱 ${f.pillars}。`,
        `四柱 ${f.pillars}，盘上${f.relText}——${h}。`,
        `${h}：${f.relText}。关系先列全，再判轻重。`,
      ][v];
    case 'strength':
      return [
        `${h}。此盘${f.total}分：得令${f.ling}/40、得地${f.di}/35、得势${f.shi}/25。`,
        `${f.total}分（${f.ling}／${f.di}／${f.shi}），落到「${f.grade}」。${h}。`,
        `${h}：三栏拆开看 ${f.ling}／${f.di}／${f.shi}，合计${f.total}，等级${f.grade}。`,
      ][v];
    case 'geju':
      return [
        `${h}。月令${f.monthBranch}本气为 ${f.gejuStem}（${f.gejuGod}），先按「${f.geju}」看。`,
        `月令${f.monthBranch}、本气 ${f.gejuStem}，取「${f.geju}」。${h}。`,
        `${h}：此盘拟「${f.geju}」，成不成要看透不透、有没有救。`,
      ][v];
    case 'yongshen':
      return [
        `${h}。此盘调候作「${f.climate}」，${f.topGod}${f.topVal} 最重，扶抑与调候要分开算。`,
        `${f.dm}日生${f.monthBranch}月，调候「${f.climate}」；${h}。`,
        `${h}：${f.climate}局、${f.topGod}${f.topVal} 当头，先定调候再谈扶抑。`,
      ][v];
    case 'luck':
      return [
        `${h}。此盘首运${f.luck0}，四柱 ${f.pillars}，可用来对起运折算。`,
        `首运${f.luck0}，原局 ${f.pillars}；${h}。`,
        `${h}：从${f.luck0}这一步开始，一年一年对下去。`,
      ][v];
    case 'method':
      return [
        `${h}。四柱 ${f.pillars} 每个字都能复算，正好练「先写事实、再写推断」。`,
        `事实：${f.pillars}、${f.total} 分。解释另起一行。${h}。`,
        `${h}：这张盘的结构是 ${f.pillars}，把能证的和不能证的分开写。`,
      ][v];
    case 'marriage':
      return [
        `${h}。此盘日支${f.br}，${f.gender === 'male' ? '财星' : '官杀'}共 ${f.spouse.toFixed(1)}，${f.spouse >= 1 ? '明面上有位置' : '主要在支里' }。`,
        `日支${f.br}、${f.pillars}；${h}。`,
        `${h}：日支${f.br}，配偶星合计 ${f.spouse.toFixed(1)}，星与宫要分开说。`,
      ][v];
    case 'career':
      return [
        `${h}。此盘明面${f.godsFace.join('、')}，${f.topGod}最重，先看这一路能不能用。`,
        `${f.dm}日，明面十神${f.godsFace.join('、')}；${h}。`,
        `${h}：${f.pillars}，把${f.topGod}这条线先走通，再谈别的路。`,
      ][v];
    case 'wealth':
      return [
        `${h}。此盘财星${f.wealth.toFixed(1)}，日主${f.total}分，财与身要对比着看。`,
        `财星${f.wealth.toFixed(1)}、日主${f.total}分（${f.grade}）；${h}。`,
        `${h}：财${f.wealth.toFixed(1)}对身${f.total}分，先问扛不扛得住。`,
      ][v];
    case 'health':
      return [
        `${h}。五行${f.counts}，调候作「${f.climate}」，偏在哪一行一目了然。`,
        `五行${f.counts}、调候「${f.climate}」；${h}。`,
        `${h}：${f.dm}日生${f.monthBranch}月，五行${f.counts}，日常提示从这里来。`,
      ][v];
    case 'family':
      return [
        `${h}。此盘年柱${f.p0}、月柱${f.p1}、时柱${f.p3}，三处各有分属。`,
        `年${f.p0}、月${f.p1}、时${f.p3}；${h}。`,
        `${h}：年月时三柱 ${f.p0}／${f.p1}／${f.p3}，先分清哪一柱管谁。`,
      ][v];
    default:
      return [
        `${h}。四柱 ${f.pillars}，${f.total}分、${f.grade}——整盘示范就从这句开始。`,
        `${f.pillars}，${f.total}分（${f.grade}）；${h}。`,
        `${h}：原局 ${f.pillars} 摆好，一步一步往下推。`,
      ][v];
  }
}

/* ---------- 五、选盘 ---------- */
const facts = new Map(cases.map((c) => [c.id, factsOf(c)]));
const usage = new Map();
const lessonText = new Map(lessons.map((l) => [l.id, [l.title, l.deep_heading || '', (l.paragraphs || []).join(''), l.body || '', l.objective || ''].join(' ')]));

function tagScore(lid, c) {
  const text = lessonText.get(lid) || '';
  let n = 0;
  (c.tags || []).forEach((t) => { if (t && text.includes(t)) n += 1; });
  if (text.includes(c.name)) n += 3;
  return n;
}

const out = {};
lessons.forEach((l) => {
  const keep = (handMade[l.id] || []).slice();
  const ids = keep.map((r) => r.id);
  const need = Math.max(0, 5 - keep.length);
  if (need > 0) {
    const pool = [];
    cases.forEach((c) => {
      if (ids.includes(c.id)) return;
      let s = 0;
      if ((groupOfLesson[l.id] || []).includes(c.id)) s += 60;
      if ((PREF[FOCUS[l.id]] || []).includes(c.id)) s += 40;
      s += tagScore(l.id, c) * 8;
      if (c.kind === '公开档案') s += 6;
      s -= (usage.get(c.id) || 0) * 12;
      pool.push([s, c.id]);
    });
    pool.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
    pool.slice(0, need).forEach(([, id]) => { ids.push(id); });
  }
  // 旧映射里有一批只是「类别 · 分类案例」的占位，信息量为零，一并按模板重写
  const weak = (t) => !t || t.length < 14 || /·\s*分类案例$/.test(t);
  const refs = [];
  let autoIdx = 0;
  ids.forEach((id) => {
    const kept = keep.find((r) => r.id === id);
    if (kept && !weak(kept.point)) { refs.push(kept); }
    else { refs.push({ id, point: point(facts.get(id), l.id, autoIdx++) }); }
    usage.set(id, (usage.get(id) || 0) + 1);
  });
  out[l.id] = refs;
});

const counts = Object.values(out).map((r) => r.length);
const stats = {
  version: '1.1',
  lessons: Object.keys(out).length,
  cases: cases.length,
  min: Math.min(...counts),
  max: Math.max(...counts),
  avg: +(counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2),
  total: counts.reduce((a, b) => a + b, 0),
  hand: Object.values(handMade).reduce((a, r) => a + r.length, 0),
  generatedAt: new Date().toISOString().slice(0, 10),
};

const body = `/* 讲义配套案例扩展表（每讲至少五盘）
   由 tools/gen-case-map.cjs 生成，请勿手改——改完跑一遍生成器与 npm test。
   手写映射保留在原位；补充的条目其「与本讲的关系」由本讲主题句 + 该盘现算事实拼成，
   四柱、分数、十神、关系、起运均来自 engine.js / extra.js，不含编造的生平事件。 */
(() => {
  'use strict';
  const C = (typeof window !== 'undefined' ? window : globalThis).ZIPING_CONTENT;
  if (!C) return;
  C.caseMap = ${JSON.stringify(out)};
  C.caseMapStats = ${JSON.stringify(stats)};
  C.caseMapVersion = '${stats.version}';
})();
`;

fs.writeFileSync(path.join(ROOT, 'case-map.js'), body, 'utf8');
console.log(JSON.stringify(stats, null, 1));
const dist = {};
counts.forEach((n) => { dist[n] = (dist[n] || 0) + 1; });
console.log('每个讲次的盘数分布', dist);
console.log('样例 L56:', out.L56.map((r) => r.point).slice(0, 3));
console.log('样例 L18:', out.L18.map((r) => r.id + ' ' + r.point.slice(0, 30)));
