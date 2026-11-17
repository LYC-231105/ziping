/* Transparent traditional study rules; no medical or monetary prediction model. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.ZipingReading=factory(root.Ziping);})(typeof globalThis!=='undefined'?globalThis:this,function(Z){
 'use strict';
 const groups={peer:['比肩','劫财'],output:['食神','伤官'],wealth:['偏财','正财'],power:['七杀','正官'],resource:['偏印','正印']};
 const pair=(a,b,p)=>[...p].every(x=>x===a||x===b)&&a!==b;
 const rules={stemCombine:['甲己','乙庚','丙辛','丁壬','戊癸'],stemClash:['甲庚','乙辛','丙壬','丁癸'],combine:['子丑','寅亥','卯戌','辰酉','巳申','午未'],clash:['子午','丑未','寅申','卯酉','辰戌','巳亥'],harm:['子未','丑午','寅巳','卯辰','申亥','酉戌'],break:['子酉','卯午','辰丑','戌未','寅亥','巳申'],triples:[['申子辰','三合水'],['亥卯未','三合木'],['寅午戌','三合火'],['巳酉丑','三合金'],['寅卯辰','三会木'],['巳午未','三会火'],['申酉戌','三会金'],['亥子丑','三会水']]};
 function relationFacts(pillars,labels){
  const out=[],names=labels||pillars.map((_,i)=>['年柱','月柱','日柱','时柱'][i]||'新增'+i);
  for(let i=0;i<pillars.length;i++)for(let j=i+1;j<pillars.length;j++){
   const a=pillars[i],b=pillars[j];if(!a||!b)continue;
   for(const [key,at,type]of [['stemCombine',0,'天干五合'],['stemClash',0,'天干四冲（所采口径）'],['combine',1,'地支六合'],['clash',1,'地支六冲'],['harm',1,'地支六害'],['break',1,'地支六破（所采口径）']])if(rules[key].some(p=>pair(a[at],b[at],p)))out.push({key,type,pair:a[at]+b[at],indices:[i,j],positions:names[i]+'—'+names[j],note:key==='break'||key==='stemClash'?'传统列表存在流派分歧，按本页明示口径记录。':'仅记录存在；作用、合化与现实事件需另论。'});
   const aa=a[1],bb=b[1];
   if(pair(aa,bb,'子卯'))out.push({key:'punishment',type:'子卯相刑',pair:aa+bb,indices:[i,j],positions:names[i]+'—'+names[j],note:'结构关系，不代表事件或品德。'});
   if(aa===bb&&'辰午酉亥'.includes(aa))out.push({key:'self',type:'自刑候选',pair:aa+bb,indices:[i,j],positions:names[i]+'—'+names[j],note:'同支重复，成立与作用条件存在分歧。'});
  }
  for(const [g,type]of [...rules.triples,['寅巳申','三刑齐见'],['丑戌未','三刑齐见']]){
   if([...g].every(z=>pillars.some(p=>p?.[1]===z))){const indices=pillars.map((p,i)=>g.includes(p?.[1])?i:-1).filter(i=>i>=0);out.push({key:type.includes('刑')?'triplePunishment':'triple',type,pair:g,indices,positions:indices.map(i=>names[i]).join('—'),note:'记录三支齐见；半合、拱合和仅两支三刑不在这里自动成立，齐见也不直接判成化。'});}
  }
  return out;
 }
 function occurrences(c,which){const gods=Array.isArray(which)?which:groups[which],out=[];c.details.forEach((p,i)=>{const pos=['年','月','日','时'][i];if(i!==2&&gods.includes(p.god))out.push({god:p.god,stem:p.stem,pos:pos+'干',visible:true,index:i});p.hidden.forEach((h,k)=>{if(gods.includes(h.god))out.push({god:h.god,stem:h.stem,pos:pos+'支'+p.branch+'藏'+(k===0?'本气':'气'),visible:false,index:i});});});return out;}
 const list=a=>a.map(x=>x.pos+x.stem+'（'+x.god+'）').join('；')||'原局明干及固定藏干表中未检出';
 function strength(c){
  const dm=Z.element(c.dayMaster),month=c.details[1].hidden[0],mg=month.god;
  const peer=groups.peer.includes(mg),resource=groups.resource.includes(mg),seasonSupports=peer||resource;
  const rootFacts=c.details.flatMap((p,i)=>p.hidden.filter(h=>h.element===dm).map(h=>({index:i,branch:p.branch,stem:h.stem,main:p.hidden[0].stem===h.stem,pos:['年','月','日','时'][i]+'支'})));
  const visibleSupport=c.details.filter((p,i)=>i!==2&&[...groups.peer,...groups.resource].includes(p.god));
  const hiddenResource=occurrences(c,'resource'),pressures=occurrences(c,[...groups.output,...groups.wealth,...groups.power]);
  const rootBranches=[...new Set(rootFacts.map(x=>x.index))].length;
  let label='强弱待辨',reason='月令、根气与扶泄条件交错，当前规则不强行给出唯一结论。';
  if(seasonSupports&&rootBranches>=2&&visibleSupport.length>=1){label='偏强候选';reason='月令生扶、至少两处同类藏根及明干扶助同时存在；须继续查克泄耗与根受冲合后的效力。';}
  else if(seasonSupports&&rootBranches>=1){label='偏强候选';reason='月令生扶并有同类根，先提出偏强工作假设；生扶过度、耗泄与合冲均可能要求修订。';}
  else if(!seasonSupports&&rootBranches===0&&visibleSupport.length===0){label='偏弱候选';reason='月令不属生扶、未检出同类藏根且无明干印比扶助；暗印和特殊格局仍须另核，不能自动判从弱。';}
  else if(!seasonSupports&&rootBranches<=1&&visibleSupport.length===0){label='偏弱候选';reason='月令非生扶，同类根有限、明干扶助不足；应进一步检查暗印根效与克泄耗，保留反证。';}
  else if(!seasonSupports&&rootBranches>=1&&visibleSupport.length>=1){label='失令有扶 · 强弱待辨';reason='月令不直接扶日主，但同类根和明干印比都存在；不能仅以失令判弱，也不能据有根判旺。';}
  const season=peer?'月令本气与日主同类，作为得令线索':resource?'月令本气生日主，作为得生线索':groups.output.includes(mg)?'月令本气为食伤，属于泄日主线索':groups.wealth.includes(mg)?'月令本气为财，属于日主克出耗用线索':'月令本气为官杀，属于克日主线索';
  const rootText=rootFacts.map(x=>`${x.pos}${x.branch}藏${x.stem}${x.main?'（本气根）':'（同类藏根，效力待辨）'}`).join('；')||'未检出同五行藏根，仍不能忽略暗印或其他生扶';
  const evidence=[`得令 / 得生：${c.pillars[1][1]}月本气${month.stem}为${mg}；${season}。`,`得地：${rootText}。`,`得助：明干印比${visibleSupport.map(p=>p.stem+p.god).join('、')||'未见'}；印星全表${list(hiddenResource)}。`,`克泄耗：${list(pressures)}。这些是位置清单，不是力量百分比。`];
  const limits=['本规则为普通扶抑的透明初筛，未标定准确率，不给旺衰分数。','同类根的实际效力、月令深浅、湿燥寒暖和合冲是否真正改局尚需人工审查。','从格、专旺、化气格须另查严格条件；身强身弱不等于体力、健康、道德或财富等级。'];
  return {label,reason,evidence,limits,rootFacts,seasonSupports,rootBranches,visibleSupport:visibleSupport.length};
 }
 function branchDetail(p,dm){return {stem:p[0],branch:p[1],god:Z.god(dm,p[0]),hidden:[...Z.HIDDEN[Z.ZHI.indexOf(p[1])]].map(stem=>({stem,god:Z.god(dm,stem),element:Z.element(stem)}))};}
 const topics={比肩:'自主、同伴和责任边界',劫财:'合作、竞争和分配',食神:'持续产出、技能和成果',伤官:'表达、创新与评价标准',偏财:'流动资源、经营与外部机会',正财:'收入承接、预算和经营兑现',七杀:'压力、任务与约束',正官:'规则、职责与组织评价',偏印:'专门研究与支持方式',正印:'学习、资质与支持系统'};
 const fullDate=(t,zone)=>Z.formatWall(Z.wallStamp(Z.zonedParts(t,zone)));
 function targetRelations(c,extra){const ps=[...c.pillars,...extra.map(x=>x.pillar)],labels=['年柱','月柱','日柱','时柱',...extra.map(x=>x.name)];return relationFacts(ps,labels).filter(r=>r.indices.some(i=>i>=4));}
 function relationText(rs){return rs.map(r=>r.positions+' '+r.pair+' '+r.type).join('；')||'当前明示关系表中未见新增配对；不代表不存在其他生克条件';}
 function annotations(c,p,rs){
  const d=branchDetail(p,c.dayMaster),all=[d.god,...d.hidden.map(h=>h.god)],spouse=c.input.gender==='male'?groups.wealth:groups.power;
  const has=g=>all.some(x=>groups[g].includes(x)),hasSpouse=all.some(x=>spouse.includes(x));
  const palace=rs.filter(r=>r.indices.includes(2));
  const palaceNote=palace.length?'与日支相关：'+relationText(palace)+'。':'本表未见新增字与日支形成所列关系。';
  const originalSpouse=occurrences(c,spouse), originalWealth=occurrences(c,'wealth'),originalOutput=occurrences(c,'output');
  const affects=idx=>{const found=rs.filter(r=>r.indices.includes(idx));return found.length?relationText(found):'本表未检出新增字与'+['年柱','月柱','日柱','时柱'][idx]+'的所列关系'};
  const layerStars=godList=>[(godList.includes(d.god)?p[0]+d.god+'明透':''),...d.hidden.filter(h=>godList.includes(h.god)).map(h=>p[1]+'藏'+h.stem+h.god)].filter(Boolean).join('、')||'未直接增加';
  const roots=[...Z.HIDDEN[Z.ZHI.indexOf(p[1])]].filter(x=>Z.element(x)===Z.element(c.dayMaster));
  return {
   structure:`${p[0]}相对${c.dayMaster}为${d.god}，${p[1]}藏${d.hidden.map(h=>h.stem+h.god).join('、')}。${roots.length?'新增同类藏根'+roots.join('、')+'；其效力须查月令与合冲。':'新增支未藏日主同五行；仍需看印星生扶和原局根。'}原局为${c.dayMaster}日、${c.pillars[1][1]}月，已有根的位置：${c.roots.map(r=>r.position+'支'+r.stems.join('')).join('、')||'未检出同五行藏根'}。该层天干提供“${topics[d.god]}”的传统阅读入口。`,
   marriage:`${c.input.gender==='male'?'男命按财星':'女命按官杀'}作为传统伴侣星入口。本层${p}的对应星：${layerStars(spouse)}。${hasSpouse?'本层明藏出现对应星类，可作为关系议题的传统候选窗口；':'本层未增加对应星类，不因此排除现实恋爱或婚姻。'}${palaceNote}原局对应星：${list(originalSpouse)}。候选窗口还须原局星宫、整步运与实际关系资料配合，不能断定必婚、离异或伴侣不忠。`,
   career:`本层${p}的工作线索：${layerStars([...groups.output,...groups.power,...groups.resource])}。${has('output')?'本层见食伤，先讨论技能输出、作品与表达；':''}${has('power')?'本层见官杀，讨论岗位责任、规则或任务压力；':''}${has('resource')?'本层见印，讨论学习、证照与支持资源；':''}${!has('output')&&!has('power')&&!has('resource')?'本层由'+d.god+'进入，再看输出、资源与组织评价如何衔接。':''}需与原局生克承接及实际年龄、教育和工作经历配合，不能由十神认定升职或唯一职业。`,
   wealth:`本层${p}的财类：${layerStars(groups.wealth)}。${has('wealth')?'本层明藏见财，新增日主所克的资源线索。':'本层未直接新增财星，可查是否通过输出、印比、官杀改变承接。'}${has('peer')?'同时有比劫，需具体查资源分配与财星路线，不能只见劫财就断破财。':''}${has('output')?'食伤与财的承接可列为条件问题，先核原局是否有财承接、日主是否有承担条件。':''}原局财的承接位置：${list(originalWealth)}；原局输出：${list(originalOutput)}。新增财是否有源、新增食伤是否能生原局财，须据具体透藏与根气另审。这属于传统结构讨论，不足以换算资产金额、收益或贫富级别。`,
   health:`健康：本层干支与合冲无法计算个体患病概率。${rs.some(r=>['clash','punishment','triplePunishment'].includes(r.key))?'虽出现冲刑，仍不能据此指定伤病或事故。':'没有所列冲刑，也不等于医学上的健康保证。'}若讨论身体状况，需另有症状、病史、检查与专业评估；五行脏腑对应只在教学中作为历史理论说明。`,
   children:`本层${p}的所采子息星：${layerStars(c.input.gender==='male'?groups.power:groups.output)}。${c.input.gender==='male'?'男命子息本段采用官杀线索，另保留食伤等取法异说':'女命子息本段采用食伤线索'}。${(c.input.gender==='male'?has('power'):has('output'))?'本层明藏增加所采子息星类，列为传统候选条件。':'本层未直接增加所采子息星类，不因此排除现实生育或照顾责任。'}时柱${c.pillars[3]}：${affects(3)}。应先看原局子息星宫，再合整运与该年；不能据此判人数、性别、生育能力或具体怀孕年份。`,
   parents:`本层${p}财印：${layerStars([...groups.wealth,...groups.resource])}。传统父母入口先查财与印，参看年柱${c.pillars[0]}、月柱${c.pillars[1]}。${has('wealth')?'本层新增财类，可研究父亲映射及资源议题；':''}${has('resource')?'本层新增印类，可研究母亲映射及支持议题；':''}${!has('wealth')&&!has('resource')?'本层未直接新增财印，仍须查原局路线是否改变；':''}${affects(0)}；${affects(1)}。这些不能证明亲属有事，须另核家庭支持、照顾安排与真实经历，不推亲属疾病寿命。`,
   siblings:`本层${p}比劫：${layerStars(groups.peer)}。手足与同辈传统入口为比劫，原局位置：${list(occurrences(c,'peer'))}。${has('peer')?'本层增加比劫，需分生扶与资源分配两种条件，核是否有财、官杀承接制约。':'本层不直接增加比劫，仍可查财、官、印怎样改变原有同辈路线。'}月柱相关：${affects(1)}。可讨论合作职责、出资与沟通的现实核查，不能据字数断兄妹人数，不能见劫财就认定夺财。`

  };
 }
 const lichunCache=new Map();
 function lichun(y){if(!lichunCache.has(y)){const q=Z.termsAround(Date.UTC(y,1,4)).find(t=>t.name==='立春'&&Number(t.utc8.slice(0,4))===y);if(!q)throw Error('未找到'+y+'年立春，停止生成该年边界。');lichunCache.set(y,q.utc);}return lichunCache.get(y);}
 function annualForLuck(c,row){
  const out=[],first=new Date(row.startUTC).getUTCFullYear()-1,last=new Date(row.endUTC).getUTCFullYear();
  for(let y=first;y<=last;y++){
   if(y<1900||y>2198)continue;
   const yearStart=lichun(y),yearEnd=lichun(y+1),startUTC=Math.max(row.startUTC,yearStart),endUTC=Math.min(row.endUTC,yearEnd);if(startUTC>=endUTC)continue;
   const pillar=y===1900?'庚子':Z.annual(y),detail=branchDetail(pillar,c.dayMaster),combined=targetRelations(c,[{name:'本步大运',pillar:row.pillar},{name:y+'流年',pillar}]);
   const rs=combined.filter(r=>r.indices.includes(5)),notes=annotations(c,pillar,rs),same=combined.filter(r=>r.indices.includes(4)&&r.indices.includes(5));
   out.push({year:y,pillar,detail,yearStart,yearEnd,startUTC,endUTC,partial:startUTC!==yearStart||endUTC!==yearEnd,relations:rs,notes,overlap:same,age:y-Number(c.input.date.slice(0,4)),window:`${fullDate(startUTC,c.input.timezone)} 至 ${fullDate(endUTC,c.input.timezone)}前`});
  }
  return out;
 }
 const reportCache=new WeakMap();
 function eightLuck(c){if(reportCache.has(c))return reportCache.get(c);const a=c.luck.rows.slice(0,8).map((r,i)=>{const rs=targetRelations(c,[{name:'第'+(i+1)+'步大运',pillar:r.pillar}]);return {...r,number:i+1,relations:rs,notes:annotations(c,r.pillar,rs),years:annualForLuck(c,r),window:`${fullDate(r.startUTC,c.input.timezone)} 至 ${fullDate(r.endUTC,c.input.timezone)}前`};});reportCache.set(c,a);return a;}
 function subjectSections(c){
  const s=strength(c),dm=c.dayMaster,month=c.details[1],spouse=occurrences(c,c.input.gender==='male'?'wealth':'power'),wealth=occurrences(c,'wealth'),output=occurrences(c,'output'),officer=occurrences(c,'power'),resource=occurrences(c,'resource'),peer=occurrences(c,'peer'),rel=relationFacts(c.pillars),dayRel=rel.filter(r=>r.indices.includes(2));
  const occupational=[];
  if(output.length)occupational.push('食伤线索可对应作品、讲解、技术输出或创作任务，先用实际作品检验表达与交付能力。');
  if(resource.length)occupational.push('印星线索可对应研究、教育、知识整理或需要资格训练的任务，须另核兴趣、学习成果与资质要求。');
  if(officer.length)occupational.push('官杀线索可对应规范、项目责任、质量管理或组织协作任务，须另核专业技能与对规则的适应。');
  if(wealth.length)occupational.push('财星线索可对应经营、采购、资源协调或客户服务任务，须另核真实商业能力和市场机会。');
  if(peer.length)occupational.push('比劫线索可对应团队协作、独立承接与分工任务，须用项目记录核资源边界。');
  return [
   {id:'strength',title:'身强身弱：四栏证据与工作判断',fact:`普通扶抑初筛：${s.label}。${s.reason}`,paragraphs:[...s.evidence,'反证与适用边界：'+s.limits.join(' '),'下一步分别写“得令但克泄重是否改判”“失令但根印有效是否不弱”，再用同一传统框架复核。扶抑、格局、调候分栏，不由偏强或偏弱直接推出唯一喜用。'],reflection:'先核每项事实，再决定是否接受工作假设；强弱待辨也要说明具体争点。',source:'BK01-L124-C0'},
   {id:'relationships',title:(c.input.gender==='male'?'男命':'女命')+'婚姻：星宫、质量条件与应期候选',fact:`${c.input.gender==='male'?'财星':'官杀'}：${list(spouse)}。日支${c.pillars[2][1]}藏${c.details[2].hidden.map(h=>h.stem+h.god).join('、')}。日支相关关系：${relationText(dayRel)}。`,paragraphs:[`第一步，先将伴侣星的位置、透藏、根气与日支夫妻宫分开；本盘日主${dm}，所有十神仍相对${dm}换算。${spouse.length?'当前有对应星的结构事实，是否为所用、是否受制或有承接，仍须全局条件。':'未检出对应星不能证明终身无婚；要保留其他取法与现实资料。'}`,'第二步，传统“婚姻好坏”要说明指哪组结构条件：星宫能否相互承接、所用星是否受损、合冲是否有缓解路线、财印食伤是否改变作用。星宫有制约只说明待研究条件，不能证实双方感情、忠诚或是否适合共同生活。现实质量应另外核对尊重、沟通、责任、金钱约定与冲突修复。','第三步，应期按“原局有何条件→哪步运增加相关星或改变星宫→哪个立春年再次作用→是否跨交运”记录。下方八运逐年列出相关线索。星出现、夫妻宫逢合冲都只能列候选，不能单独断定结婚、离异或外遇；必须保留未应验和其他事件可能。','男子偏财、女子伤官或官杀同见不能作为品德证据。年龄尚幼的时期以家庭环境和关系学习为议题，不把每个星的出现都解释成婚恋。'],reflection:'为候选窗口写至少一项支持条件、一项反证和两条现实资料需求。',source:'BK01-L354-C0'},
   {id:'work',title:'事业与职业：把结构译成可验证的能力任务',fact:`输出：${list(output)}。规则约束：${list(officer)}。支持：${list(resource)}。`,paragraphs:[`先结合${s.label}的工作判断，核原局输出、资源、规则、支持如何衔接。食伤与财同见不能直接认证食伤生财，官印同见也不能直接认定有官职；要写位置、透藏、根气与阻隔。`,...occupational,'上述是传统象义可提出的任务方向，没有唯一职业结论。具体选择还需教育、兴趣、作品、身体条件、地区机会、行业要求与真实试做反馈。未成年运段优先读学习、家庭支持；成年运段再结合真实履历，不能把同一份职业话术套全年龄。','事业应期同样分原局、十年运和立春年：列新增的岗位约束、输出和学习支持条件，再问现实有无申请、项目、任命或行业变化。下方逐年研读保留反证，不把某官星年写成必然升职。'],reflection:'选两个任务方向各做一次实际试作，用反馈缩小选择，不凭五行确定行业。'},
   {id:'wealth',title:'财运与财富层级：来源、承接、分配与留存',fact:`财星：${list(wealth)}。输出来源：${list(output)}。同辈分配：${list(peer)}。`,paragraphs:[`按原局先问财的来源与位置，再问${dm}日主的承担条件，再查食伤生财、比劫参与、官杀承接或财印制约；当前扶抑工作判断为${s.label}，仍有待核条件，不能跳过它谈大富。`,'传统财富层级的研读可分四栏：财是否有来源与根、能否形成承接、是否有制约与救应、岁运是否持续支持。财多而无承担、财少而路线清楚是不同问题；“财气通门户”等词要追溯整段条件，不能用财字个数判贫富。','本程序不能将这些结构换算成小康、千万、亿万或确定净资产。古代富贵等级与现代收入和资产定义不同，没有经过独立验证的干支到金额模型。当前财富层级结论为“无法由八字核实”，不会编造精确金额或发财年份。','现实评估需可核收入来源、负债、现金流、资产、地区生活成本及风险承担等资料；这些资料未输入，不能假装已知。逐年部分只列传统资源、分配和承接问题，不给买卖时点或收益预测。'],reflection:'把财富结论拆成传统结构条件与需要现实数字支持的部分，记录反例。',source:'BK04-L3142-C0'},
   {id:'health',title:'身体健康：历史五行理论与医学判断分开',fact:`本盘${dm}日、${month.branch}月，已列根气和克泄耗；这些数据不是症状、检查或疾病风险模型。`,paragraphs:['传统疾病篇常把木火土金水对应肝心脾肺肾等概念，这是历史医学与命理语汇。古代“肝”“脾”等概念与现代解剖、检验和疾病诊断并非简单等号，不能把某五行偏多或缺失直接判成某种疾病。','因此，本盘不输出“容易得肝病、心脏病、肿瘤”等个体疾病结论，也不从身强身弱推断免疫力、寿命或生育能力。冲刑、自刑和某运某年均不提供已验证的医疗概率；没有这些关系也不能保证健康。','要具体讨论身体状况，需要实际症状、持续时间、病史、家族史、用药与检查资料，再由合适的医疗评估判断。当前资料不足以给个体健康预测。传统理论可在教学中辨读，不能据此自行用药、停药或推迟就医。'],reflection:'能解释古籍病象的取法，不等于能诊断；把个人健康问题交给实际医学证据。',source:'BK02-L2121-C0'},
   {id:'children',title:'子女：取法版本、时柱与现实未知',fact:`时柱${c.pillars[3]}，藏${c.details[3].hidden.map(h=>h.stem+h.god).join('、')}；食伤${list(output)}；官杀${list(officer)}。`,paragraphs:[`${c.input.gender==='male'?'本盘男命，部分传统以官杀作为子息入口，须先声明该取法。':'本盘女命，部分传统以食伤作为子息入口，须先声明该取法。'}《子平真诠》含阳干长生和官杀的专门论法，其他书亦有异说；不能把不同版本拼起来凑成唯一人数。`,'先记录时柱作为传统子息宫的内容，再看所采子息星透藏、根气、制化与时柱关系；八运流年中新增的相关字可以作传统研读线索。没有时刻或跨时辰候选时，不能生成唯一子息结论。','子女数量、性别、是否能生育、子女健康、孝顺和具体生育年份，均不能凭这些符号核实。现实需另有生育意愿、家庭安排和医学资料，不由命盘替人决定。可用于讨论的实际议题是照顾责任、沟通、教育支持和资源安排。'],reflection:'写取法、星、宫、条件和未知；不要由“子星出现”直接写成生育事件。',source:'BK01-L358-C0'},
   {id:'parents',title:'父母与原生家庭：星与年月宫位合看',fact:`财星线索${list(wealth)}；印星线索${list(resource)}；年柱${c.pillars[0]}、月柱${c.pillars[1]}。`,paragraphs:['传统常以财论父、印论母，并参看年月宫位；正偏的具体亲属细分须声明文本。先分星与宫，再列透藏、根气、生克和是否有救应，不见印或财不等于无父无母。','财印制约可作为支持与资源冲突的传统结构问题，但不能直接认定父母关系不和、父母富贵、早逝或亲子疏离。偏印不等于继母，财印数量也不等于父母人数。','不同年龄运段可讨论家庭支持、学习资源、独立与照顾责任。具体亲属健康、职业和事件时间，需要本人资料与事实证据；逐年见财印仅是映射线索，不是父母必有某事。'],reflection:'把真实家庭结构和经历另外记录，允许传统映射不符合，不反向修改事实。',source:'BK01-L343-C0'},
   {id:'siblings',title:'兄弟姐妹与同辈：比劫、月柱与分配条件',fact:`比劫${list(peer)}；月柱${c.pillars[1]}；年、月及比劫关系按共同生克法核。`,paragraphs:['比肩劫财常被传统用作同辈、手足的入口，参看年月宫位与全局。先查比劫是否生扶日主、参与财的分配或被官杀制约；同一比劫可在不同结构中发挥不同作用。','不能将比劫个数换算兄弟姐妹人数，也不能见劫财就断亲属夺财。现实同辈关系受家庭结构、性格、资源制度与行为影响；合作、竞争或帮助需据事实记录。','运年新增比劫时可列协作与分配的核查问题，具体考察出资、职责、报酬与退出约定。这里保留传统依据，不给亲属品德、寿命与必然冲突的断言。'],reflection:'分别写“有帮助的条件”和“产生分配压力的条件”，再查真实行为。',source:'BK02-L2338-C0'},
   {id:'timing-method',title:'应期怎样推：先原局，再大运，后流年',fact:`本盘${c.luck.forward?'顺':'逆'}行，取${c.luck.term.name}，${c.luck.years}年${c.luck.months}月${c.luck.days}日${c.luck.hours}时起运，前八步运如下逐项展开。`,paragraphs:['先把要讨论的议题写清楚：婚姻、工作、资源或家庭；为该议题列原局星宫及支持、制约条件。再看哪步运新增或改变这些条件，最后查哪一个立春年在这步运内继续作用。','“星到、宫动、合冲、伏吟、反吟”等只是传统候选线索，不可直接等于现实事件。并非每个相关年都有事件；同一结构可能对应不同生活议题，尚无经验证的唯一映射。','下方按准确交运区间与立春年区间取交集。一个流年可能分属前后两运，因此会在两步运中分别出现并显示部分年份窗口；不能只按公历元旦或整数年龄归运。每年同时列理由与待核事项。'],reflection:'先登记条件和窗口，后记录符合、不符合与无法判断，避免事后只挑说中的部分。'}
  ];
 }
 return {groups,rules,relationFacts,occurrences,list,strength,branchDetail,relationText,annotations,lichun,annualForLuck,eightLuck,subjectSections,fullDate};
});
