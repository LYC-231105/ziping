/* 分类教学盘校验：盘面由引擎重算，文字里的分数、等级、十神必须与重算一致 */
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const Z = require('../engine.js');
const X = require('../extra.js');

const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
['content.js', 'academy.js', 'academy-advanced.js', 'lessons-deep.js', 'lessons-order.js', 'cases-deep.js', 'cases-more.js', 'case-map.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(__dirname + '/../' + f, 'utf8'), sandbox, { filename: f });
});
const C = sandbox.ZIPING_CONTENT;
const cases = (C.teachingCases || []).filter((c) => c.kind === '分类教学盘');
let pass = 0; const failures = [];
function t(name, fn) { try { fn(); pass++; } catch (e) { failures.push(name + ' :: ' + e.message); } }

t('分类案例数为 12 类 × 5 盘', () => {
  assert.strictEqual(C.caseGroups.length, 12);
  C.caseGroups.forEach((g) => assert.strictEqual(g.ids.length, 5, g.key + ' 应有 5 盘'));
  assert.strictEqual(cases.length, 60);
});

t('每个案例可由引擎重算且四柱一致', () => {
  cases.forEach((c) => {
    const r = Z.calculate({ name: c.name, date: c.birth.date, time: c.birth.time, gender: c.birth.gender, place: c.birth.place, longitude: c.birth.lon, timezone: 'Asia/Shanghai', clock: 'true', dayBoundary: 0, ziStem: 'next', calendar: 'solar' });
    c.pillars = r.pillars.join(' ');
    assert.ok(r.pillars.every((p) => /^[\u4e00-\u9fa5]{2}$/.test(p)), c.id + ' 四柱异常');
  });
});

t('判读文字里的「NN 分 + 等级」与重算一致', () => {
  cases.forEach((c) => {
    const r = Z.calculate({ date: c.birth.date, time: c.birth.time, gender: c.birth.gender, place: c.birth.place, longitude: c.birth.lon, timezone: 'Asia/Shanghai', clock: 'true', dayBoundary: 0, ziStem: 'next' });
    const total = X.strengthScore(r).total;
    const m = c.reading.match(/(\d+)\s*分(偏强|略强|中和偏弱|中和|偏弱)/);
    assert.ok(m, c.id + ' 未写分数');
    assert.strictEqual(Number(m[1]), total, c.id + ' 分数与重算不符');
  });
});

t('案例三段解析齐备且不空', () => {
  cases.forEach((c) => {
    ['reading', 'chain', 'limits'].forEach((k) => assert.ok(c[k] && c[k].length > 40, c.id + ' 缺 ' + k));
    assert.ok(c.chain.includes('事实') && c.chain.includes('结论') && c.chain.includes('反证'), c.id + ' 推理链不完整');
  });
});

t('五盘之间盘面不重复', () => {
  C.caseGroups.forEach((g) => {
    const set = new Set(g.ids.map((id) => {
      const c = cases.find((x) => x.id === id);
      return c.birth.date + c.birth.time + c.birth.gender;
    }));
    assert.strictEqual(set.size, 5, g.key + ' 有重复盘');
  });
});

t('案例映射到讲次且指向真实案例', () => {
  Object.entries(C.caseMap || {}).forEach(([lesson, refs]) => {
    refs.forEach((r) => assert.ok(C.teachingCases.some((c) => c.id === r.id), lesson + ' 指向不存在的 ' + r.id));
  });
});

t('每一讲都配到至少五盘，且互不重复', () => {
  assert.ok(C.lessons.length >= 78, '讲次数异常');
  C.lessons.forEach((l) => {
    const refs = (C.caseMap || {})[l.id] || [];
    assert.ok(refs.length >= 5, l.id + ' 只有 ' + refs.length + ' 盘');
    const ids = refs.map((r) => r.id);
    assert.strictEqual(new Set(ids).size, ids.length, l.id + ' 有重复盘');
  });
});

t('每条映射都有解说，且不是占位符', () => {
  Object.entries(C.caseMap || {}).forEach(([lesson, refs]) => {
    refs.forEach((r) => {
      assert.ok(r.point && r.point.length >= 12, lesson + '/' + r.id + ' 解说过短');
      assert.ok(!/·\s*分类案例$/.test(r.point), lesson + '/' + r.id + ' 仍是类别占位');
      assert.ok(!/undefined|NaN|\[object/.test(r.point), lesson + '/' + r.id + ' 含脏数据');
    });
  });
});

t('解说里的分数与重算一致（防止引擎权重改动后文字过期）', () => {
  C.lessons.forEach((l) => {
    ((C.caseMap || {})[l.id] || []).forEach((r) => {
      const m = r.point.match(/(\d{1,3})\s*分（(\d{1,2})／(\d{1,2})／(\d{1,2})）/);
      if (!m) return;
      const c = C.teachingCases.find((x) => x.id === r.id);
      const calc = Z.calculate({ date: c.birth.date, time: c.birth.time, gender: c.birth.gender, place: c.birth.place, longitude: c.birth.lon, timezone: c.birth.tz || 'Asia/Shanghai', clock: 'true', dayBoundary: 0, ziStem: 'next' });
      const sc = X.strengthScore(calc);
      assert.strictEqual(Number(m[1]), sc.total, l.id + '/' + r.id + ' 总分过期');
      assert.strictEqual(Number(m[1]), Number(m[2]) + Number(m[3]) + Number(m[4]), l.id + '/' + r.id + ' 三栏之和不等于总分');
      assert.strictEqual(Number(m[2]), sc.items[0].score, l.id + '/' + r.id + ' 得令分过期');
    });
  });
});

console.log(JSON.stringify({ passed: pass, failed: failures.length, failures, scope: '分类教学盘：盘面重算、分数一致、解析完整、映射有效' }, null, 1));
process.exit(failures.length ? 1 : 0);
