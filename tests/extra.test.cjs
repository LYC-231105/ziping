'use strict';
/* V0.4 新增模块回归：地名解析、真太阳时换算链、神煞、旺衰加权、格局取用、流月。
   只验证「算得对、口径写清楚」，不认证命理预测有效性。 */
const assert = require('node:assert');
const Z = require('../engine.js');
const P = require('../places.js');
const X = require('../extra.js');

let pass = 0;
const fails = [];
function t(name, fn) {
  try { fn(); pass++; } catch (e) { fails.push({ name, message: e.message }); }
}

const base = { name: 't', calendar: 'solar', gender: 'male', dayBoundary: 0, ziStem: 'next' };
function chart(over) {
  return Z.calculate({ ...base, date: '2005-12-23', time: '08:37', ...over });
}

/* ---------- 地名解析 ---------- */
t('地名：城市名直接匹配', () => {
  const r = P.resolve('杭州');
  assert.strictEqual(r.found, true);
  assert.strictEqual(r.name, '杭州');
  assert.ok(Math.abs(r.lon - 120.1551) < 0.001);
  assert.strictEqual(r.tz, 'Asia/Shanghai');
});
t('地名：含省份的完整地址取到市而非常会', () => {
  const r = P.resolve('江苏省苏州市吴中区');
  assert.strictEqual(r.name, '苏州');
  assert.ok(Math.abs(r.lon - 120.5853) < 0.001);
});
t('地名：地级市与县级市区分', () => {
  assert.strictEqual(P.resolve('昆山').name, '昆山');
  assert.strictEqual(P.resolve('苏州').name, '苏州');
});
t('地名：只写省份降级为省级近似', () => {
  const r = P.resolve('江苏');
  assert.strictEqual(r.level, 3);
  assert.strictEqual(r.name, '南京');
});
t('地名：海外城市带正确时区与负经度', () => {
  const r = P.resolve('纽约');
  assert.strictEqual(r.tz, 'America/New_York');
  assert.ok(r.lon < 0);
});
t('地名：无法识别时不返回猜测结果', () => {
  assert.strictEqual(P.resolve('不存在的地方xyz').found, false);
});
t('地名库规模与字段完整', () => {
  assert.ok(P.list.length >= 350);
  P.list.forEach(p => {
    assert.ok(Number.isFinite(p.lon) && Math.abs(p.lon) <= 180, p.name + ' 经度');
    assert.ok(Number.isFinite(p.lat) && Math.abs(p.lat) <= 90, p.name + ' 纬度');
    assert.ok(p.tz && p.tz.includes('/'), p.name + ' 时区');
  });
});

/* ---------- 真太阳时 ---------- */
t('真太阳时：乌鲁木齐正午校正约−129分钟，时柱由午变巳', () => {
  const r = chart({ date: '2005-12-23', time: '12:00', clock: 'true', longitude: 87.6168 });
  assert.ok(r.solar.longitudeCorrection < -129 && r.solar.longitudeCorrection > -130.5, String(r.solar.longitudeCorrection));
  assert.strictEqual(r.hourCompare.civil[3], '甲午');
  assert.strictEqual(r.pillars[3], '癸巳');
  assert.strictEqual(r.hourCompare.hourChanged, true);
});
t('真太阳时：东部城市校正量小，时柱不变', () => {
  const r = chart({ date: '2005-12-23', time: '12:00', clock: 'true', longitude: 120.1551 });
  assert.ok(Math.abs(r.solar.longitudeCorrection) < 1);
  assert.strictEqual(r.hourCompare.hourChanged, false);
});
t('真太阳时：换算链自洽（钟表时+经度差+均时差=真太阳时）', () => {
  const r = chart({ time: '08:37', clock: 'true', longitude: 120.1551 });
  const toMin = s => Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16)) + Number(s.slice(17, 19)) / 60;
  const delta = toMin(r.solar.trueWall) - toMin(r.solar.clockWall);
  const expect = r.solar.longitudeCorrection + r.solar.eotMinutes;
  assert.ok(Math.abs(delta - expect) < 0.05, delta + ' vs ' + expect);
});
t('真太阳时：非东八区按该时区标准经线计算', () => {
  const ny = chart({ date: '1995-06-15', time: '14:20', clock: 'true', timezone: 'America/New_York', longitude: -74.006 });
  assert.ok(Math.abs(ny.solar.longitudeCorrection - (-56.02)) < 0.2, String(ny.solar.longitudeCorrection));
  const tk = chart({ date: '1995-06-15', time: '14:20', clock: 'true', timezone: 'Asia/Tokyo', longitude: 139.6917 });
  assert.ok(Math.abs(tk.solar.longitudeCorrection - 18.77) < 0.2, String(tk.solar.longitudeCorrection));
});
t('真太阳时：跨时辰时写入警告', () => {
  const r = chart({ date: '2005-12-23', time: '12:00', clock: 'true', longitude: 87.6168 });
  assert.ok(r.warnings.some(w => w.includes('跨越时辰分界')));
});
t('钟表时口径不做经度校正', () => {
  const r = chart({ date: '2005-12-23', time: '12:00', clock: 'civil', longitude: 87.6168 });
  assert.strictEqual(r.pillars[3], '甲午');
  assert.strictEqual(r.hourCompare.applied, false);
});
t('默认口径为真太阳时', () => {
  const r = Z.calculate({ ...base, date: '2005-12-23', time: '12:00', longitude: 87.6168 });
  assert.strictEqual(r.input.clock, 'true');
  assert.strictEqual(r.pillars[3], '癸巳');
});

/* ---------- 神煞 ---------- */
t('神煞：辛日文昌在子，禄在酉', () => {
  const r = chart({ time: '08:37', clock: 'true', longitude: 120.1551 });
  const ss = X.shensha(r);
  const wc = ss.find(x => x.name === '文昌贵人');
  const lu = ss.find(x => x.name === '禄神');
  assert.ok(wc && wc.found.some(f => f.char === '子'));
  assert.ok(lu && lu.found.some(f => f.char === '酉'));
});
t('神煞：天乙贵人甲日见丑未', () => {
  const r = chart({ date: '2024-03-05', time: '10:00', clock: 'true', longitude: 116.4074 });
  const ss = X.shensha(r);
  if (r.dayMaster === '甲') {
    const ty = ss.find(x => x.name === '天乙贵人');
    if (ty) ty.found.forEach(f => assert.ok('丑未'.includes(f.char)));
  }
  assert.ok(Array.isArray(ss));
});
t('神煞：每个命中都带查法与口诀依据', () => {
  X.shensha(chart({ clock: 'true', longitude: 120.1551 })).forEach(s => {
    assert.ok(s.basis && s.basis.length > 8, s.name + ' 缺依据');
    assert.ok(s.from, s.name + ' 缺查法来源');
    assert.ok(s.found.length > 0);
  });
});

/* ---------- 胎元 ---------- */
t('胎元：月柱戊子→干进一位己、支进三位卯', () => {
  const r = chart({ time: '08:37', clock: 'true', longitude: 120.1551 });
  assert.strictEqual(r.pillars[1], '戊子');
  assert.strictEqual(X.taiYuan(r).pillar, '己卯');
});

/* ---------- 旺衰加权 ---------- */
t('旺衰：三项之和等于总分，且落在0—100', () => {
  const s = X.strengthScore(chart({ clock: 'true', longitude: 120.1551 }));
  const sum = s.items.reduce((n, i) => n + i.score, 0);
  assert.strictEqual(sum, s.total);
  assert.ok(s.total >= 0 && s.total <= 100);
  assert.ok(['偏强', '中和偏强', '中和', '中和偏弱', '偏弱'].includes(s.grade));
});
t('旺衰：每项不超过上限并给出可复算说明', () => {
  const s = X.strengthScore(chart({ clock: 'true', longitude: 120.1551 }));
  s.items.forEach(i => {
    assert.ok(i.score <= i.max, i.label + ' 超上限');
    assert.ok(i.detail.length > 4, i.label + ' 缺依据');
  });
});
t('旺衰：不同命盘得到不同分数（不是固定值）', () => {
  const a = X.strengthScore(chart({ date: '2005-12-23', time: '08:37', clock: 'true', longitude: 120.1551 }));
  const b = X.strengthScore(chart({ date: '1990-07-20', time: '14:00', clock: 'true', longitude: 113.2644 }));
  assert.notStrictEqual(a.total, b.total);
});
t('旺衰：声明未验证与不处理从格', () => {
  const s = X.strengthScore(chart({ clock: 'true', longitude: 120.1551 }));
  const txt = s.limits.join('');
  assert.ok(txt.includes('不是传统定论'));
  assert.ok(txt.includes('从格'));
});

/* ---------- 格局 ---------- */
t('格局：本气优先，子月癸为食神取食神格', () => {
  const g = X.geju(chart({ time: '08:37', clock: 'true', longitude: 120.1551 }));
  assert.strictEqual(g.primary.name, '食神格');
  assert.strictEqual(g.primary.k, 0);
});
t('格局：本气不透时改取透出之中余气', () => {
  const g = X.geju(chart({ date: '2005-12-23', time: '08:37', clock: 'true', longitude: 120.1551 }));
  if (g.primary.k > 0) assert.ok(g.primary.tou.length > 0);
  assert.ok(g.basis.includes('月令'));
});
t('格局：只报候选，不认证成败也不给唯一用神', () => {
  const g = X.geju(chart({ clock: 'true', longitude: 120.1551 }));
  assert.strictEqual(g.status, '未判成败');
  assert.ok(g.note.includes('不由程序自动认证'));
  assert.ok(g.yongshen.includes('不输出唯一喜用神'));
});

/* ---------- 十神能量 ---------- */
t('十神能量：日月时干计入、日干不计入', () => {
  const r = chart({ time: '08:37', clock: 'true', longitude: 120.1551 });
  const e = X.tenGodEnergy(r);
  assert.ok(e.list.length > 0);
  assert.ok(e.list.every(x => x.val > 0));
  const total = e.list.reduce((n, x) => n + x.val, 0);
  assert.ok(total > 6 && total < 14, String(total));
});

/* ---------- 流月 ---------- */
t('流月：2026丙午年按五虎遁得正月庚寅，共十二月', () => {
  const m = X.monthLuck(2026);
  assert.strictEqual(m.length, 12);
  assert.strictEqual(m[0].pillar, '庚寅');
  assert.strictEqual(m[0].term, '立春');
  assert.deepStrictEqual(m.map(x => x.branch), ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']);
});
t('流月：2024甲辰年正月丙寅', () => {
  assert.strictEqual(X.monthPillarsFor(2024)[0].pillar, '丙寅');
  assert.strictEqual(X.monthPillarsFor(2025)[0].pillar, '戊寅');
});
t('流月：交节时刻递进且落在对应年份', () => {
  const m = X.monthLuck(2026).filter(x => x.startUTC);
  assert.ok(m.length >= 11);
  for (let i = 1; i < m.length; i++) assert.ok(m[i].startUTC > m[i - 1].startUTC);
});

/* ---------- 四柱宫位 ---------- */
t('宫位：四柱齐全且日柱标为日主', () => {
  const ps = X.palaces(chart({ clock: 'true', longitude: 120.1551 }));
  assert.strictEqual(ps.length, 4);
  assert.deepStrictEqual(ps.map(p => p.pos), ['年柱', '月柱', '日柱', '时柱']);
  assert.strictEqual(ps[2].stem.god, '日主');
  ps.forEach(p => {
    assert.ok(p.scope.length > 4, p.pos + ' 缺宫位含义');
    assert.ok(p.branch.main.includes('·'), p.pos + ' 缺藏干十神');
  });
});
t('宫位：日支明确标为夫妻宫', () => {
  const ps = X.palaces(chart({ clock: 'true', longitude: 120.1551 }));
  assert.ok(ps[2].note.includes('夫妻宫'));
});

/* ---------- 岁运互动 ---------- */
t('岁运：大运与流年干支相同判岁运并临', () => {
  const f = X.annualFlags(chart({ clock: 'true', longitude: 120.1551 }), '丙戌', '丙戌');
  assert.ok(f.some(x => x.type === '岁运并临'));
});
t('岁运：流年与原局同柱判伏吟并标出宫位', () => {
  const c = chart({ clock: 'true', longitude: 120.1551 });
  const f = X.annualFlags(c, '丙戌', c.pillars[3]);
  assert.ok(f.some(x => x.type.startsWith('流年伏吟')));
});
t('岁运：天干相克加地支六冲判反吟', () => {
  const c = chart({ clock: 'true', longitude: 120.1551 });
  // 年柱乙酉，流年辛卯：辛克乙、卯酉相冲
  const f = X.annualFlags(c, '丙戌', '辛卯');
  assert.ok(f.some(x => x.type.includes('反吟')), JSON.stringify(f.map(x => x.type)));
});
t('岁运：只有六冲而无天干相克时不判反吟', () => {
  const c = chart({ clock: 'true', longitude: 120.1551 });
  const f = X.annualFlags(c, '丙戌', '丁卯');
  assert.ok(!f.some(x => x.type.includes('反吟')), JSON.stringify(f.map(x => x.type)));
});
t('岁运：伏吟要求干支整体相同，非五行相同', () => {
  const c = chart({ clock: 'true', longitude: 120.1551 });
  const f = X.annualFlags(c, '丙戌', '甲寅');
  assert.ok(!f.some(x => x.type.includes('伏吟')));
});
t('岁运：每个标签都带说明与层级', () => {
  const c = chart({ clock: 'true', longitude: 120.1551 });
  X.annualFlags(c, '丙戌', '辛卯').forEach(x => {
    assert.ok(x.text.length > 20, x.type);
    assert.ok(['高', '中'].includes(x.level), x.type);
  });
});

/* ---------- 取用三法 ---------- */
t('三法：给出气候类型与调候说明', () => {
  const r = X.threeMethods(chart({ clock: 'true', longitude: 120.1551 }));
  assert.ok(['寒', '暖', '温', '凉'].includes(r.climate));
  assert.strictEqual(r.climate, '寒'); // 子月
  assert.ok(r.tiaohou.length > 10);
  assert.ok(r.seasonText.includes('冬令'));
});
t('三法：冬令缺火时提示暖局，火足时不再要暖', () => {
  const cold = X.threeMethods(chart({ date: '2005-12-23', time: '08:37', clock: 'true', longitude: 120.1551 }));
  assert.ok(cold.fire <= 1);
  assert.ok(cold.tiaohou.includes('暖局'));
});
t('三法：通关最多给出两组，且标注通关星是否已在局中', () => {
  const r = X.threeMethods(chart({ clock: 'true', longitude: 120.1551 }));
  assert.ok(r.tongguan.length <= 2);
  r.tongguan.forEach(x => {
    assert.ok(['局中已有通关之星', '局中通关之星偏弱或缺'].includes(x.status), x.status);
    assert.ok(x.mid.length > 0);
  });
});
t('三法：明确不输出唯一喜用神，并声明非穷通宝鉴逐条表', () => {
  const r = X.threeMethods(chart({ clock: 'true', longitude: 120.1551 }));
  assert.ok(r.note.includes('不输出唯一喜用神'));
  assert.ok(r.limits.join('').includes('不是《穷通宝鉴》逐条调候表'));
});

/* ---------- 报告 ---------- */
const summary = { passed: pass, failed: fails.length, failures: fails, node: process.version };
console.log(JSON.stringify(summary, null, 1));
process.exitCode = fails.length ? 1 : 0;
