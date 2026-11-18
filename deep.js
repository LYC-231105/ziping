/* 深入判读层：把「身强身弱 / 喜忌用神 / 每步大运 / 每个流年」写成具体判断。
   原则：
   1) 所有事实（干支、十神、分数、关系、起运、岁运互动）由 engine / extra / reading 现算；
   2) 结论只在本页口径内给，明确写清「喜什么、忌什么、为什么」；
   3) 文案按盘与年份取值轮换，避免所有盘、所有年都读起来一样；
   4) 不预测具体事件、金额、病名，只给结构与观察指标。 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'), require('./extra.js'), require('./reading.js'));
  else root.ZipingDeep = factory(root.Ziping, root.ZipingExtra, root.ZipingReading);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Z, X, R) {
  'use strict';

  const ELS = ['木', '火', '土', '金', '水'];
  const GROUPS = { peer: ['比肩', '劫财'], output: ['食神', '伤官'], wealth: ['正财', '偏财'], power: ['正官', '七杀'], resource: ['正印', '偏印'] };
  const GNAME = { peer: '比劫', output: '食伤', wealth: '财星', power: '官杀', resource: '印星' };
  const GDESC = { peer: '自己与同辈的力量', output: '表达、手艺与产出', wealth: '钱、资源与经营', power: '规矩、责任与压力', resource: '学习、资历与靠山' };
  const OFFSET = { peer: 0, output: 1, wealth: 2, power: 3, resource: 4 };
  const elOf = (dmEl, k) => ELS[(ELS.indexOf(dmEl) + OFFSET[k]) % 5];
  const grpOfGod = (g) => Object.keys(GROUPS).find((k) => GROUPS[k].includes(g)) || '';
  const grpOfEl = (dmEl, el) => Object.keys(OFFSET).find((k) => elOf(dmEl, k) === el) || '';
  const SIDE = { 年柱: '长辈、出身与根基', 月柱: '父母、工作环境与同辈', 日柱: '自身与伴侣', 时柱: '子女、下属与晚景' };
  const THEME = {
    比肩: '自己立起来、同辈与分工', 劫财: '竞争、分账与抢机会',
    食神: '手艺、作品与稳定输出', 伤官: '表达、创新与不服管',
    正财: '固定收入、预算与兑现', 偏财: '外部机会、经营与流动资源',
    正官: '岗位、规则与组织评价', 七杀: '压力、任务与硬仗',
    正印: '学习、资历与被扶', 偏印: '专精、冷门与独立研究',
  };
  const seedOf = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) % 9973; return h; };
  const pick = (arr, s) => arr[Math.abs(s) % arr.length];

  /* ---------- 一、身强身弱 + 喜忌用神 ---------- */
  function yongshen(c) {
    const sc = X.strengthScore(c), tm = X.threeMethods(c), en = X.tenGodEnergy(c), dmEl = Z.element(c.dayMaster);
    const total = sc.total;
    const level = total >= 62 ? '身强' : total >= 52 ? '偏强' : total > 44 ? '中和' : total > 36 ? '偏弱' : '身弱';
    const strong = total >= 52, weak = total <= 44;
    const fav = [], avoid = [];
    if (weak) { fav.push('resource', 'peer'); avoid.push('wealth', 'power', 'output'); }
    else if (strong) { fav.push('output', 'wealth', 'power'); avoid.push('resource', 'peer'); }
    else {
      const low = [...en.list].sort((a, b) => a.val - b.val)[0];
      const high = [...en.list].sort((a, b) => b.val - a.val)[0];
      if (low) fav.push(grpOfGod(low.god));
      if (high && grpOfGod(high.god) !== (low && grpOfGod(low.god))) avoid.push(grpOfGod(high.god));
    }
    // 调候：寒局先暖，燥热局先润；这一条优先于扶抑
    const hot = (tm.climate === '暖' || tm.climate === '温') && (c.counts['火'] || 0) >= 3 && (c.counts['水'] || 0) <= 2;
    const cold = tm.climate === '寒';
    const climateEl = cold ? '火' : hot ? '水' : '';
    const climateGrp = climateEl ? grpOfEl(dmEl, climateEl) : '';
    const baseAvoid = [...new Set(avoid.filter(Boolean))];
    const conflict = climateGrp && baseAvoid.includes(climateGrp);
    if (climateGrp && !fav.includes(climateGrp)) fav.unshift(climateGrp);
    // 通关：两行相战，取中间一行（与喜忌不冲突时才加）
    const tg = tm.tongguan && tm.tongguan[0];
    const tgStem = tg ? ({ '木': '甲', '火': '丙', '土': '戊', '金': '庚', '水': '壬' })[tg.mid] : '';
    const tgGrp = tgStem ? grpOfEl(dmEl, Z.element(tgStem)) : '';
    if (tgGrp && !fav.includes(tgGrp) && !baseAvoid.includes(tgGrp)) fav.push(tgGrp);

    const favGroups = [...new Set(fav.filter(Boolean))];
    const avoidGroups = baseAvoid.filter((g) => !favGroups.includes(g));
    const favEls = [...new Set(favGroups.map((g) => elOf(dmEl, g)))];
    const avoidEls = [...new Set(avoidGroups.map((g) => elOf(dmEl, g)))];
    const strongest = [...en.list].sort((a, b) => b.val - a.val)[0];

    const verdict = {
      level, total, strong, weak, climateEl, climateGrp, favGroups, avoidGroups, favEls, avoidEls,
      sc, tm, en, dmEl, tgGrp,
      line: `${c.dayMaster}${dmEl}生${c.pillars[1][1]}月，得令 ${sc.items[0].score}/40、得地 ${sc.items[1].score}/35、得势 ${sc.items[2].score}/25，合计 ${total} 分，判为「${level}」。`,
      why: weak
        ? `失在${sc.items[0].score < 20 ? '月令不帮身' : '根气不足'}：${sc.items[1].detail.replace(/^[^：]*：/, '').slice(0, 46)}${sc.items[1].score < 18 ? '，站的地方不厚' : ''}。可用的力气是${favGroups.map((g) => GNAME[g]).join('、')}，所以判弱不是判废——有人帮就能扛事，只是不能长期硬耗。`
        : strong
          ? `力气有余：${sc.items[0].score >= 30 ? '月令帮身' : '印比成势'}，${sc.items[2].score >= 12 ? '明干又有扶助' : '根气不弱'}。强不等于好，得看有没有出口——${avoidGroups.includes('resource') ? '印重则容易想得多做得慢' : '比劫重则容易自己跟自己较劲'}，所以要${favGroups.map((g) => GNAME[g]).join('、')}把劲泄出去。`
          : `三栏都在中间，谁也没压倒谁：${sc.items[0].score}/40、${sc.items[1].score}/35、${sc.items[2].score}/25。这种盘的方向由运来定，原局只给一个偏${strongest ? strongest.god : '旺'}的底色。`,
      favor: favGroups.map((g) => `${GNAME[g]}（${GDESC[g]}）`).join('、') || '不明显',
      favorGods: favGroups.flatMap((g) => GROUPS[g]).join('、'),
      avoid: avoidGroups.map((g) => `${GNAME[g]}（${GDESC[g]}）`).join('、') || '不明显',
      avoidGods: avoidGroups.flatMap((g) => GROUPS[g]).join('、'),
      elements: `喜${favEls.join('、') || '—'}；忌${avoidEls.join('、') || '—'}`,
      climate: climateEl ? `调候先要${climateEl}：${tm.climate}局，${cold ? '寒则先暖，暖过来再谈扶抑' : '燥热则先润，润下来再谈别的'}。` : `调候不急（${tm.climate}），按扶抑走就行。`,
      conflict: conflict
        ? `调候要${GNAME[climateGrp]}，扶抑却把${GNAME[climateGrp]}列为忌——两法打架。传统做法是先救急（${cold ? '寒局先暖' : '燥局先润'}），${GNAME[climateGrp]}这一项按调候优先，其余仍按扶抑。` : '',
      tongguan: tg ? `两强相持处：${tg.pair}，用${tg.mid}通关（${tg.status}）。` : '',
      reverse: weak ? `改判条件：若行运连续补起${favGroups.map((g) => GNAME[g]).join('、')}、且原局根气被合起，可当偏强用；反之若忌神成局又无救，弱会更明显。`
        : strong ? `改判条件：若行运把${favGroups.map((g) => GNAME[g]).join('、')}泄尽而印比又断，强会转弱；出现这种情况要按运重排，不要死守原判。`
          : `改判条件：中和盘最容易看错。哪一步运把某一组推到 ${'>'}3.0，就按那一步重定喜忌。`,
    };
    return verdict;
  }

  /* ---------- 二、一步大运 ---------- */
  const stageOf = (age) => age < 7 ? { name: '童限', note: '先看家庭与身体，不谈事业' }
    : age < 13 ? { name: '小学阶段', note: '主线是读书与家里安排' }
      : age < 19 ? { name: '中学阶段', note: '主线是升学、同伴与第一次自己做决定' }
        : age < 24 ? { name: '求学／初入社会', note: '从学校到社会的过渡，换环境是常事' }
          : age < 31 ? { name: '立业期', note: '工作方向、城市与关系同时定型' }
            : age < 41 ? { name: '爬坡期', note: '责任变重，收入与位置开始分层' }
              : age < 51 ? { name: '承重期', note: '上有老下有小，最忌硬扛' }
                : age < 61 ? { name: '转型期', note: '角色变化多于机会增加' } : { name: '收束期', note: '重在守住与交接' };

  function luckOne(c, l, ys) {
    const stemGod = l.detail.god, branchGod = l.detail.hidden[0].god;
    const sG = grpOfGod(stemGod), bG = grpOfGod(branchGod);
    const sFav = ys.favGroups.includes(sG), bFav = ys.favGroups.includes(bG);
    const sBad = ys.avoidGroups.includes(sG), bBad = ys.avoidGroups.includes(bG);
    const score = (sFav ? 1 : 0) + (bFav ? 1 : 0) - (sBad ? 1 : 0) - (bBad ? 1 : 0);
    const verdict = score >= 2 ? '顺' : score === 1 ? '偏顺' : score === 0 ? '平' : score === -1 ? '偏逆' : '逆';
    const seed = seedOf(c.pillars.join('') + l.pillar);
    const stage = stageOf(l.age);
    const rels = (l.relations || []).map((r) => {
      const pal = String(r.positions).split('—')[0];
      return { ...r, palace: SIDE[pal] || pal, pal };
    });
    const relLine = rels.length
      ? rels.slice(0, 2).map((r) => pick([
        `运${r.pair ? r.pair[1] : ''}与${r.pal}成${r.type.replace('（所采口径）', '')}，动的是${r.palace}这一层`,
        `${r.pal}逢${r.type.replace('（所采口径）', '')}（${r.pair}），${r.palace}这条线会被牵起来`,
      ], seed + r.pal.length)).join('；') + '。'
      : '与原局没有明面合冲，十年主线偏平推，具体动静看流年扣扳机。';
    const tone = score >= 2 ? '顺' : score === 1 ? '偏顺' : score === 0 ? '平' : '逆';
    const advice = score >= 2
      ? pick([`这十年该推的事别拖：换方向、立项目、定关系，都在这十年里做。`, `十年里顺手的比例高，敢把摊子铺开一点，但别把运气当本事。`], seed)
      : score === 1
        ? pick([`一半顺一半顶：先做落在喜用的那一半，忌神那一半只守不攻。`, `干支一喜一忌，这十年的关键是把资源压在对的那一头。`], seed)
        : score === 0
          ? pick([`不好不坏，事情照做，进展不快；这十年的成果靠积累，不靠机会。`, `干支都不在喜忌的极端上，属于打底子的十年，别急着证明什么。`], seed)
          : score === -1
            ? pick([`有一头顶着：能做，但每一步都要多花力气。`, `这十年用力多、回声少，能守就守，别硬上新摊子。`], seed)
            : pick([`干支两头都不在喜用上，这十年宜守不宜攻：保住基本盘，别加杠杆。`, `这十年是低谷段，重点不是赢，是别把之前攒的赔进去。`], seed);

    const lines = [
      `${l.pillar} 一柱，运干${stemGod}、运支本气${branchGod}，主题是${THEME[stemGod]}${sG !== bG ? `，兼${THEME[branchGod]}` : ''}。`,
      `运干${stemGod}${sFav ? '落在喜用一侧' : sBad ? '落在忌神一侧' : '不好不坏'}，运支${branchGod}${bFav ? '也帮得上' : bBad ? '也在拖' : '作用中性'}，合起来判「${verdict}」。`,
      relLine,
      `${l.age} 岁前后进入${stage.name}：${stage.note}。${sBad && bBad ? '这一步先把身体和现金流守住，再谈扩张。' : '该做的动作按这个阶段的节奏来，别用上一个阶段的方式硬套。'}`,
      advice,
    ];
    if (ys.climateGrp && (sG === ys.climateGrp || bG === ys.climateGrp)) lines.splice(2, 0, `这一步补上了调候要的${GNAME[ys.climateGrp]}，${ys.climateEl === '火' ? '寒气得暖，人会松一点' : '燥气被润，急火会降下来'}——这是本运最值钱的地方。`);
    return { verdict, score, lines, stage, stemGod, branchGod, sFav, bFav, sBad, bBad, rels, tone };
  }

  /* ---------- 三、一个流年 ---------- */
  const STAGE_TIP = {
    wealth: '收入、投资、大额支出', power: '岗位、考核、上级与规矩', output: '作品、转岗、表达与被看见',
    resource: '进修、证照、长辈与靠山', peer: '合伙、朋友、同辈分账',
  };
  function yearOne(c, l, y, ys) {
    const g = y.detail.god, grp = grpOfGod(g), bg = y.detail.hidden[0].god, bgrp = grpOfGod(bg);
    const fav = ys.favGroups.includes(grp), bad = ys.avoidGroups.includes(grp);
    const bfav = ys.favGroups.includes(bgrp), bbad = ys.avoidGroups.includes(bgrp);
    const seed = seedOf(String(y.year) + y.pillar);
    const lGod = l.detail.god, lgrp = grpOfGod(lGod);
    const sameAsLuck = grp === lgrp;
    const rels = (y.relations || []).filter((r) => !String(r.positions).includes('大运'));
    const relTxt = rels.length
      ? rels.slice(0, 2).map((r) => {
        const pal = String(r.positions).split('—')[0];
        return `${r.pair ? r.pair[0] + r.pair[1] : ''}${r.type.replace('（所采口径）', '')}落在${SIDE[pal] || pal}`;
      }).join('；')
      : '与原局没有明面合冲';
    const flags = (X.annualFlags ? X.annualFlags(c, l.pillar, y.pillar) : []) || [];
    const flagTxt = flags.length ? flags.map((f) => `${f.type}（${f.level}）`).join('、') : '';
    const verdict = (fav ? 1 : 0) + (bfav ? 1 : 0) - (bad ? 1 : 0) - (bbad ? 1 : 0);
    const tone = verdict >= 2 ? '顺' : verdict === 1 ? '偏顺' : verdict === 0 ? '平' : verdict === -1 ? '偏逆' : '逆';
    const lines = [];
    lines.push(pick([
      `${y.year} 年 ${y.pillar}，流年干为${g}：这一年的主戏是${THEME[g]}。`,
      `${y.year}（${y.pillar}）走到${g}，${THEME[g]}这件事会被摆到台面上。`,
      `${y.year} 年干支${y.pillar}，${g}值年——${THEME[g]}这类事比往年更容易发生。`,
    ], seed));
    lines.push(pick([
      `流年干${g}${fav ? '是喜用' : bad ? '是忌神' : '不好不坏'}，流年支${bg}${bfav ? '也帮着' : bbad ? '也拖后腿' : '中性'}，判「${tone}」。`,
      `按喜忌对表：干${fav ? '喜' : bad ? '忌' : '平'}、支${bfav ? '喜' : bbad ? '忌' : '平'}，这一年整体${tone}。`,
    ], seed + 3));
    lines.push(sameAsLuck
      ? `流年与这步大运同为${GNAME[grp]}，同一件事被推了两次：${STAGE_TIP[grp]}这类事在这一年最容易被放大。`
      : `这步大运走${lGod}，流年却来${g}，${GNAME[grp]}与${GNAME[lgrp]}${['wealth', 'power'].includes(grp) && ['wealth', 'power'].includes(lgrp) ? '互相顶着' : '一主一次'}——先看大运给的条件，再看这一年扣扳机。`);
    lines.push(`${relTxt}${flagTxt ? `；另外${flagTxt}` : ''}。`);
    const palace = rels.length ? (String(rels[0].positions).split('—')[0]) : '';
    lines.push(palace
      ? `落到具体事上，先看${SIDE[palace]}这一层：${STAGE_TIP[grp]}如果不在这层，就别往这层硬套。`
      : `这一年没有明确的宫位指向，${STAGE_TIP[grp]}只在原有轨道上起伏，别硬找事。`);
    if (y.partial) lines.push('这一年跨交运，前后两段要分开看：交运之前按上一步运算，交运之后才按新运算。');
    lines.push(pick([
      `可证伪的写法：如果这年${STAGE_TIP[grp]}有明确动作，算应；没有就记「未应」，别事后补理由。`,
      `留一句反证：若这年${STAGE_TIP[grp]}毫无动静，说明${g}这条线在你身上不敏感，下一年同类年份要降权。`,
    ], seed + 7));
    return { year: y.year, pillar: y.pillar, god: g, tone, verdict, lines, flags, rels, partial: y.partial };
  }

  /* ---------- 四、过三关：具体到年 ---------- */
  function gates(c) {
    const ys = yongshen(c), now = Date.now(), lucks = R.eightLuck(c);
    const done = lucks.filter((l) => l.endUTC < now);
    const current = lucks.find((l) => l.startUTC <= now && l.endUTC > now) || lucks[lucks.length - 1];
    const past = done.slice(-2).map((l) => {
      const years = (l.years || []).filter((y) => y.endUTC < now);
      const picks = years
        .map((y) => ({ y, r: yearOne(c, l, y, ys) }))
        .sort((a, b) => Math.abs(b.r.verdict) - Math.abs(a.r.verdict) || b.y.year - a.y.year)
        .slice(0, 2)
        .sort((a, b) => a.y.year - b.y.year);
      return { luck: luckOne(c, l, ys), number: l.number, pillar: l.pillar, years: picks };
    });
    const thisYear = new Date().getFullYear();
    const future = (current ? current.years : []).filter((y) => y.year >= thisYear).slice(0, 3).map((y) => yearOne(c, current, y, ys));
    return {
      ys,
      past,
      now: current ? { luck: luckOne(c, current, ys), number: current.number, pillar: current.pillar, year: yearOne(c, current, (current.years || []).find((y) => y.year === thisYear) || (current.years || [])[0], ys) } : null,
      future,
    };
  }

  return { yongshen, luckOne, yearOne, gates, stageOf, THEME, GNAME, SIDE, grpOfGod, elOf };
});
