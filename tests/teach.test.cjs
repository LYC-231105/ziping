/* 教学内容层检查：顺序、案例、题目、正文完整性。
   只检查「结构是否自洽、覆盖是否齐全」，不认证命理预测有效性。 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
['content.js', 'academy.js', 'academy-advanced.js', 'lessons-deep.js', 'lessons-order.js', 'cases-deep.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }));

const C = sandbox.window.ZIPING_CONTENT;
const Z = require('../engine.js');

let passed = 0, failed = 0;
const fails = [];
function t(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; fails.push({ name, message: e.message }); }
}

const ids = C.lessons.map(l => l.id);
const pos = new Map(ids.map((id, i) => [id, i + 1]));

/* ---------- 1. 顺序 ---------- */
t('78 讲且讲号唯一', () => {
  assert.strictEqual(C.lessons.length, 78);
  assert.strictEqual(new Set(ids).size, 78);
});

t('定盘类排在干支类之前，真太阳时在十神之前', () => {
  assert.ok(pos.get('L11') < pos.get('L12'), '真太阳时应先于十神');
  assert.ok(pos.get('L03') < pos.get('L11'), '时区应先于真太阳时');
  assert.ok(pos.get('L05') < pos.get('L06'), '十二节应先于天干');
});

t('基础总表排在十神之后、旺衰之前', () => {
  assert.ok(pos.get('L12') < pos.get('L49'));
  assert.ok(pos.get('L49') < pos.get('L56'));
  assert.ok(pos.get('L55') < pos.get('L56'), '刑害破应先于旺衰专题');
});

t('旺衰与用神排在男女专题与人生议题之前', () => {
  assert.ok(pos.get('L56') < pos.get('L33'));
  assert.ok(pos.get('L58') < pos.get('L61'));
});

t('毕业类课程全部在最后，且示范先于带练、带练先于闭卷', () => {
  ['L30', 'L48', 'L78'].forEach(id => assert.ok(pos.get(id) > 70, id + ' 应在末尾'));
  assert.ok(pos.get('L35') < pos.get('L46'), '男命示范应先于带练');
  assert.ok(pos.get('L39') < pos.get('L46'), '女命示范应先于带练');
  assert.ok(pos.get('L46') < pos.get('L47'), '带练应先于闭卷');
});

t('先修关系只指向更早的讲次', () => {
  C.lessons.forEach((l, i) => {
    (l.prerequisites || []).forEach(p => {
      assert.ok(pos.has(p), l.id + ' 的先修不存在 ' + p);
      assert.ok(pos.get(p) < i + 1, l.id + ' 的先修 ' + p + ' 排在自己之后');
    });
  });
});

t('每个讲次都落在某个阶段，且阶段连续覆盖 1—78', () => {
  let expect = 1;
  C.studyStages.forEach(s => {
    assert.strictEqual(s.from, expect, s.title + ' 与上一阶段不连续');
    assert.ok(s.to >= s.from);
    expect = s.to + 1;
  });
  assert.strictEqual(expect - 1, 78);
  C.lessons.forEach((l, i) => {
    assert.ok(C.studyStages.some(s => i + 1 >= s.from && i + 1 <= s.to), l.id + ' 未归入阶段');
  });
});

/* ---------- 2. 正文 ---------- */
t('每讲都有导语、至少三段正文、至少三步操作、示范与练习', () => {
  C.lessons.forEach(l => {
    assert.ok((l.body || '').length >= 30, l.id + ' 导语过短');
    assert.ok((l.paragraphs || []).length >= 3, l.id + ' 正文段落不足');
    assert.ok((l.steps || []).length >= 3, l.id + ' 操作步骤不足');
    assert.ok((l.example || '').length >= 60, l.id + ' 缺少讲解示范');
    assert.ok((l.practice || '').length >= 15, l.id + ' 缺少练习');
  });
});

t('每讲正文净字数不低于 300', () => {
  C.lessons.forEach(l => {
    const n = (l.body || '').length + (l.paragraphs || []).join('').length + (l.example || '').length;
    assert.ok(n >= 300, l.id + ' 仅 ' + n + ' 字');
  });
});

/* ---------- 3. 案例 ---------- */
t('每讲至少配 1 个案例，多数配 2 个', () => {
  let two = 0;
  C.lessons.forEach(l => {
    const refs = C.caseMap[l.id] || [];
    assert.ok(refs.length >= 1, l.id + ' 无配套案例');
    if (refs.length >= 2) two++;
  });
  assert.ok(two >= 60, '双案例讲次偏少：' + two);
});

t('案例引用全部存在，且带「与本讲的关系」说明', () => {
  Object.keys(C.caseMap).forEach(k => {
    C.caseMap[k].forEach(r => {
      const c = C.teachingCases.find(x => x.id === r.id);
      assert.ok(c, k + ' 引用了不存在的案例 ' + r.id);
      assert.ok((r.point || '').length >= 10, k + ' 的案例缺说明');
    });
  });
});

t('每个案例都有判读、推理链与边界三段', () => {
  C.teachingCases.forEach(c => {
    assert.ok(c.reading.length >= 60, c.id + ' 判读过短');
    assert.ok(c.chain.length >= 50, c.id + ' 缺推理链');
    assert.ok(c.limits.length >= 30, c.id + ' 缺边界说明');
  });
});

t('案例四柱可由出生数据复算，且不出现非法干支组合', () => {
  C.teachingCases.forEach(c => {
    const r = Z.calculate({
      name: c.name, date: c.birth.date, time: c.birth.time, calendar: 'solar',
      gender: c.birth.gender, place: c.birth.place, timezone: 'Asia/Shanghai',
      longitude: c.birth.lon, clock: 'true', dayBoundary: 0, ziStem: 'next'
    });
    assert.strictEqual(r.pillars.length, 4, c.id);
    r.pillars.forEach(p => {
      const gi = Z.GAN.indexOf(p[0]), zi = Z.ZHI.indexOf(p[1]);
      assert.ok(gi >= 0 && zi >= 0, c.id + ' 非法干支 ' + p);
      assert.strictEqual(gi % 2, zi % 2, c.id + ' 阴阳不配 ' + p);
    });
  });
});

t('边界盘覆盖晚子时、立春、真太阳时三类', () => {
  const kinds = C.teachingCases.filter(c => c.kind === '边界盘').map(c => c.name).join('');
  assert.ok(kinds.includes('晚子时'));
  assert.ok(kinds.includes('立春'));
  assert.ok(kinds.includes('真太阳时'));
});

/* ---------- 4. 题目 ---------- */
t('每讲至少 2 道带选项与解析的题', () => {
  C.lessons.forEach(l => {
    const bank = C.quizBank[l.id];
    assert.ok(bank && bank.length >= 2, l.id + ' 题目不足');
  });
});

t('题目答案必须在选项内，且每题都有解析', () => {
  Object.keys(C.quizBank).forEach(k => {
    C.quizBank[k].forEach((q, i) => {
      assert.ok(q.options.length >= 2, k + ' 第' + (i + 1) + '题选项不足');
      assert.ok(q.options.includes(q.answer), k + ' 第' + (i + 1) + '题答案不在选项中：' + q.answer);
      assert.ok(q.explanation.length >= 10, k + ' 第' + (i + 1) + '题缺解析');
    });
  });
});

t('题库总题数不少于 150', () => {
  const n = Object.values(C.quizBank).reduce((s, a) => s + a.length, 0);
  assert.ok(n >= 150, '仅 ' + n + ' 题');
});

/* ---------- 5. 边界 ---------- */
t('健康类内容不得出现确诊式病名断言', () => {
  const banned = ['必得癌', '会得癌', '必患', '确诊为'];
  C.lessons.forEach(l => {
    const text = [l.body, ...(l.paragraphs || []), l.example].join('');
    banned.forEach(w => assert.ok(!text.includes(w), l.id + ' 出现越界表述 ' + w));
  });
});

t('案例库不含生死寿元类断言', () => {
  const banned = ['必死', '寿元将尽', '必有大灾'];
  C.teachingCases.forEach(c => {
    const text = c.reading + c.chain + c.limits;
    banned.forEach(w => assert.ok(!text.includes(w), c.id + ' 出现 ' + w));
  });
});

/* ---------- 分数与盘面一致性：防止调权重后文字失同步 ---------- */
t('案例判读中引用的旺衰分数与引擎实算一致', () => {
  const X = require('../extra.js');
  C.teachingCases.forEach(c => {
    const r = Z.calculate({ name: c.name, date: c.birth.date, time: c.birth.time, calendar: 'solar',
      gender: c.birth.gender, place: c.birth.place, timezone: c.birth.tz || 'Asia/Shanghai',
      longitude: c.birth.lon, clock: 'true', dayBoundary: 0, ziStem: 'next' });
    const s = X.strengthScore(r);
    const text = [c.reading, c.chain, c.limits].join(' ');
    const hits = text.match(/(\d{1,3})\s*分(中和偏强|中和偏弱|偏强|偏弱|极弱|极强|中和)/g) || [];
    hits.forEach(h => {
      const num = Number(h.match(/\d+/)[0]);
      const word = h.replace(/^\d+\s*分/, '');
      assert.strictEqual(num, s.total, c.id + ' 文中写 ' + h + '，实算 ' + s.total + ' 分');
      assert.strictEqual(word, s.grade, c.id + ' 文中等级 ' + word + '，实算 ' + s.grade);
    });
  });
});
t('得势一栏的上限可达且不超过 25', () => {
  const X = require('../extra.js');
  // 三个天干全为比劫时应达到上限
  let maxSeen = 0;
  for (let y = 1970; y <= 2000; y += 3) {
    for (let m = 1; m <= 12; m += 2) {
      const c = Z.calculate({ name: 's', date: y + '-' + String(m).padStart(2, '0') + '-12', time: '10:00',
        calendar: 'solar', gender: 'male', timezone: 'Asia/Shanghai', longitude: 120.1551,
        clock: 'true', dayBoundary: 0, ziStem: 'next' });
      const ss = X.strengthScore(c);
      const de = ss.items[2];
      assert.ok(de.score <= de.max, '得势超出上限：' + de.score + '/' + de.max);
      assert.ok(de.score <= 25, '得势绝对上限应为 25');
      maxSeen = Math.max(maxSeen, de.score);
    }
  }
  assert.ok(maxSeen >= 24, '得势最高只到 ' + maxSeen + '，说明权重设计达不到所声明的 25 分上限');
});
t('三项分数之和等于总分', () => {
  const X = require('../extra.js');
  for (const id of ['TC01', 'TC04', 'TC13', 'TC15', 'TC17']) {
    const c = C.teachingCases.find(x => x.id === id);
    const r = Z.calculate({ name: c.name, date: c.birth.date, time: c.birth.time, calendar: 'solar',
      gender: c.birth.gender, place: c.birth.place, timezone: c.birth.tz || 'Asia/Shanghai',
      longitude: c.birth.lon, clock: 'true', dayBoundary: 0, ziStem: 'next' });
    const ss = X.strengthScore(r);
    const sum = ss.items.reduce((n, i) => n + i.score, 0);
    assert.strictEqual(sum, ss.total, id + ' 三项之和 ' + sum + ' ≠ 总分 ' + ss.total);
  }
});

const out = { passed, failed, failures: fails, scope: '课程顺序、案例、题库与教学完整性结构检查；不认证预测效果' };
console.log(JSON.stringify(out, null, 1));
process.exit(failed ? 1 : 0);
