/* 生成分类教学案例库（cases-more.js）
   做法：按目标结构在 1975—2005 年的合法日期范围内检索，四柱由引擎现算，
   判读文字里出现的分数、十神、藏干都由引擎回填，不手抄数字。 */
const fs = require('fs');
const Z = require('../engine.js');
const X = require('../extra.js');
const R = require('../reading.js');

const CITIES = [
  ['杭州', 120.1551], ['北京', 116.4074], ['广州', 113.2644], ['成都', 104.0665],
  ['西安', 108.9398], ['武汉', 114.3055], ['沈阳', 123.4315], ['郑州', 113.6254],
  ['长沙', 112.9388], ['福州', 119.2965], ['济南', 117.0009], ['昆明', 102.8329],
];
const TZ = 'Asia/Shanghai';

function chart(date, time, gender, city) {
  const [place, lon] = city;
  return Z.calculate({ name: '分类教学盘', date, time, place, longitude: lon, timezone: TZ, gender, clock: 'true', dayBoundary: 0, ziStem: 'next', calendar: 'solar', unknownTime: false });
}
function energyOf(c, name) { return (X.tenGodEnergy(c).list.find(x => x.god === name) || { val: 0 }).val; }
function eSum(c, names) { return names.reduce((n, x) => n + energyOf(c, x), 0); }
function topGods(c, n = 3) { return X.tenGodEnergy(c).list.slice(0, n); }
function relCount(c, types) { return c.relations.filter(r => types.some(t => r.type.includes(t))).length; }

const CATS = [
  {
    key: 'peer', name: '比劫成群', lessons: ['L19', 'L20'],
    pred: (c) => X.strengthScore(c).total >= 58 && eSum(c, ['比肩', '劫财']) >= 2.2,
    write: (c, k) => ({
      name: '比劫成群，先问钱怎么分',
      tags: [c.pillars[1][1] + '月', '比劫' + k.peer + '', k.grade],
      reading: `${c.dayMaster}${Z.element(c.dayMaster)}生在${c.pillars[1][1]}月，日主${k.total} 分${k.grade}，比劫合计 ${k.peer}，是全局最重的一组。这类盘不缺力气，缺的是出口：力气使在自己人身上叫抱团，使在钱上叫分账。天干${k.stems}，比劫${k.peerVisible ? '透在明面，脾气和主张都摆在台面上' : '多藏支里，表面客气，底下较劲'}。`,
      chain: `事实：比劫 ${k.peer}、财 ${k.wealth}、食伤 ${k.output}，日主 ${k.total} 分${k.grade}。条件：同类过旺而泄耗不足。结论：用食伤把力气导出去（做事、做手艺），用官杀立规矩（有人管着反而顺）；最忌见财就上，比劫一重，钱一露头就被分。反证：若行食伤运反而更累，要查食伤是否被印克住。`,
      limits: '比劫重不等于一定破财，也不等于兄弟不和。它可以表现为合伙、团队、替人扛事；分账清不清，是现实约定问题，盘里看不出来。',
    }),
  },
  {
    key: 'thin', name: '身弱根薄', lessons: ['L14', 'L56'],
    pred: (c) => X.strengthScore(c).total <= 32 && eSum(c, ['正印', '偏印']) <= 1.0 && eSum(c, ['比肩', '劫财']) <= 1.2,
    write: (c, k) => ({
      name: '身弱到根薄，先保底再谈发展',
      tags: [c.pillars[1][1] + '月', '身弱', '无强根'],
      reading: `${c.dayMaster}${Z.element(c.dayMaster)}生${c.pillars[1][1]}月，${k.total} 分${k.grade}：月令不帮，四支里同五行的根只有 ${k.roots} 处，印 ${k.resource}、比劫 ${k.peer} 都薄。这张盘最实在的一句话是「别硬撑」——不是没本事，是扛不住长期消耗。`,
      chain: `事实：得令 ${k.items[0]}／40、得地 ${k.items[1]}／35、得势 ${k.items[2]}／25，印 ${k.resource}、比劫 ${k.peer}。条件：身弱而帮扶俱薄。结论：一切以「养」为先——印（学习、资历、靠山）比劫（同伴、合作）轮流补；克泄耗（官杀、财、食伤）同时压上来时，先砍掉最不必要的那一头。反证：若行印比运仍觉吃力，要查印比是否被合走或被冲散。`,
      limits: '身弱不等于命薄、体弱、能力差。它只说明「单位时间的承载力有限」，节奏放慢、选轻装的路线，结果可能比身强者更好。',
    }),
  },
  {
    key: 'wealth', name: '财多身弱', lessons: ['L20', 'L57'],
    pred: (c) => X.strengthScore(c).total <= 44 && eSum(c, ['正财', '偏财']) >= 2.2,
    write: (c, k) => ({
      name: '财多身弱：机会比力气多',
      tags: [c.pillars[1][1] + '月', '财 ' + k.wealth, '身弱'],
      reading: `财星 ${k.wealth}，日主只有 ${k.total} 分${k.grade}。这种组合最典型的体感是：眼前机会不少，接得住的不多；摊子铺开了，人却不够用。天干${k.stems}，${k.wealthVisible ? '财透在明面，钱的事藏不住，也容易被看见' : '财多在支里，钱是慢慢显出来的'}。`,
      chain: `事实：财 ${k.wealth}、食伤 ${k.output}、印 ${k.resource}、比劫 ${k.peer}。条件：财旺而身不任。结论：先补身——印化食伤生身、比劫帮身分财；不宜再添财地。实务上的对应是：先做稳定的现金流，再谈扩张；先找合伙人，再谈独资。反证：若行比劫运破了财，要查是否官杀截住比劫、或财被合去。`,
      limits: '「财多身弱」不是穷命，也不代表一定管不住钱。它讲的是得与守之间的落差：有人因此替别人管大钱，个人份额反而不大。',
    }),
  },
  {
    key: 'output', name: '食伤泄秀', lessons: ['L19', 'L58'],
    pred: (c) => eSum(c, ['食神', '伤官']) >= 2.2 && X.strengthScore(c).total >= 45,
    write: (c, k) => ({
      name: '食伤泄秀：靠输出立身',
      tags: [c.pillars[1][1] + '月', '食伤 ' + k.output, k.grade],
      reading: `食伤合计 ${k.output}，日主 ${k.total} 分${k.grade}，泄得动也泄得起。这类结构的人，价值多半长在「手上」或「嘴上」：手艺、作品、表达、方案。天干${k.stems}，${k.outputVisible ? '食伤透干，才华是外露的，藏不住' : '食伤多在支里，本事要相处久了才看出来'}。`,
      chain: `事实：食伤 ${k.output}、财 ${k.wealth}、印 ${k.resource}。条件：身能任泄、泄而有归。结论：食伤生财是最顺的一条线——把输出换成收入；若财薄，就先攒作品与口碑。忌印重夺食（想得多、做得少）。反证：若行财运反而更空，要查财是否被比劫分走。`,
      limits: '食伤旺不等于有才华、更不等于能变现。输出型结构最怕「只会说不落地」，落不落地看财与官杀有没有接。',
    }),
  },
  {
    key: 'mixed', name: '官杀混杂', lessons: ['L21', 'L60'],
    pred: (c) => eSum(c, ['正官', '七杀']) >= 2.2 && k_hasBoth(c),
    write: (c, k) => ({
      name: '官杀混杂：两套规矩同时管你',
      tags: [c.pillars[1][1] + '月', '官杀 ' + k.power, '压力结构'],
      reading: `正官与七杀同时有气，合计 ${k.power}，日主 ${k.total} 分${k.grade}。混杂的麻烦不在「压力大」，而在「两套标准打架」：一个要你稳，一个要你冲；一个讲名分，一个讲结果。天干${k.stems}，${k.powerVisible ? '官杀透干，压力是明面上的，多数来自职位与考核' : '官杀藏支，压力更多是隐隐的、说不清的'}。`,
      chain: `事实：官杀 ${k.power}、印 ${k.resource}、财 ${k.wealth}、比劫 ${k.peer}。条件：两套约束并存而身不堪。结论：先看印——印能把杀的压力转成资源（学历、资格、靠山）；印薄则用食伤制杀，但要防制过头变成顶撞。反证：若行印运反而更累，要查印是否被财坏。`,
      limits: '官杀混杂在传统女命论里常被直接连到婚姻，这一步不能跳：本盘只到「压力与取舍」，感情要看夫星与夫宫是否同指、运年是否同时引动。',
    }),
  },
  {
    key: 'sha', name: '七杀有制', lessons: ['L21', 'L61'],
    pred: (c) => energyOf(c, '七杀') >= 1.2 && (eSum(c, ['食神', '伤官']) >= 1.0 || eSum(c, ['正印', '偏印']) >= 1.0) && eSum(c, ['正官', '七杀']) <= 2.0,
    write: (c, k) => ({
      name: '七杀有制：压力变成位置',
      tags: [c.pillars[1][1] + '月', '七杀 ' + k.sha, k.controlType],
      reading: `七杀 ${k.sha} 有气，${k.controlType === '食伤制杀' ? '食伤 ' + k.output + ' 能制' : '印 ' + k.resource + ' 能化'}，日主 ${k.total} 分${k.grade}。七杀最怕无制——那是硬扛；有制就不同，压力会变成任务，任务做完了就是位置。天干${k.stems}。`,
      chain: `事实：七杀 ${k.sha}，${k.controlType === '食伤制杀' ? '食伤 ' + k.output : '印 ' + k.resource}，日主 ${k.total} 分。条件：杀有制化、身能承担。结论：${k.controlType === '食伤制杀' ? '走「以才制压」的路：专业能力越硬，越不怕被压。' : '走「以资历化压」的路：把压力转成学习与资格，越熬越稳。'}反证：若行制杀之运反而受挫，要查制神是否被合或被克。`,
      limits: '「七杀有制」常被说成必掌权，这是结果论。结构只说明压力有出口，能不能换成位置，还要看行业、平台与现实机会。',
    }),
  },
  {
    key: 'seal', name: '印重身旺', lessons: ['L22', 'L59'],
    pred: (c) => eSum(c, ['正印', '偏印']) >= 2.4 && X.strengthScore(c).total >= 55,
    write: (c, k) => ({
      name: '印重身旺：想得多，动得少',
      tags: [c.pillars[1][1] + '月', '印 ' + k.resource, k.grade],
      reading: `印星 ${k.resource}，日主 ${k.total} 分${k.grade}，属于「被喂得太饱」的类型：学历、庇荫、想法都不缺，缺的是把想法推出去的那一步。天干${k.stems}，${k.resourceVisible ? '印透在明面，长辈与资历的影响很直接' : '印藏支中，靠山在暗处，遇事总有人兜'}。`,
      chain: `事实：印 ${k.resource}、比劫 ${k.peer}、食伤 ${k.output}、财 ${k.wealth}。条件：生扶过重而泄耗不足。结论：用食伤泄（做事、输出、带徒弟），用财破印（把想法换成钱、把学习变成项目）。最忌再加印比，越想越不动。反证：若行财运反而乱了阵脚，要查财是否破掉唯一可用的印。`,
      limits: '印重不等于懒，也不等于学历高。它描述的是「输入大于输出」的惯性；把它变成课程、作品或产品，这层惯性就是资源。',
    }),
  },
  {
    key: 'shangguan', name: '伤官见官', lessons: ['L19', 'L62'],
    pred: (c) => energyOf(c, '伤官') >= 1.0 && energyOf(c, '正官') >= 0.6,
    write: (c, k) => ({
      name: '伤官见官：本事与规矩顶牛',
      tags: [c.pillars[1][1] + '月', '伤官 ' + k.shang, '正官 ' + k.guan],
      reading: `伤官 ${k.shang} 与正官 ${k.guan} 同时有气，日主 ${k.total} 分${k.grade}。这组关系的老话叫「伤官见官，为祸百端」，说白了就是：你有本事不服管，规矩又偏偏找上你。天干${k.stems}。顶得好是改革者，顶不好是到处碰壁。`,
      chain: `事实：伤官 ${k.shang}、正官 ${k.guan}、印 ${k.resource}、财 ${k.wealth}。条件：才气与规范正面相撞，且无印调和。结论：首选印——印能制伤护官，等于给才气加一道自我审查；次选财——财能通关，把伤官的劲导到做事上。最忌再见伤官与官直接对冲。反证：若行印运反而憋闷，要查印是否太重，压死了输出。`,
      limits: '这组结构最容易被拿去断「必犯官司」「女命克夫」。本页只承认它是「才气与规范的张力」，具体落在职场、家庭还是创作，要看宫位与现实。',
    }),
  },
  {
    key: 'cold', name: '寒局需火', lessons: ['L23', 'L63'],
    pred: (c) => X.threeMethods(c).climate === '寒' && (c.counts['火'] || 0) <= 1,
    write: (c, k) => ({
      name: '寒局：先把温度补上',
      tags: [c.pillars[1][1] + '月', '调候', '火 ' + (c.counts['火'] || 0)],
      reading: `${c.pillars[1][1]}月生，局中火只 ${c.counts['火'] || 0} 处，水 ${c.counts['水'] || 0} 处，寒气重。日主 ${k.total} 分${k.grade}。寒局的麻烦不是弱，是「冻住」：想法有、劲也有，就是转不起来。`,
      chain: `事实：火 ${c.counts['火'] || 0}、水 ${c.counts['水'] || 0}、土 ${c.counts['土'] || 0}，月令${c.pillars[1][1]}，调候判为${X.threeMethods(c).climate}。条件：寒湿而阳气不足。结论：先取火暖局，再看扶抑——寒局先暖是救急，暖过来再补身，别一味补。反证：若行火运反而烦躁失眠，要查火是否太燥、水是否被蒸干。`,
      limits: '调候是原则判断，不是《穷通宝鉴》逐条照搬。局的寒暖只是结构，不等于体质或性格；「怕冷」这类说法只作生活提示。',
    }),
  },
  {
    key: 'dry', name: '燥局需水', lessons: ['L23', 'L64'],
    pred: (c) => ['暖', '温'].includes(X.threeMethods(c).climate) && (c.counts['水'] || 0) <= 2 && (c.counts['火'] || 0) >= 3,
    write: (c, k) => ({
      name: '燥局：先润，再谈别的',
      tags: [c.pillars[1][1] + '月', '调候', '水 ' + (c.counts['水'] || 0)],
      reading: `${c.pillars[1][1]}月生，局中水只 ${c.counts['水'] || 0} 处、火 ${c.counts['火'] || 0} 处，燥气重，日主 ${k.total} 分${k.grade}。燥局的典型体感是「急」：事情推得快，人也耗得快，容易上火、失眠、话赶话。`,
      chain: `事实：火 ${c.counts['火'] || 0}、水 ${c.counts['水'] || 0}、金 ${c.counts['金'] || 0}，调候判为${X.threeMethods(c).climate}。条件：燥热而津不足。结论：先取水润局，金能生水为辅；再看扶抑。反证：若行水运反而更堵，要查水是否被土截住。`,
      limits: '「燥」是结构判断，不是医学诊断。生活上少熬夜、多补水可以讲，具体病症要交给医生；调候用神也不能理解成「多喝水就补上了」，它说的是结构里缺一层润泽之气。',
    }),
  },
  {
    key: 'combine', name: '合多缠身', lessons: ['L18', 'L65'],
    pred: (c) => relCount(c, ['六合', '三支齐见']) >= 3,
    write: (c, k) => ({
      name: '合多：人情牵着走',
      tags: [c.pillars[1][1] + '月', '合 ' + k.combines, '关系密集'],
      reading: `原局合 ${k.combines} 组（含六合与三支齐见），日主 ${k.total} 分${k.grade}。合多的盘，事多半不是一个人决定的：人情、关系、旧账互相牵着。好处是有人帮，坏处是想动的时候动不了。`,
      chain: `事实：${k.relText}。条件：多重合关系并存，牵制大于冲撞。结论：先看合住了什么——合住财则钱动不了，合住官则名分迟迟不定，合住日支则感情拉扯。要动，得等冲来解，或等运把合字引开。反证：若冲开之后反而更乱，说明这层合原本是保护。`,
      limits: '合不等于和好、也不等于成化。合化要月令、透干、地支承接三者配合，本页不自动判化；「合多必媚」这类说法不作断语。',
    }),
  },
  {
    key: 'clash', name: '冲刑结构', lessons: ['L18', 'L66'],
    pred: (c) => relCount(c, ['六冲']) >= 2 || c.relations.some(r => r.type.includes('刑')),
    write: (c, k) => ({
      name: '冲刑并见：动的地方在哪一宫',
      tags: [c.pillars[1][1] + '月', '冲 ' + k.clashes, k.punish ? '带刑' : '无刑'],
      reading: `原局六冲 ${k.clashes} 组${k.punish ? '，另见相刑' : ''}，日主 ${k.total} 分${k.grade}。冲不是坏事，冲是「挪位」：该挪的时候挪，是机会；不该挪的时候挪，是折腾。关键看冲在哪两宫。`,
      chain: `事实：${k.relText}。条件：多处冲刑并存。结论：先定位宫位——年日冲多主根基与自身拉扯，日时冲多主家庭与晚景反复，月日冲多在家庭与事业之间来回。再看有没有合来解：有合先论合。反证：若逢冲之年反而顺，说明冲开的是原本堵住的那个字。`,
      limits: '冲刑不等于离婚、破财、血光。传统把这些词连得太快，本页只保留「哪一宫在动」这一层，具体事件必须另有证据。',
    }),
  },
];

function k_hasBoth(c) {
  const vis = c.details.map(p => p.god).concat(c.details.flatMap(p => p.hidden.map(h => h.god)));
  return vis.includes('正官') && vis.includes('七杀');
}
function build(c) {
  const sc = X.strengthScore(c), tm = X.threeMethods(c), en = X.tenGodEnergy(c);
  const g = (n) => (en.list.find(x => x.god === n) || { val: 0 }).val;
  const grade = sc.total >= 60 ? '偏强' : sc.total >= 52 ? '略强' : sc.total > 44 ? '中和' : sc.total > 36 ? '中和偏弱' : '偏弱';
  const k = {
    total: sc.total, grade, items: sc.items.map(i => i.score),
    peer: eSum(c, ['比肩', '劫财']).toFixed(1), output: eSum(c, ['食神', '伤官']).toFixed(1),
    wealth: eSum(c, ['正财', '偏财']).toFixed(1), power: eSum(c, ['正官', '七杀']).toFixed(1),
    resource: eSum(c, ['正印', '偏印']).toFixed(1), sha: g('七杀').toFixed(1), shang: g('伤官').toFixed(1), guan: g('正官').toFixed(1),
    stems: c.details.map((p, i) => ['年', '月', '日', '时'][i] + p.stem + p.god).join('、'),
    roots: c.details.filter(p => p.hidden.some(h => h.element === Z.element(c.dayMaster))).length,
    peerVisible: c.details.some(p => ['比肩', '劫财'].includes(p.god)),
    wealthVisible: c.details.some(p => ['正财', '偏财'].includes(p.god)),
    outputVisible: c.details.some(p => ['食神', '伤官'].includes(p.god)),
    powerVisible: c.details.some(p => ['正官', '七杀'].includes(p.god)),
    resourceVisible: c.details.some(p => ['正印', '偏印'].includes(p.god)),
    controlType: eSum(c, ['食神', '伤官']) >= eSum(c, ['正印', '偏印']) ? '食伤制杀' : '印化杀',
    combines: String(relCount(c, ['六合', '三支齐见'])), clashes: String(relCount(c, ['六冲'])),
    punish: c.relations.some(r => r.type.includes('刑')),
    relText: c.relations.length ? c.relations.map(r => r.positions + r.pair + r.type).join('；') : '原局未见本页所列关系',
    climate: tm.climate,
  };
  return k;
}

const seeds = [];
// 确定性遍历：每 9 天取一个样本，时间轮换，性别交替，城市轮换
let day = Date.UTC(1975, 0, 3);
const end = Date.UTC(2005, 11, 20);
const times = ['02:40', '06:20', '09:50', '13:10', '17:30', '21:40'];
let i = 0;
while (day <= end && seeds.length < 40000) {
  const d = new Date(day), ds = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  seeds.push({ date: ds, time: times[i % times.length], gender: i % 2 ? 'female' : 'male', city: CITIES[i % CITIES.length] });
  day += 9 * 86400000; i++;
}

const out = [], used = new Set();
for (const cat of CATS) {
  let n = 0;
  for (const s of seeds) {
    if (n >= 5) break;
    const key = s.date + s.time + s.gender;
    if (used.has(key)) continue;
    let c;
    try { c = chart(s.date, s.time, s.gender, s.city); } catch { continue; }
    let ok = false;
    try { ok = cat.pred(c); } catch { ok = false; }
    if (!ok) continue;
    used.add(key);
    const k = build(c);
    const w = cat.write(c, k);
    out.push({
      id: 'CA' + String(out.length + 1).padStart(2, '0'),
      cat: cat.key, catName: cat.name,
      name: w.name + '：' + c.dayMaster + '日' + c.pillars[1][1] + '月', kind: '分类教学盘',
      birth: { date: s.date, time: s.time, place: s.city[0], lon: s.city[1], gender: s.gender },
      tags: w.tags, reading: w.reading, chain: w.chain, limits: w.limits,
      lessons: cat.lessons,
    });
    n++;
  }
  console.log(cat.key, n);
}

const groups = CATS.map(cat => ({ key: cat.key, name: cat.name, ids: out.filter(x => x.cat === cat.key).map(x => x.id), lessons: cat.lessons }));
const head = `/* 分类教学案例库（自动生成，勿手改数字）
   来源：按目标结构在 1975—2005 年合法日期范围内检索得到，四柱与分数由引擎现算。
   用途：每一类结构 5 盘，配套「判读示范／推理链／边界」三段解析；不是真实人物，不含生平事件。 */
(() => {
  'use strict';
  const C = window.ZIPING_CONTENT;
  if (!C) return;
  const cases = ${JSON.stringify(out, null, 1)};
  const groups = ${JSON.stringify(groups, null, 1)};
  const byId = Object.fromEntries(cases.map(c => [c.id, c]));
  C.teachingCases = C.teachingCases || [];
  cases.forEach(c => { if (!C.teachingCases.some(x => x.id === c.id)) C.teachingCases.push(c); });
  C.caseGroups = groups;
  C.caseMap = C.caseMap || {};
  groups.forEach(g => g.lessons.forEach(l => {
    C.caseMap[l] = C.caseMap[l] || [];
    g.ids.slice(0, 2).forEach(id => { if (!C.caseMap[l].some(x => x.id === id)) C.caseMap[l].push({ id, point: g.name + ' · 分类案例' }); });
  }));
  C.caseVersion = '0.8';
})();
`;
fs.writeFileSync('cases-more.js', head, 'utf8');
console.log('cases', out.length, 'bytes', Buffer.byteLength(head));
