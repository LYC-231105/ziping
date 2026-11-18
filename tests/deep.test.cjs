/* 深入判读层校验：强弱判定、喜忌互斥、逐年文案随年份变化 */
const assert = require('node:assert');
const Z = require('../engine.js');
const X = require('../extra.js');
const R = require('../reading.js');
const D = require('../deep.js');

const CASES = [
  { date: '2005-12-23', time: '08:37', gender: 'male', lon: 120.1551 },
  { date: '1990-06-15', time: '12:00', gender: 'female', lon: 116.4074 },
  { date: '1978-12-19', time: '18:30', gender: 'male', lon: 123.4315 },
  { date: '1961-08-04', time: '19:24', gender: 'male', lon: -157.8583, tz: 'Pacific/Honolulu' },
  { date: '2001-03-05', time: '05:10', gender: 'female', lon: 104.0665 },
];
const charts = CASES.map((x) => Z.calculate({ date: x.date, time: x.time, gender: x.gender, longitude: x.lon, place: 'x', timezone: x.tz || 'Asia/Shanghai', clock: 'true', dayBoundary: 0, ziStem: 'next' }));

let pass = 0; const failures = [];
const t = (name, fn) => { try { fn(); pass++; } catch (e) { failures.push(name + ' :: ' + e.message); } };

t('强弱判定与三栏分数一致', () => {
  charts.forEach((c) => {
    const ys = D.yongshen(c);
    const sc = X.strengthScore(c);
    assert.strictEqual(ys.total, sc.total);
    assert.ok(['身强', '偏强', '中和', '偏弱', '身弱'].includes(ys.level), ys.level);
    assert.ok(ys.line.includes(String(sc.total)), '判定句没写分数');
  });
});

t('喜忌两组不重叠，且能对应到五行', () => {
  charts.forEach((c) => {
    const ys = D.yongshen(c);
    ys.favGroups.forEach((g) => assert.ok(!ys.avoidGroups.includes(g), '喜忌重叠：' + g));
    assert.ok(ys.favEls.length || ys.avoidEls.length, '没有五行');
  });
});

t('调候寒局一定把火类列进喜用', () => {
  charts.forEach((c) => {
    const ys = D.yongshen(c);
    if (ys.tm.climate === '寒' && ys.climateEl === '火') assert.ok(ys.favEls.includes('火'), '寒局未取火');
  });
});

t('八步大运各有一句以上判断，且顺逆与分数自洽', () => {
  charts.forEach((c) => {
    const ys = D.yongshen(c);
    R.eightLuck(c).slice(0, 8).forEach((l) => {
      const lr = D.luckOne(c, l, ys);
      assert.ok(lr.lines.length >= 4, l.pillar + ' 文字过少');
      assert.ok(lr.lines.every((x) => x && x.length > 8));
      if (lr.score >= 2) assert.strictEqual(lr.verdict, '顺');
      if (lr.score <= -2) assert.strictEqual(lr.verdict, '逆');
    });
  });
});

t('同一运内不同流年的文字不同', () => {
  const c = charts[0];
  const ys = D.yongshen(c);
  const l = R.eightLuck(c)[1];
  const texts = (l.years || []).slice(0, 6).map((y) => D.yearOne(c, l, y, ys).lines[0]);
  assert.ok(new Set(texts).size >= Math.min(3, texts.length), '流年开头句式重复过多');
});

t('流年判定与喜忌对照一致', () => {
  const c = charts[1];
  const ys = D.yongshen(c);
  const l = R.eightLuck(c)[0];
  (l.years || []).slice(0, 8).forEach((y) => {
    const r = D.yearOne(c, l, y, ys);
    const g = D.grpOfGod(r.god);
    if (ys.favGroups.includes(g) && !ys.avoidGroups.includes(g)) assert.ok(r.verdict >= 0, y.year + ' 喜用年判成负分');
    if (ys.avoidGroups.includes(g)) assert.ok(r.verdict <= 1, y.year + ' 忌神年判成高顺');
  });
});

t('过三关给出具体年份，且不超过三步结构', () => {
  charts.forEach((c) => {
    const G = D.gates(c);
    assert.ok(G.past.length <= 2);
    G.past.forEach((p) => p.years.forEach(({ y }) => assert.ok(y.year > 1900)));
    G.future.forEach((r) => assert.ok(r.year > 1900 && r.lines.length > 3));
  });
});

console.log(JSON.stringify({ passed: pass, failed: failures.length, failures, scope: '深入判读：强弱喜忌、逐运逐年、过三关' }, null, 1));
process.exit(failures.length ? 1 : 0);
