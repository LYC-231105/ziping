/* 速查表校验：表里的机械性内容必须与引擎一致，避免抄写型错误 */
const assert = require('node:assert');
const Z = require('../engine.js');
const X = require('../extra.js');
const T = require('../tables.js');

let pass = 0; const failures = [];
function t(name, fn) { try { fn(); pass++; } catch (e) { failures.push(name + ' :: ' + e.message); } }

const html = T.sections();

t('15 个表格区块齐全', () => {
  assert.strictEqual(T.nav().length, 15);
  T.nav().forEach(([id]) => assert.ok(html.includes('id="ref-' + id + '"'), '缺 ' + id));
});

t('十神速查矩阵 100 格全部等于引擎换算', () => {
  const GAN = '甲乙丙丁戊己庚辛壬癸';
  const cells = html.match(/<span class="gm-cell">([^<]+)<\/span>/g) || [];
  assert.strictEqual(cells.length, 100);
  let i = 0;
  for (const d of GAN) for (const t2 of GAN) {
    const want = Z.god(d, t2);
    assert.ok(cells[i].includes(want), `${d}见${t2} 应为 ${want}，表里是 ${cells[i]}`);
    i++;
  }
});

t('十二长生表 120 格与 lifeOf 一致', () => {
  const rows = html.split('<table class="ref-table life-matrix">')[1];
  assert.ok(rows, '缺长生表');
  const body = rows.split('</table>')[0];
  const tds = [...body.matchAll(/<td[^>]*>(?:<b>.*?<\/b>)?<span[^>]*>([^<]+)<\/span><\/td>/g)].map((m) => m[1]);
  assert.ok(tds.length >= 120, '格子数不足：' + tds.length);
  let i = 0;
  for (const s of '甲乙丙丁戊己庚辛壬癸') for (const b of '子丑寅卯辰巳午未申酉戌亥') {
    assert.strictEqual(tds[i], Z.lifeOf(s, b), `${s}在${b}`);
    i++;
  }
});

t('纳音 30 组与历法库一致', () => {
  const lib = require('../vendor/lunar.js');
  const NAYIN = lib.LunarUtil.NAYIN;
  const pairs = ['甲子', '丙寅', '戊辰', '庚午', '壬申', '甲戌', '丙子', '戊寅', '庚辰', '壬午', '甲申', '丙戌', '戊子', '庚寅', '壬辰', '甲午', '丙申', '戊戌', '庚子', '壬寅', '甲辰', '丙午', '戊申', '庚戌', '壬子', '甲寅', '丙辰', '戊午', '庚申', '壬戌'];
  pairs.forEach((p) => assert.ok(html.includes(NAYIN[p]), p + ' 纳音 ' + NAYIN[p] + ' 未出现在表中'));
});

t('神煞表覆盖 18 组且带口诀', () => {
  const rules = X.SS_RULES;
  assert.ok(rules.length >= 18, '规则数 ' + rules.length);
  rules.forEach((r) => {
    assert.ok(html.includes(r.name), '缺神煞 ' + r.name);
    assert.ok(r.basis && r.basis.length > 6, r.name + ' 缺口诀');
  });
});

t('空亡六旬配对正确', () => {
  [['甲子', '戌亥'], ['甲戌', '申酉'], ['甲申', '午未'], ['甲午', '辰巳'], ['甲辰', '寅卯'], ['甲寅', '子丑']].forEach(([xun, kong]) => {
    assert.ok(html.includes(kong), xun + '旬空亡应为 ' + kong);
  });
});

t('表格页不含未替换的模板占位符', () => {
  assert.ok(!/\$\{/.test(html), '存在未求值的模板字符串');
  assert.ok(!html.includes('undefined'), '存在 undefined');
});

console.log(JSON.stringify({ passed: pass, failed: failures.length, failures, scope: '速查表：十神矩阵、长生表、纳音、神煞、空亡与引擎一致' }, null, 1));
process.exit(failures.length ? 1 : 0);
