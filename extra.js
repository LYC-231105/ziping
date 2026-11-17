/* 专业补充模块：神煞、胎元、旺衰透明加权、格局取用候选、十神能量、流月。
   所有规则均在界面标明查法口径；计算结果只作结构事实，不构成事件断言。 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'));else root.ZipingExtra=factory(root.Ziping);})(typeof globalThis!=='undefined'?globalThis:this,function(Z){
 'use strict';
 const GAN=Z.GAN,ZHI=Z.ZHI,mod=Z.mod;
 const POS=['年','月','日','时'];
 const stemIdx=g=>GAN.indexOf(g),branchIdx=b=>ZHI.indexOf(b);

 /* ---------- 神煞 ---------- */
 const SS_RULES=[
  {name:'天乙贵人',kind:'吉',from:'日干（本页口径）',basis:'甲戊庚见丑未，乙己见子申，丙丁见亥酉，壬癸见卯巳，辛见午寅。口诀通行本作「甲戊庚牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，六辛逢马虎」。另有一版作「庚辛逢马虎」，则庚亦取午寅，本页不采；古法亦有以年干查者，本页只按日干。',
   map:{'甲':'丑未','戊':'丑未','庚':'丑未','乙':'子申','己':'子申','丙':'亥酉','丁':'亥酉','壬':'卯巳','癸':'卯巳','辛':'午寅'},lookup:'stem',targets:'branch'},
  {name:'太极贵人',kind:'吉',from:'日干',basis:'甲乙子午，丙丁卯酉，戊己辰戌丑未，庚辛寅亥，壬癸巳申。',
   map:{'甲':'子午','乙':'子午','丙':'卯酉','丁':'卯酉','戊':'辰戌丑未','己':'辰戌丑未','庚':'寅亥','辛':'寅亥','壬':'巳申','癸':'巳申'},lookup:'stem',targets:'branch'},
  {name:'文昌贵人',kind:'吉',from:'日干',basis:'甲巳、乙午、丙申、丁酉、戊申、己酉、庚亥、辛子、壬寅、癸卯。',
   map:{'甲':'巳','乙':'午','丙':'申','丁':'酉','戊':'申','己':'酉','庚':'亥','辛':'子','壬':'寅','癸':'卯'},lookup:'stem',targets:'branch'},
  {name:'天德贵人',kind:'吉',from:'月支',basis:'寅月丁、卯月申、辰月壬、巳月辛、午月亥、未月甲、申月癸、酉月寅、戌月丙、亥月乙、子月巳、丑月庚。',
   map:{'寅':'丁','卯':'申','辰':'壬','巳':'辛','午':'亥','未':'甲','申':'癸','酉':'寅','戌':'丙','亥':'乙','子':'巳','丑':'庚'},lookup:'monthBranch',targets:'both'},
  {name:'月德贵人',kind:'吉',from:'月支',basis:'寅午戌月见丙，申子辰月见壬，亥卯未月见甲，巳酉丑月见庚。',
   map:{'寅':'丙','午':'丙','戌':'丙','申':'壬','子':'壬','辰':'壬','亥':'甲','卯':'甲','未':'甲','巳':'庚','酉':'庚','丑':'庚'},lookup:'monthBranch',targets:'both'},
  {name:'禄神',kind:'吉',from:'日干',basis:'甲禄在寅、乙卯、丙戊禄在巳、丁己禄在午、庚申、辛酉、壬亥、癸子。',
   map:{'甲':'寅','乙':'卯','丙':'巳','戊':'巳','丁':'午','己':'午','庚':'申','辛':'酉','壬':'亥','癸':'子'},lookup:'stem',targets:'branch'},
  {name:'羊刃',kind:'中性',from:'日干（仅阳干立表）',basis:'阳干取帝旺之位：甲卯、丙午、戊午、庚酉、壬子。阴干羊刃有乙寅／乙辰、丁巳／丁未等异说，本页不列以免混用。',
   map:{'甲':'卯','丙':'午','戊':'午','庚':'酉','壬':'子'},lookup:'stem',targets:'branch'},
  {name:'金舆',kind:'吉',from:'日干',basis:'甲辰、乙巳、丙未、丁申、戊未、己申、庚戌、辛亥、壬丑、癸寅。',
   map:{'甲':'辰','乙':'巳','丙':'未','丁':'申','戊':'未','己':'申','庚':'戌','辛':'亥','壬':'丑','癸':'寅'},lookup:'stem',targets:'branch'},
  {name:'驿马',kind:'中性',from:'年支 / 日支',basis:'申子辰马在寅，寅午戌马在申，巳酉丑马在亥，亥卯未马在巳。',
   map:{'申':'寅','子':'寅','辰':'寅','寅':'申','午':'申','戌':'申','巳':'亥','酉':'亥','丑':'亥','亥':'巳','卯':'巳','未':'巳'},lookup:'yearDayBranch',targets:'branch'},
  {name:'桃花（咸池）',kind:'中性',from:'年支 / 日支',basis:'申子辰见酉，寅午戌见卯，巳酉丑见午，亥卯未见子。',
   map:{'申':'酉','子':'酉','辰':'酉','寅':'卯','午':'卯','戌':'卯','巳':'午','酉':'午','丑':'午','亥':'子','卯':'子','未':'子'},lookup:'yearDayBranch',targets:'branch'},
  {name:'华盖',kind:'中性',from:'年支 / 日支',basis:'申子辰见辰，寅午戌见戌，巳酉丑见丑，亥卯未见未。',
   map:{'申':'辰','子':'辰','辰':'辰','寅':'戌','午':'戌','戌':'戌','巳':'丑','酉':'丑','丑':'丑','亥':'未','卯':'未','未':'未'},lookup:'yearDayBranch',targets:'branch'},
  {name:'将星',kind:'吉',from:'年支 / 日支',basis:'申子辰见子，寅午戌见午，巳酉丑见酉，亥卯未见卯（三合局中神）。',
   map:{'申':'子','子':'子','辰':'子','寅':'午','午':'午','戌':'午','巳':'酉','酉':'酉','丑':'酉','亥':'卯','卯':'卯','未':'卯'},lookup:'yearDayBranch',targets:'branch'},
  {name:'劫煞',kind:'凶',from:'年支 / 日支',basis:'申子辰见巳，寅午戌见亥，巳酉丑见寅，亥卯未见申。',
   map:{'申':'巳','子':'巳','辰':'巳','寅':'亥','午':'亥','戌':'亥','巳':'寅','酉':'寅','丑':'寅','亥':'申','卯':'申','未':'申'},lookup:'yearDayBranch',targets:'branch'},
  {name:'亡神',kind:'凶',from:'年支 / 日支',basis:'申子辰见亥，寅午戌见巳，巳酉丑见申，亥卯未见寅。',
   map:{'申':'亥','子':'亥','辰':'亥','寅':'巳','午':'巳','戌':'巳','巳':'申','酉':'申','丑':'申','亥':'寅','卯':'寅','未':'寅'},lookup:'yearDayBranch',targets:'branch'},
  {name:'孤辰',kind:'凶',from:'年支',basis:'亥子丑见寅，寅卯辰见巳，巳午未见申，申酉戌见亥。',
   map:{'亥':'寅','子':'寅','丑':'寅','寅':'巳','卯':'巳','辰':'巳','巳':'申','午':'申','未':'申','申':'亥','酉':'亥','戌':'亥'},lookup:'yearBranch',targets:'branch'},
  {name:'寡宿',kind:'凶',from:'年支',basis:'亥子丑见戌，寅卯辰见丑，巳午未见辰，申酉戌见未。',
   map:{'亥':'戌','子':'戌','丑':'戌','寅':'丑','卯':'丑','辰':'丑','巳':'辰','午':'辰','未':'辰','申':'未','酉':'未','戌':'未'},lookup:'yearBranch',targets:'branch'},
  {name:'红鸾',kind:'吉',from:'年支',basis:'子卯、丑寅、寅丑、卯子、辰亥、巳戌、午酉、未申、申未、酉午、戌巳、亥辰。',
   map:{'子':'卯','丑':'寅','寅':'丑','卯':'子','辰':'亥','巳':'戌','午':'酉','未':'申','申':'未','酉':'午','戌':'巳','亥':'辰'},lookup:'yearBranch',targets:'branch'},
  {name:'天喜',kind:'吉',from:'年支',basis:'红鸾对冲之位：子见酉、丑见申……依红鸾表推移六位。',
   map:{'子':'酉','丑':'申','寅':'未','卯':'午','辰':'巳','巳':'辰','午':'卯','未':'寅','申':'丑','酉':'子','戌':'亥','亥':'戌'},lookup:'yearBranch',targets:'branch'}
 ];

 function shensha(c){
  const ps=c.pillars,out=[];
  for(const r of SS_RULES){
   let keys=[];
   if(r.lookup==='stem')keys=[ps[2][0]];
   else if(r.lookup==='yearBranch')keys=[ps[0][1]];
   else if(r.lookup==='dayBranch')keys=[ps[2][1]];
   else if(r.lookup==='yearDayBranch')keys=[ps[0][1],ps[2][1]];
   else if(r.lookup==='monthBranch')keys=[ps[1][1]];
   const targets=new Set();
   keys.forEach(k=>{const v=r.map[k];if(v)[...v].forEach(ch=>targets.add(ch));});
   if(!targets.size)continue;
   const found=[];
   ps.forEach((p,i)=>{
     if(r.targets!=='branch'&&targets.has(p[0]))found.push({pos:POS[i]+'干',char:p[0]});
     if(targets.has(p[1]))found.push({pos:POS[i]+'支',char:p[1]});
   });
   if(found.length)out.push({name:r.name,kind:r.kind,basis:r.basis,from:r.from,query:keys.join('、'),targets:[...targets].join(''),found});
  }
  return out;
 }
 function shenshaSummary(list){
  return list.map(s=>`${s.name}（${s.found.map(f=>f.pos+f.char).join('、')}）`).join('；')||'本页所列神煞表中未见命中';
 }

 /* ---------- 胎元 ---------- */
 function taiYuan(c){
  const m=c.pillars[1];
  const stem=GAN[mod(stemIdx(m[0])+1,10)],branch=ZHI[mod(branchIdx(m[1])+3,12)];
  return {pillar:stem+branch,basis:`以月柱${m}为基准：天干进一位得${stem}，地支进三位得${branch}，故胎元为${stem}${branch}。`};
 }

 /* ---------- 旺衰透明加权 ---------- */
 const SEASON_WEIGHT=[['比肩',40,'月令本气与日主同类，得令最有力'],['劫财',40,'月令本气与日主同类，得令最有力'],
  ['正印',34,'月令本气生日主，得生'],['偏印',34,'月令本气生日主，得生'],
  ['食神',16,'月令本气为日主所生，属泄'],['伤官',16,'月令本气为日主所生，属泄'],
  ['正财',12,'月令本气为日主所克，属耗'],['偏财',12,'月令本气为日主所克，属耗'],
  ['正官',8,'月令本气克日主，属克'],['七杀',8,'月令本气克日主，属克']];
 const ROOT_WEIGHT={month:{main:10,mid:6},day:{main:12,mid:7},hour:{main:8,mid:5},year:{main:5,mid:3}};
 function strengthScore(c){
  const dmEl=Z.element(c.dayMaster),items=[];let total=0;
  // 得令 40
  const monthMain=c.details[1].hidden[0];
  const sw=SEASON_WEIGHT.find(x=>x[0]===monthMain.god)||['',10,''];
  items.push({label:'得令（月令本气）',max:40,score:sw[1],detail:`${c.pillars[1][1]}月本气${monthMain.stem}${monthMain.element}，相对${c.dayMaster}为${monthMain.god}。${sw[2]}`});
  total+=sw[1];
  // 得地 35
  const key=['year','month','day','hour'],rl=[];let rootScore=0;
  c.details.forEach((p,i)=>{
    p.hidden.forEach((h,k)=>{
      if(h.element!==dmEl)return;
      const w=ROOT_WEIGHT[key[i]];const val=k===0?w.main:Math.round(w.main*(k===1?0.6:0.3));
      rootScore+=val;rl.push(`${POS[i]}支${p.branch}藏${h.stem}${k===0?'（本气）':'（'+(k===1?'中气':'余气')+'）'}+${val}`);
    });
  });
  rootScore=Math.min(35,rootScore);
  items.push({label:'得地（通根）',max:35,score:rootScore,detail:rl.length?rl.join('，'):'四支固定藏干中未见日主同五行，通根计0'});
  total+=rootScore;
  // 得势 25：按柱位加权（月干最近，时干次之，年干最远），比劫帮身略重于印
  const SUP={year:{peer:7,res:6},month:{peer:9,res:8},hour:{peer:9,res:8}};
  const support=[];let supScore=0;
  c.details.forEach((p,i)=>{
    if(i===2)return;
    const isPeer=['比肩','劫财'].includes(p.god),isRes=['正印','偏印'].includes(p.god);
    if(!isPeer&&!isRes)return;
    const add=isPeer?SUP[key[i]].peer:SUP[key[i]].res;
    supScore+=add;support.push(`${POS[i]}干${p.stem}${p.god}+${add}`);
  });
  supScore=Math.min(25,supScore);
  items.push({label:'得势（天干帮扶）',max:25,score:supScore,detail:support.length?support.join('；')+'（仅计明干，暗藏印比不重复计分）':'年、月、时干未见印比，得势计0'});
  total+=supScore;
  const grade=total>=62?'偏强':total>=52?'中和偏强':total>=42?'中和':total>=32?'中和偏弱':'偏弱';
  return {items,total,grade,
   basis:'权重为本页自定的透明试算模型：月令40、通根35、天干帮扶25，合计100。各类传统表格权重不同（另有月令50、通根30等），本页只保证过程可复算。',
   limits:['分数用于把"得令/得地/得势"三栏量化比较，不是传统定论，也没有经过预测准确率验证。','分数高不等于命好，分数低不等于能力弱；它只描述日主得到的同类与生扶条件。','从格、专旺、化气格须另查严格条件，本模型不处理，遇极端偏枯时应回到四柱逐项复核。']};
 }

 /* ---------- 格局取用候选 ---------- */
 const GEJU_NAME={'正官':'正官格','七杀':'七杀格','正财':'正财格','偏财':'偏财格','食神':'食神格','伤官':'伤官格','正印':'正印格','偏印':'偏印格','比肩':'建禄格／月劫格','劫财':'建禄格／月劫格'};
 const GEJU_COND={
  '正官格':'成格常论官星得地有根、财印相辅而不相碍；忌伤官直接克官、官星被合去或坐绝无根。',
  '七杀格':'成格常论有制（食伤制杀）或有化（印绶化杀）；忌杀重无制、制杀太过反伤贵气。',
  '正财格':'成格常论财有来源、日主能担、官星护财；忌比劫夺财而无制、身弱财重。',
  '偏财格':'成格常论财旺有根、食伤生财、日主能任；忌劫财争夺、财多身弱。',
  '食神格':'成格常论食神吐秀、财星承接、身有根气；忌枭神夺食、食神被合。',
  '伤官格':'成格常论伤官配印或伤官生财；忌伤官见官而无制、伤官太重日主虚耗。',
  '正印格':'成格常论印星有根、官星生印、日主得养；忌财星坏印、印重身滞。',
  '偏印格':'成格常论偏印化杀、食伤泄秀；忌枭印夺食、印重无泄。',
  '比肩':'建禄月劫本气为比劫，传统另立禄劫格，重在看财官食伤如何取用，不以"身旺"作结论。',
  '劫财':'建禄月劫本气为比劫，传统另立禄劫格，重在看财官食伤如何取用，不以"身旺"作结论。'};
 function geju(c){
  const month=c.details[1],dm=c.dayMaster,cands=[];
  const godsAt=[];
  c.details.forEach((p,i)=>{if(i!==2)godsAt.push({pos:POS[i],stem:p.stem,god:p.god});});
  month.hidden.forEach((h,k)=>{
    const tou=godsAt.filter(x=>x.stem===h.stem);
    cands.push({hidden:h,k,tou,name:GEJU_NAME[h.god]||h.god+'格',god:h.god,condition:GEJU_COND[h.god]||''});
  });
  const touChu=cands.filter(x=>x.tou.length);
  const primary=touChu.length?touChu[0]:cands[0];
  const main=cands[0];
  let basis;
  if(primary.k===0)basis=`月令${month.branch}本气为${main.hidden.stem}（${main.god}），按"本气优先"取${main.name}为第一候选。`;
  else basis=`月令${month.branch}本气${main.hidden.stem}（${main.god}）未透，而${['中气','余气'][primary.k-1]}${primary.hidden.stem}（${primary.god}）透于${primary.tou.map(x=>x.pos+'干').join('、')}，按"本气不透则取透出"取${primary.name}为第一候选。`;
  const others=cands.filter(x=>x!==primary&&x.tou.length&&x.k>0);
  return {primary,cands,basis,others,
   status:'未判成败',
   note:'本页只做"取格"这一步：按月令本气优先、本气不透取透出之中余气，列出候选与成格条件。成格／破格／救应涉及全局生克与调候，需逐条核对，不由程序自动认证。',
   yongshen:'用神须分扶抑、格局、调候三种语境分别讨论，可能指向不同五行；本页不输出唯一喜用神。'};
 }

 /* ---------- 十神能量（透明加权） ---------- */
 function tenGodEnergy(c){
  const w={year:{stem:1,main:1,mid:.5,rest:.3},month:{stem:1.2,main:1.4,mid:.7,rest:.4},day:{stem:0,main:1.2,mid:.6,rest:.35},hour:{stem:1,main:1,mid:.5,rest:.3}};
  const key=['year','month','day','hour'],map={};
  c.details.forEach((p,i)=>{
    if(i!==2){map[p.god]=(map[p.god]||0)+w[key[i]].stem;}
    p.hidden.forEach((h,k)=>{const val=k===0?w[key[i]].main:k===1?w[key[i]].mid:w[key[i]].rest;map[h.god]=(map[h.god]||0)+val;});
  });
  const arr=Object.entries(map).map(([god,val])=>({god,val:Math.round(val*100)/100})).sort((a,b)=>b.val-a.val);
  const max=Math.max(...arr.map(x=>x.val),1);
  return {list:arr,max,basis:'权重：月干1.2、月支本气1.4、日支本气1.2、时/年干1；中气减半、余气取三成。日干本身不计。此为本页自定口径，仅用于比较各十神在明面上的轻重。'};
 }

 /* ---------- 流月 ---------- */
 const MONTH_NAMES=['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
 function monthPillarsFor(year){
  const ys=stemIdx(Z.annual(year)[0]);
  const first=GAN[mod((ys%5)*2+2,10)];
  return Array.from({length:12},(_,i)=>({index:i,name:MONTH_NAMES[i],branch:ZHI[mod(2+i,12)],pillar:GAN[mod(stemIdx(first)+i,10)]+ZHI[mod(2+i,12)]}));
 }
 function monthLuck(year){
  const all=Z.termsAround(Date.UTC(year,5,1)).sort((a,b)=>a.utc-b.utc);
  const start=all.findIndex(t=>t.name==='立春'&&Number(t.utc8.slice(0,4))===year);
  if(start<0)throw Error('未找到'+year+'年立春，无法排流月。');
  const seq=all.slice(start,start+12);
  const mp=monthPillarsFor(year);
  return mp.map((m,i)=>{
    const t=seq[i]||null,n=seq[i+1]||null;
    return {...m,term:t?t.name:'',startUTC:t?t.utc:null,endUTC:n?n.utc:null,utc8:t?t.utc8:null};
  });
 }

 /* ---------- 四柱宫位 ---------- */
 const PALACE=[
  {scope:'祖辈与父母辈、家族根基、童年环境与远方',theme:'年柱为根，看家世背景与早年成长条件'},
  {scope:'父母兄弟、成长环境与事业起点',theme:'月柱为提纲，月令定格局，也主工作与环境'},
  {scope:'日干为自己，日支为配偶宫与共同生活',theme:'日柱为身，日支为夫妻宫，论婚姻先看此宫'},
  {scope:'子女、晚辈、晚年与后续发展',theme:'时柱为归宿，也看后半程与所成之事'}
 ];
 function palaces(c){
  return c.details.map((p,i)=>{
   const isDay=i===2;
   return {
    index:i,pos:['年柱','月柱','日柱','时柱'][i],scope:PALACE[i].scope,theme:PALACE[i].theme,
    pillar:p.text,
    stem:{char:p.stem,god:isDay?'日主':p.god,element:p.element},
    branch:{char:p.branch,element:p.hidden[0].element,main:p.hidden[0].stem+'·'+p.hidden[0].god,
      all:p.hidden.map(h=>h.stem+'·'+h.god).join('、'),nayin:p.nayin,void:p.void},
    note:isDay?`${p.stem}为日主本人；${p.branch}为夫妻宫，藏${p.hidden.map(h=>h.stem+h.god).join('、')}。`
      :`${p.stem}${p.god}透于本柱，${p.branch}藏${p.hidden.map(h=>h.stem+h.god).join('、')}。`
   };
  });
 }

 /* ---------- 岁运互动：伏吟、反吟、岁运并临 ---------- */
 const KE={'木':'土','土':'水','水':'火','火':'金','金':'木'};
 const C6=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
 const clash=(a,b)=>C6.some(x=>x===a+b||x===b+a);
 const ke=(a,b)=>KE[Z.element(a)]===Z.element(b)||KE[Z.element(b)]===Z.element(a);
 const POSN=['年柱','月柱','日柱','时柱'];
 function annualFlags(c,luckPillar,yearPillar){
  const out=[];
  if(luckPillar===yearPillar){
   out.push({type:'岁运并临',level:'高',tone:'watch',
    text:`大运与流年同为${yearPillar}，同气叠加，是「岁运并临」，属岁运层面的伏吟。古书对此说得极重，实际要看这一柱对原局是生扶还是克泄：被叠加的是所需之行，多为资源集中；是所忌之行，则同类压力也会集中。本页不预判吉凶。`});
  }
  c.pillars.forEach((p,i)=>{
   if(p===yearPillar)out.push({type:'流年伏吟'+POSN[i],level:'中',tone:'note',
     text:`流年${yearPillar}与${POSN[i]}完全相同（伏吟）。伏吟要求干支组合一致，不只是五行相同。落在${POSN[i]}，读的是「${PALACE[i].scope}」这一层：常见旧事重提、原地打转、同一种处境反复，不必然是灾，也不必然是喜。`});
   if(p===luckPillar&&luckPillar!==yearPillar)out.push({type:'大运伏吟'+POSN[i],level:'中',tone:'note',
     text:`大运${luckPillar}与${POSN[i]}完全相同。这十年会反复加强该宫位所主的事项（${PALACE[i].scope}），力度比单年伏吟更持久。`});
   if(ke(p[0],yearPillar[0])&&clash(p[1],yearPillar[1]))out.push({type:'反吟（天克地冲）'+POSN[i],level:'高',tone:'watch',
     text:`流年${yearPillar}与${POSN[i]}${p}天干相克、地支相冲，即「反吟」。反吟是撞不是叠，多对应突发性的换道：搬迁、跳槽、关系重组、计划被打断。落在${POSN[i]}，事象偏向「${PALACE[i].scope}」。冲开的是被压住的东西未必坏，冲散的是维持平衡的关键才要留意。`});
  });
  if(luckPillar!==yearPillar&&ke(luckPillar[0],yearPillar[0])&&clash(luckPillar[1],yearPillar[1]))
   out.push({type:'岁运反吟',level:'高',tone:'watch',text:`大运${luckPillar}与流年${yearPillar}天克地冲。岁运相战通常比单柱相冲更明显，读法是先看原局有无承接，再看这十年本在做什么事，最后才谈这一年的触发。`});
  return out;
 }

 /* ---------- 用神三法：调候 / 扶抑 / 通关 ---------- */
 const SEASON_CLIMATE={'亥':'寒','子':'寒','丑':'寒','巳':'暖','午':'暖','未':'暖','寅':'温','卯':'温','辰':'温','申':'凉','酉':'凉','戌':'凉'};
 const SEASON_TEXT={寒:'冬令（亥子丑月），水旺气寒，传统调候先看有无火来暖局；寒极虽身强亦需一点火。',
  暖:'夏令（巳午未月），火旺气燥，传统调候先看有无水来润局；燥极虽身强亦需一点水。',
  温:'春令（寅卯辰月），木旺而气升，传统多论泄秀或修剪，寒暖不是主要矛盾。',
  凉:'秋令（申酉戌月），金旺而气降，传统多论火炼或水泄，寒暖相对缓和。'};
 function threeMethods(c){
  const mb=c.pillars[1][1],climate=SEASON_CLIMATE[mb]||'温';
  const e=X=>X;
  const emap={};Z.ELEMENTS.forEach(k=>emap[k]=0);
  c.details.forEach(p=>{emap[p.element]++;emap[p.hidden[0].element]++;});
  const fire=emap['火'],water=emap['水'],earth=emap['土'];
  let tiao;
  if(climate==='寒')tiao=fire>=2?`局中水寒，但已见${fire}处火，暖意尚存；再加水金则寒凝，见木火可转温。`:`局中水寒而火仅${fire}处，传统调候以见丙丁巳午为暖局之需。寒局先求暖，再谈扶抑。`;
  else if(climate==='暖')tiao=water>=2?`局中火燥，但已见${water}处水，润意尚存；再添木火则燥烈。`:`局中火燥而水仅${water}处，传统调候以见壬癸亥子为润局之需。燥局先求润，再谈扶抑。`;
  else if(climate==='温')tiao=`春木当令，气升而未定，传统多从「泄秀」或「修剪」两路取用，视局中金火孰能为用。`;
  else tiao=`秋金当令，气降而肃，传统多从「火炼」或「水泄」两路取用，视局中火水孰能为用。`;
  if(earth>=4)tiao+=' 局中土厚，另须留意土多埋金、土重木折之类的壅滞。';
  // 通关
  const groups={peer:['比肩','劫财'],output:['食神','伤官'],wealth:['偏财','正财'],power:['七杀','正官'],resource:['偏印','正印']};
  const name={peer:'比劫',output:'食伤',wealth:'财星',power:'官杀',resource:'印星'};
  const energy=tenGodEnergy(c).list;const byGroup={};
  energy.forEach(x=>{for(const k in groups)if(groups[k].includes(x.god))byGroup[k]=(byGroup[k]||0)+x.val;});
  const T=[['power','peer','resource','官杀与比劫相持，传统以印星通关：官杀生印、印生比劫，把克转成生。'],
           ['peer','wealth','output','比劫与财相争，传统以食伤通关：比劫生食伤、食伤生财，把争夺转成输出再转化。'],
           ['wealth','resource','power','财与印相碍，传统以官杀通关：财生官杀、官杀生印，中间接上一环。'],
           ['output','power','wealth','食伤与官杀相战，传统以财星通关：食伤生财、财生官杀。'],
           ['resource','output','peer','印与食伤相碍（枭印夺食之象），传统以比劫通关：印生比劫、比劫生食伤。']];
  const tong=[];
  T.forEach(([a,b,mid,text])=>{
   const va=byGroup[a]||0,vb=byGroup[b]||0;
   if(Math.min(va,vb)<1.6)return;
   const midVal=energy.filter(x=>groups[mid].includes(x.god)).reduce((n,x)=>n+x.val,0);
   tong.push({pair:name[a]+' ↔ '+name[b],mid:name[mid],text,midVal:Math.round(midVal*100)/100,
     status:midVal>=1.2?'局中已有通关之星':'局中通关之星偏弱或缺',
     va:Math.round(va*100)/100,vb:Math.round(vb*100)/100});
  });
  tong.sort((x,y)=>Math.min(y.va,y.vb)-Math.min(x.va,x.vb));
  const top2=tong.slice(0,2);
  return {climate,seasonText:SEASON_TEXT[climate],tiaohou:tiao,fire,water,earth,tongguan:top2,
   strength:{total:strengthScore(c).total,grade:strengthScore(c).grade},
   note:'取用的传统次序是先看调候是否急需，再看扶抑定强弱，最后看有无两行相战可用通关。三法可能指向不同五行，本页只给方向与条件，不输出唯一喜用神。',
   limits:['调候部分按「寒暖燥湿」原则判断，不是《穷通宝鉴》逐条调候表的照录；逐条表各家版本互有出入。','通关只按十神两强相持做检出，是否真需通关还要看月令、根气与合冲是否已经化解。','任何「喜某行」的结论都须回到原局逐字核对，不能据此直接改职业、方位或投资。']};
 }

 return {shensha,shenshaSummary,SS_RULES,taiYuan,strengthScore,geju,GEJU_NAME,tenGodEnergy,monthLuck,monthPillarsFor,SEASON_WEIGHT,palaces,PALACE,annualFlags,threeMethods,SEASON_CLIMATE};
});
