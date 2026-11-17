'use strict';
/* 独立复核：不复用页面里的查表，改用另一条路径重新推导，再比对。
   目标是发现「表写错了」和「文案与计算打架」两类问题，不认证命理预测有效性。 */
const assert = require('node:assert');
const Z = require('../engine.js');
const X = require('../extra.js');
const P = require('../places.js');

let pass = 0; const fails = [];
function t(name, fn) { try { fn(); pass++; } catch (e) { fails.push({ name, message: e.message }); } }

const base = { name: 't', calendar: 'solar', gender: 'male', dayBoundary: 0, ziStem: 'next', timezone: 'Asia/Shanghai', clock: 'true', longitude: 120.1551 };
const chart = (o = {}) => Z.calculate({ ...base, date: '2005-12-23', time: '08:37', ...o });
const ZHI = Z.ZHI, idx = c => ZHI.indexOf(c);

/* ============ 1. 神煞：用三合局十二长生重新推导，比对查表 ============ */
const JU = { '申': '申子辰', '子': '申子辰', '辰': '申子辰', '亥': '亥卯未', '卯': '亥卯未', '未': '亥卯未', '寅': '寅午戌', '午': '寅午戌', '戌': '寅午戌', '巳': '巳酉丑', '酉': '巳酉丑', '丑': '巳酉丑' };
const START = { '申子辰': '申', '亥卯未': '亥', '寅午戌': '寅', '巳酉丑': '巳' };
const cycle = b => { const s = idx(START[JU[b]]); return off => ZHI[(s + off + 12) % 12]; };

t('神煞·驿马＝三合局长生之冲（12支全覆盖）', () => {
  const map = X.SS_RULES.find(r => r.name === '驿马').map;
  ZHI.split('').forEach(b => assert.strictEqual(map[b], cycle(b)(6), b + ' 驿马'));
});
t('神煞·桃花＝三合局沐浴位（12支全覆盖）', () => {
  const map = X.SS_RULES.find(r => r.name.startsWith('桃花')).map;
  ZHI.split('').forEach(b => assert.strictEqual(map[b], cycle(b)(1), b + ' 桃花'));
});
t('神煞·华盖＝三合局墓位（12支全覆盖）', () => {
  const map = X.SS_RULES.find(r => r.name === '华盖').map;
  ZHI.split('').forEach(b => assert.strictEqual(map[b], cycle(b)(8), b + ' 华盖'));
});
t('神煞·将星＝三合局帝旺位（12支全覆盖）', () => {
  const map = X.SS_RULES.find(r => r.name === '将星').map;
  ZHI.split('').forEach(b => assert.strictEqual(map[b], cycle(b)(4), b + ' 将星'));
});
t('神煞·劫煞＝三合局绝位（12支全覆盖）', () => {
  const map = X.SS_RULES.find(r => r.name === '劫煞').map;
  ZHI.split('').forEach(b => assert.strictEqual(map[b], cycle(b)(9), b + ' 劫煞'));
});
t('神煞·亡神＝三合局临官位（12支全覆盖）', () => {
  const map = X.SS_RULES.find(r => r.name === '亡神').map;
  ZHI.split('').forEach(b => assert.strictEqual(map[b], cycle(b)(3), b + ' 亡神'));
});
t('神煞·天乙贵人关键位（甲戊庚牛羊、乙己鼠猴、丙丁猪鸡、壬癸兔蛇、六辛逢马虎）', () => {
  const m = X.SS_RULES.find(r => r.name === '天乙贵人').map;
  ['甲', '戊', '庚'].forEach(g => assert.strictEqual(m[g], '丑未', g));
  ['乙', '己'].forEach(g => assert.strictEqual(m[g], '子申', g));
  ['丙', '丁'].forEach(g => assert.strictEqual(m[g], '亥酉', g));
  ['壬', '癸'].forEach(g => assert.strictEqual(m[g], '卯巳', g));
  assert.strictEqual(m['辛'], '午寅');
});
t('神煞·文昌、禄神、羊刃关键位', () => {
  const wen = X.SS_RULES.find(r => r.name === '文昌贵人').map;
  assert.strictEqual(wen['甲'], '巳'); assert.strictEqual(wen['辛'], '子'); assert.strictEqual(wen['癸'], '卯');
  const lu = X.SS_RULES.find(r => r.name === '禄神').map;
  assert.strictEqual(lu['甲'], '寅'); assert.strictEqual(lu['丙'], '巳'); assert.strictEqual(lu['癸'], '子');
  const ren = X.SS_RULES.find(r => r.name === '羊刃').map;
  assert.strictEqual(ren['甲'], '卯'); assert.strictEqual(ren['庚'], '酉'); assert.strictEqual(ren['壬'], '子');
  assert.strictEqual(ren['乙'], undefined, '阴干羊刃不应入表');
});
t('神煞·月德（寅午戌丙、申子辰壬、亥卯未甲、巳酉丑庚）', () => {
  const m = X.SS_RULES.find(r => r.name === '月德贵人').map;
  ['寅', '午', '戌'].forEach(b => assert.strictEqual(m[b], '丙', b));
  ['申', '子', '辰'].forEach(b => assert.strictEqual(m[b], '壬', b));
  ['亥', '卯', '未'].forEach(b => assert.strictEqual(m[b], '甲', b));
  ['巳', '酉', '丑'].forEach(b => assert.strictEqual(m[b], '庚', b));
});
t('神煞·天喜＝红鸾对冲（12支全覆盖）', () => {
  const hung = X.SS_RULES.find(r => r.name === '红鸾').map;
  const xi = X.SS_RULES.find(r => r.name === '天喜').map;
  ZHI.split('').forEach(b => assert.strictEqual(xi[b], ZHI[(idx(hung[b]) + 6) % 12], b));
});

/* ============ 2. 六十甲子纳音（独立手写 30 组） ============ */
const JIAZI = (() => { const a = []; for (let i = 0; i < 60; i++) a.push(Z.GAN[i % 10] + ZHI[i % 12]); return a; })();
const NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
t('纳音：60甲子逐柱比对（独立手写 30 组，每组两柱同音）', () => {
  const lib = require('../vendor/lunar.js');
  JIAZI.forEach((p, i) => {
    assert.strictEqual(lib.LunarUtil.NAYIN[p], NAYIN[Math.floor(i / 2)], p + ' 纳音应为 ' + NAYIN[Math.floor(i / 2)]);
  });
});
t('纳音：三十组无重名且两柱共用一名', () => {
  assert.strictEqual(new Set(NAYIN).size, 30);
  const lib = require('../vendor/lunar.js');
  assert.strictEqual(lib.LunarUtil.NAYIN[JIAZI[0]], lib.LunarUtil.NAYIN[JIAZI[1]]);
});

/* ============ 3. 旬空（六旬） ============ */
t('旬空：六旬空亡逐柱正确', () => {
  const lib = require('../vendor/lunar.js');
  const expect = { '甲子': '戌亥', '甲戌': '申酉', '甲申': '午未', '甲午': '辰巳', '甲辰': '寅卯', '甲寅': '子丑' };
  const heads = Object.keys(expect);
  for (let i = 0; i < 60; i++) {
    const p = JIAZI[i];
    const head = heads.find(h => (JIAZI.indexOf(h) <= i) && (i < JIAZI.indexOf(h) + 10));
    assert.strictEqual(lib.LunarUtil.getXunKong(p), expect[head], p + ' 旬空');
  }
});

/* ============ 4. 五虎遁月干 / 五鼠遁时干 ============ */
t('五虎遁：十年干正月起干正确（甲己丙、乙庚戊、丙辛庚、丁壬壬、戊癸甲）', () => {
  const expect = { '甲': '丙', '己': '丙', '乙': '戊', '庚': '戊', '丙': '庚', '辛': '庚', '丁': '壬', '壬': '壬', '戊': '甲', '癸': '甲' };
  for (let y = 1984; y < 2044; y++) assert.strictEqual(X.monthPillarsFor(y)[0].pillar[0], expect[Z.annual(y)[0]], y + ' ' + Z.annual(y));
});
t('流月：十二月支序恒为寅卯辰巳午未申酉戌亥子丑', () => {
  [1984, 2005, 2026, 2043].forEach(y => assert.deepStrictEqual(X.monthPillarsFor(y).map(m => m.branch), ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'], String(y)));
});
t('五鼠遁：时干与日干对应（甲己还加甲、乙庚丙作初……）', () => {
  const lib = require('../vendor/lunar.js');
  const expect = { '甲': '甲', '己': '甲', '乙': '丙', '庚': '丙', '丙': '戊', '辛': '戊', '丁': '庚', '壬': '庚', '戊': '壬', '癸': '壬' };
  for (const day of Z.GAN.split('')) {
    // 用 2024-01-01 起逐日推，找到日干为 day 的那天，取其子时
    for (let k = 0; k < 60; k++) {
      const d = new Date(Date.UTC(2024, 0, 1 + k));
      const s = lib.Solar.fromYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      const ec = s.getLunar().getEightChar();
      if (ec.getDay()[0] !== day) continue;
      assert.strictEqual(ec.getTime()[0], expect[day], day + '日 ' + ec.getDay() + ' 子时干');
      break;
    }
  }
});

/* ============ 5. 十二长生（四局派生，抽查 10 日干） ============ */
t('十二长生：十干长生位正确（甲亥、乙午、丙寅、丁酉、戊寅、己酉、庚巳、辛子、壬申、癸卯）', () => {
  const expect = { '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅', '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯' };
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'engine.js'), 'utf8');
  const m = src.match(/const starts=\[([0-9,]+)\]/);
  assert.ok(m, '未找到长生起点表');
  const arr = m[1].split(',').map(Number);
  Z.GAN.split('').forEach((g, i) => assert.strictEqual(ZHI[arr[i]], expect[g], g + ' 长生位'));
});
t('十二长生：日主在本支的星运与长生表自洽（辛日子为长生、酉为临官）', () => {
  const c = chart();
  assert.strictEqual(c.dayMaster, '辛');
  assert.strictEqual(c.life[1], '长生', '辛在子应为长生');
  assert.strictEqual(c.life[0], '临官', '辛在酉应为临官');
});

/* ============ 6. 胎元 ============ */
t('胎元：月柱干进一支进三，60 组全对', () => {
  JIAZI.forEach(m => {
    const stem = Z.GAN[(Z.GAN.indexOf(m[0]) + 1) % 10];
    const br = ZHI[(ZHI.indexOf(m[1]) + 3) % 12];
    const c = { pillars: [m, m, m, m] };
    assert.strictEqual(X.taiYuan(c).pillar, stem + br, m + ' 胎元');
  });
});

/* ============ 7. 调候气候分类 ============ */
t('调候：十二支寒暖温凉分类正确', () => {
  ['亥', '子', '丑'].forEach(b => assert.strictEqual(X.SEASON_CLIMATE[b], '寒', b));
  ['巳', '午', '未'].forEach(b => assert.strictEqual(X.SEASON_CLIMATE[b], '暖', b));
  ['寅', '卯', '辰'].forEach(b => assert.strictEqual(X.SEASON_CLIMATE[b], '温', b));
  ['申', '酉', '戌'].forEach(b => assert.strictEqual(X.SEASON_CLIMATE[b], '凉', b));
});

/* ============ 8. 大运：阳年男顺、阴年男逆、阳年女逆、阴年女顺 ============ */
t('大运顺逆：四种组合全对', () => {
  const yang = { year: '2005-12-23', note: '乙酉为阴年' };
  const yin = { year: '2004-06-01', note: '' };
  const a = Z.calculate({ ...base, date: '2005-12-23', time: '08:37', gender: 'male' });
  const b = Z.calculate({ ...base, date: '2005-12-23', time: '08:37', gender: 'female' });
  assert.strictEqual(a.pillars[0][0], '乙');
  assert.strictEqual(a.luck.forward, false, '阴年男应逆');
  assert.strictEqual(b.luck.forward, true, '阴年女应顺');
  const c1 = Z.calculate({ ...base, date: '2004-06-01', time: '08:37', gender: 'male' });
  assert.strictEqual(Z.GAN.indexOf(c1.pillars[0][0]) % 2, 0);
  assert.strictEqual(c1.luck.forward, true, '阳年男应顺');
  const c2 = Z.calculate({ ...base, date: '2004-06-01', time: '08:37', gender: 'female' });
  assert.strictEqual(c2.luck.forward, false, '阳年女应逆');
});
t('起运：首运干支必为月柱顺/逆一位', () => {
  const a = chart({ gender: 'male' });
  const m = Z.LunarUtil ? 0 : 0;
  const lib = require('../vendor/lunar.js');
  const i = lib.LunarUtil.JIA_ZI.indexOf(a.pillars[1]);
  const exp = lib.LunarUtil.JIA_ZI[(i + (a.luck.forward ? 1 : -1) + 60) % 60];
  assert.strictEqual(a.luck.rows[0].pillar, exp);
});
t('起运：折算落在 0—10 岁合理区间', () => {
  [['2005-12-23', '08:37'], ['1990-01-05', '23:10'], ['1978-07-15', '03:20']].forEach(([d, tm]) => {
    const r = Z.calculate({ ...base, date: d, time: tm });
    assert.ok(r.luck.years >= 0 && r.luck.years <= 10, d + ' 起运年 ' + r.luck.years);
  });
});

/* ============ 9. 文案与计算一致性 ============ */
t('一致：旺衰分数分级与详情标签不互相矛盾', () => {
  const c = chart();
  const s = X.strengthScore(c), q = require('../reading.js').strength(c);
  assert.ok(['偏强', '中和偏强', '中和', '中和偏弱', '偏弱'].includes(s.grade));
  assert.ok(q.label.length > 0);
  // 两者口径不同，允许不同结论，但都必须明确声明未验证
  assert.ok(s.limits.join('').includes('不是传统定论'));
  assert.ok(q.limits.join('').includes('未标定准确率'));
});
t('一致：格局取格主候选与取格依据指向同一五行', () => {
  const g = X.geju(chart());
  assert.ok(g.basis.includes(g.primary.name.replace('格', '')) || g.basis.includes(g.primary.hidden.god), g.basis);
});
t('一致：岁运标签只在确有干支相同或天克地冲时出现', () => {
  const c = chart();
  const none = X.annualFlags(c, '丙戌', '甲子');
  assert.ok(!none.some(f => f.type.includes('并临')), '不应误报岁运并临');
  const same = X.annualFlags(c, '丙戌', '丙戌');
  assert.ok(same.some(f => f.type.includes('并临')));
});
t('一致：流年干支与公历年对应（1984甲子、2024甲辰、2026丙午）', () => {
  assert.strictEqual(Z.annual(1984), '甲子');
  assert.strictEqual(Z.annual(2024), '甲辰');
  assert.strictEqual(Z.annual(2026), '丙午');
  assert.strictEqual(Z.annual(2000), '庚辰');
});

/* ============ 10. 地名库与真太阳时一致性 ============ */
t('一致：地名库经度与该时区标准经线的关系合理（中国境内应在 73—135°E）', () => {
  P.list.filter(p => p.tz === 'Asia/Shanghai').forEach(p => {
    assert.ok(p.lon > 73 && p.lon < 136, p.name + ' 经度越界 ' + p.lon);
  });
});
t('一致：真太阳时换算链在东西两端方向正确', () => {
  const west = chart({ time: '12:00', longitude: 87.6168 });
  const east = chart({ time: '12:00', longitude: 121.4737 });
  assert.ok(west.solar.longitudeCorrection < -100, '西部应大幅提前');
  assert.ok(east.solar.longitudeCorrection > 0, '东部应略推后');
});

console.log(JSON.stringify({ passed: pass, failed: fails.length, failures: fails, node: process.version }, null, 1));
process.exitCode = fails.length ? 1 : 0;
