(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/lunar.js'));
  else root.Ziping=factory(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(lib){
  'use strict';
  const {Solar,Lunar,LunarUtil}=lib;
  const GAN='甲乙丙丁戊己庚辛壬癸',ZHI='子丑寅卯辰巳午未申酉戌亥',ELEMENTS=['木','火','土','金','水'];
  const HIDDEN=['癸','己癸辛','甲丙戊','乙','戊乙癸','丙庚戊','丁己','己丁乙','庚壬戊','辛','戊辛丁','壬甲'];
  const JIE=['小寒','立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪'];
  const mod=(a,n)=>((a%n)+n)%n;
  const element=g=>ELEMENTS[Math.floor(GAN.indexOf(g)/2)];
  const polar=g=>GAN.indexOf(g)%2?'阴':'阳';
  const god=(d,t)=>['比肩,劫财','食神,伤官','偏财,正财','七杀,正官','偏印,正印'][mod(Math.floor(GAN.indexOf(t)/2)-Math.floor(GAN.indexOf(d)/2),5)].split(',')[Number(GAN.indexOf(d)%2!==GAN.indexOf(t)%2)];
  const parts=s=>{const a=String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);if(!a)throw Error('请填写完整的年月日和时间。');return a.slice(1).map(v=>Number(v||0));};
  function validDate(a){const [y,m,d,h=0,mi=0,se=0]=a;const q=new Date(Date.UTC(y,m-1,d,h,mi,se));return y>=1901&&y<=2099&&q.getUTCFullYear()===y&&q.getUTCMonth()+1===m&&q.getUTCDate()===d&&h>=0&&h<24&&mi>=0&&mi<60&&se>=0&&se<60;}
  const wallStamp=a=>Date.UTC(a[0],a[1]-1,a[2],a[3]||0,a[4]||0,a[5]||0);
  const arrAt=t=>{const d=new Date(t);return [d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds()];};
  const pad=n=>String(n).padStart(2,'0');
  const formatWall=t=>{const a=arrAt(t);return `${a[0]}-${pad(a[1])}-${pad(a[2])} ${pad(a[3])}:${pad(a[4])}:${pad(a[5])}`;};
  const fmtCache=new Map();
  function zonedParts(t,zone){
    if(!fmtCache.has(zone))fmtCache.set(zone,new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
    const p=Object.fromEntries(fmtCache.get(zone).formatToParts(new Date(t)).map(p=>[p.type,p.value]));
    return [p.year,p.month,p.day,p.hour,p.minute,p.second].map(Number);
  }
  function offsetAt(t,zone){return (wallStamp(zonedParts(t,zone))-Math.floor(t/1000)*1000)/60000;}
  function resolveLocal(a,zone){
    const target=wallStamp(a),offsets=new Set();
    for(let h=-48;h<=48;h+=6)offsets.add(offsetAt(target+h*3600000,zone));
    return [...offsets].map(o=>target-o*60000).filter(t=>zonedParts(t,zone).every((x,i)=>x===a[i])).sort((a,b)=>a-b);
  }
  function eot(t){ // NOAA/Meeus: apparent solar time minus mean solar time, minutes.
    const c=(t/86400000+2440587.5-2451545)/36525,rad=Math.PI/180;
    const l=mod(280.46646+c*(36000.76983+0.0003032*c),360)*rad;
    const m=(357.52911+c*(35999.05029-0.0001537*c))*rad;
    const e=0.016708634-c*(0.000042037+0.0000001267*c);
    const eps=(23+(26+(21.448-c*(46.815+c*(0.00059-c*0.001813)))/60)/60+0.00256*Math.cos((125.04-1934.136*c)*rad))*rad;
    const y=Math.tan(eps/2)**2;
    return (y*Math.sin(2*l)-2*e*Math.sin(m)+4*e*y*Math.sin(m)*Math.cos(2*l)-0.5*y*y*Math.sin(4*l)-1.25*e*e*Math.sin(2*m))/rad*4;
  }
  const solarAt=t=>Solar.fromYmdHms(...arrAt(t));
  const solarStamp=s=>Date.UTC(s.getYear(),s.getMonth()-1,s.getDay(),s.getHour(),s.getMinute(),s.getSecond());
  const termsCache=new Map();
  function termsAround(t){
    const y=new Date(t).getUTCFullYear();if(termsCache.has(y))return termsCache.get(y);
    const terms=new Map();
    for(let yr=y-1;yr<=y+1;yr++){
      const l=Solar.fromYmd(yr,6,1).getLunar(),table=l.getJieQiTable();
      Object.entries(table).forEach(([name,s])=>{if(JIE.includes(name)){const utc=solarStamp(s)-8*3600000;terms.set(utc,{name,utc,utc8:s.toYmdHms()});}});
    }
    const out=[...terms.values()].sort((a,b)=>a.utc-b.utc);termsCache.set(y,out);return out;
  }
  function pillarDetail(p,day){
    if(!p)return null;
    const hidden=[...HIDDEN[ZHI.indexOf(p[1])]].map(g=>({stem:g,element:element(g),god:god(day,g)}));
    return {text:p,stem:p[0],branch:p[1],element:element(p[0]),god:god(day,p[0]),hidden,nayin:LunarUtil.NAYIN[p],void:LunarUtil.getXunKong(p)};
  }
  function calendarDate(input){
    if(!input.unknownTime&&!/^\d{2}:\d{2}(:\d{2})?$/.test(input.time||''))throw Error('请填写出生时间；不清楚时请勾选“出生时刻不详”。');
    const raw=parts(input.date+' '+(input.unknownTime?'00:00':input.time));
    if(input.calendar==='lunar'){
      const [y,m,d,h,mi,s]=raw;if(y<1901||y>2099||m<1||m>12||d<1||d>30)throw Error('农历日期超出支持范围。');
      let l;try{l=Lunar.fromYmdHms(y,input.leap?-m:m,d,h,mi,s);}catch{throw Error('该农历日期或闰月不存在，请核对。');}
      const a=arrAt(solarStamp(l.getSolar()));
      const back=solarAt(wallStamp(a)).getLunar();
      if(back.getYear()!==y||back.getMonth()!==(input.leap?-m:m)||back.getDay()!==d)throw Error('农历日期无效。');
      if(!validDate(a))throw Error('转换后的公历日期须在1901—2099年。');return a;
    }
    if(!validDate(raw))throw Error('公历日期无效，请检查月份天数；支持1901—2099年。');return raw;
  }
  function factsAt(input,a,utc){
    const mode=input.clock||'civil',lon=Number(input.longitude),corr=mode==='true'?eot(utc):0;
    const clock=mode==='civil'?wallStamp(zonedParts(utc,input.timezone)):utc+lon*240000+corr*60000;
    const dayEC=solarAt(clock).getLunar().getEightChar();dayEC.setSect(Number(input.dayBoundary)===23?1:2);
    const bj=solarAt(utc+8*3600000).getLunar(),bjEC=bj.getEightChar();
    let day=dayEC.getDay(),time=dayEC.getTime();
    if(arrAt(clock)[3]===23&&Number(input.dayBoundary)!==23&&input.ziStem==='same'){
      time=GAN[mod(GAN.indexOf(day[0])*2,10)]+'子';
    }
    const ps=[bjEC.getYear(),bjEC.getMonth(),day,time];
    return {pillars:ps,day,clock,correction:corr,lunar:`${bj.getYearInChinese()}年 ${bj.getMonthInChinese()}月${bj.getDayInChinese()}`,lunarNumeric:[bj.getYear(),bj.getMonth(),bj.getDay()],details:ps.map(p=>pillarDetail(p,day[0]))};
  }
  function addWall(t,years,months,days,hours){
    const d=new Date(t),orig=d.getUTCDate();d.setUTCDate(1);d.setUTCFullYear(d.getUTCFullYear()+years);d.setUTCMonth(d.getUTCMonth()+months);
    const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(orig,end));
    d.setUTCDate(d.getUTCDate()+days);d.setUTCHours(d.getUTCHours()+hours);return +d;
  }
  function luck(input,utc,f){
    const yang=GAN.indexOf(f.pillars[0][0])%2===0,forward=yang===(input.gender==='male');
    const terms=termsAround(utc),term=forward?terms.find(t=>t.utc>utc):[...terms].reverse().find(t=>t.utc<=utc);
    // Same declared truncation as lunar 1.7.8 sect=2: discard each timestamp's seconds.
    let minutes=Math.abs(Math.floor(term.utc/60000)-Math.floor(utc/60000));const gapMinutes=minutes;
    const years=Math.floor(minutes/4320);minutes%=4320;const months=Math.floor(minutes/360);minutes%=360;
    const days=Math.floor(minutes/12),hours=(minutes%12)*2;
    // Calendar add in the library's fixed UTC+8 reference; local display converted afterwards.
    const start=addWall(utc+8*3600000,years,months,days,hours)-8*3600000;
    const m=LunarUtil.JIA_ZI.indexOf(f.pillars[1]);
    const rows=Array.from({length:9},(_,i)=>{
      const startUTC=addWall(start+8*3600000,i*10,0,0,0)-8*3600000;
      const endUTC=addWall(start+8*3600000,(i+1)*10,0,0,0)-8*3600000;
      const p=LunarUtil.JIA_ZI[mod(m+(forward?1:-1)*(i+1),60)];
      return {index:i,pillar:p,startUTC,endUTC,year:Number(zonedParts(startUTC,input.timezone)[0]),age:years+i*10,detail:pillarDetail(p,f.day[0])};
    });
    return {forward,term,gapMinutes,years,months,days,hours,startUTC:start,rows,algorithm:'三天折一年，分钟截断；4320分→年、360分→月、12分→日、1分→2小时；交运历日按UTC+8参考加年月日时，再转出生地时间。'};
  }
  function relations(ps){
    const out=[],labels=['年','月','日','时'];
    const stemPairs=['甲己','乙庚','丙辛','丁壬','戊癸'];
    const combine=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
    const clashes=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
    const harms=['子未','丑午','寅巳','卯辰','申亥','酉戌'];
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      if(!ps[i]||!ps[j])continue;
      for(const [pairs,pos,type]of [[stemPairs,0,'天干五合'],[combine,1,'地支六合'],[clashes,1,'地支六冲'],[harms,1,'地支六害']]){
        if(pairs.some(p=>p===ps[i][pos]+ps[j][pos]||p===ps[j][pos]+ps[i][pos]))out.push({type,pair:ps[i][pos]+ps[j][pos],positions:labels[i]+labels[j],note:type.includes('合')?'仅记录相合关系；未判合化。':'仅记录结构关系；不等同于具体事件。'});
      }
    }
    for(const [group,name]of [['申子辰','三合水局'],['亥卯未','三合木局'],['寅午戌','三合火局'],['巳酉丑','三合金局'],['寅卯辰','三会木方'],['巳午未','三会火方'],['申酉戌','三会金方'],['亥子丑','三会水方']]){
      if([...group].every(z=>ps.some(p=>p&&p[1]===z)))out.push({type:'三支齐见',pair:group,positions:name,note:'齐见不等于成化；仍需月令、透干及破坏条件。'});
    }
    const bs=ps.filter(Boolean).map(p=>p[1]);
    for(const [group,name]of [['寅巳申','寅巳申三刑'],['丑戌未','丑戌未三刑'],['子卯','子卯相刑']])if([...group].every(z=>bs.includes(z)))out.push({type:'相刑',pair:group,positions:name,note:'采用齐见记录口径；寅巳申、丑戌未两支相见的争议不自动判刑。'});
    for(const z of '辰午酉亥')if(bs.filter(x=>x===z).length>=2)out.push({type:'自刑候选',pair:z+z,positions:'同支重复',note:'自刑的成立条件有流派分歧，保留为候选。'});
    return out;
  }
  function calculate(input){
    input={timezone:'Asia/Shanghai',clock:'civil',gender:'male',dayBoundary:0,ziStem:'next',...input};
    if(!['civil','mean','true'].includes(input.clock))throw Error('未知时间口径。');
    if(!['male','female'].includes(input.gender))throw Error('请选择用于传统顺逆规则的参数。');
    try{zonedParts(Date.now(),input.timezone);}catch{throw Error('IANA时区无效，请选择列表中的时区或填写有效名称。');}
    if(input.clock!=='civil'&&(input.longitude===''||input.longitude==null||!Number.isFinite(Number(input.longitude))||Math.abs(Number(input.longitude))>180))throw Error('平太阳时和真太阳时需要有效经度，东经为正、西经为负。');
    const a=calendarDate(input);
    if(input.unknownTime){
      // Enumerate the whole local date. Include exact jie instants as additional candidates.
      const candidates=[],seen=new Set();const add=t=>{const local=zonedParts(t,input.timezone);if(local.slice(0,3).join()!==a.slice(0,3).join())return;const f=factsAt(input,local,t);const k=f.pillars.join();if(!seen.has(k)){seen.add(k);candidates.push({utc:t,pillars:f.pillars});}};
      for(let m=0;m<1440;m+=10){const aa=[...a.slice(0,3),Math.floor(m/60),m%60,0];resolveLocal(aa,input.timezone).forEach(add);}
      termsAround(wallStamp(a)).forEach(q=>[-1000,0,1000].forEach(delta=>add(q.utc+delta)));
      if(!candidates.length)throw Error('该本地日期没有可用时间，请检查历史时区记录。');
      const stable=[0,1,2].map(i=>{const values=[...new Set(candidates.map(c=>c.pillars[i]))];return values.length===1?values[0]:null;});
      return {input,unknownTime:true,partial:stable,candidates,warnings:['出生时刻未知，展示候选结构，不生成唯一时柱、唯一详批或准确交运时间。','候选按10分钟采样并补入节令边界；太阳时日界附近仍需原始时间记录。'],engine:'lunar-javascript 1.7.8 + ziping 0.1.0'};
    }
    const options=resolveLocal(a,input.timezone);
    if(!options.length)throw Error('这个本地时间因夏令时前拨而不存在，请核对原始出生记录。');
    if(options.length>1&&!['earlier','later'].includes(input.ambiguity)){
      const e=Error('这个本地时间在回拨时出现两次，请在高级设置选择较早或较晚的时刻。');e.code='AMBIGUOUS_TIME';e.candidates=options.map(t=>new Date(t).toISOString());throw e;
    }
    const utc=options[input.ambiguity==='later'?options.length-1:0],f=factsAt(input,a,utc);
    const ts=termsAround(utc),before=[...ts].reverse().find(t=>t.utc<=utc),after=ts.find(t=>t.utc>utc),warnings=[];
    const uncertainty=Number(input.timeUncertainty||0);
    if(!Number.isFinite(uncertainty)||uncertainty<0||uncertainty>120)throw Error('出生时刻误差范围应在0—120分钟之间。');
    const timeAlternatives=[];
    if(uncertainty>0){
      const start=utc-uncertainty*60000,end=utc+uncertainty*60000,samples=new Set([start,end,utc]);
      for(let t=start;t<=end;t+=30000)samples.add(t);
      ts.forEach(term=>{if(term.utc>=start&&term.utc<=end)[-1000,0,1000].forEach(delta=>{if(term.utc+delta>=start&&term.utc+delta<=end)samples.add(term.utc+delta);});});
      const seen=new Set();[...samples].sort((a,b)=>a-b).forEach(t=>{const p=factsAt(input,a,t).pillars,k=p.join();if(!seen.has(k)){seen.add(k);timeAlternatives.push({utc:t,pillars:p});}});
      if(timeAlternatives.length>1)warnings.push(`出生读数前后${uncertainty}分钟范围跨过干支边界，以下盘表仅为原读数参考，需比较候选；不生成唯一详批。`);
    }
    const near=ts.find(t=>Math.abs(t.utc-utc)<=90000);
    if(near)warnings.push(`出生时间距${near.name}不足90秒，节令算法和记录精度可能影响年、月柱，请保留两种候选并人工核对。`);
    if(a[0]<1970)warnings.push('1970年前时区资料可能不完整，计算使用当前环境的IANA历史规则，仍需核实当地实际时间制度。');
    if(input.clock==='true'){
      warnings.push('真太阳时使用NOAA公开均时差近似式；日时边界两分钟内需复核，不承诺秒级精度。');
      const alt=[factsAt(input,a,utc-120000).pillars,factsAt(input,a,utc+120000).pillars];
      if(alt.some(p=>p[2]!==f.pillars[2]||p[3]!==f.pillars[3]))warnings.push('当前读数接近日界或时辰边界；请比较前后两分钟候选盘。');
    }
    const counts=Object.fromEntries(ELEMENTS.map(e=>[e,0]));
    f.details.forEach(p=>{counts[p.element]++;const main=p.hidden[0];counts[main.element]++;});
    const roots=f.details.map((p,i)=>({position:['年','月','日','时'][i],stems:p.hidden.filter(h=>h.element===element(f.day[0])).map(h=>h.stem)})).filter(r=>r.stems.length);
    const dg=GAN.indexOf(f.day[0]),life=f.details.map(p=>{
      const starts=[11,6,2,9,2,9,5,0,8,3];return ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'][mod((ZHI.indexOf(p.branch)-starts[dg])*(dg%2?-1:1),12)];
    });
    return {input,unknownTime:false,uncertain:timeAlternatives.length>1,timeAlternatives,utc,offsetMinutes:offsetAt(utc,input.timezone),civil:formatWall(wallStamp(a)),clock:formatWall(f.clock),correction:f.correction,
      lunar:f.lunar,lunarDateBasis:'同一瞬间的UTC+8农历读数',pillars:f.pillars,details:f.details,dayMaster:f.day[0],counts,roots,life,
      relations:relations(f.pillars),before,after,luck:luck(input,utc,f),warnings,engine:'lunar-javascript 1.7.8 + ziping 0.1.0',solarAlternatives:input.clock==='true'?[-120000,120000].map(delta=>({shiftMinutes:delta/60000,pillars:factsAt(input,a,utc+delta).pillars})):[],
      ziAlternative:arrAt(f.clock)[3]===23?factsAt({...input,dayBoundary:Number(input.dayBoundary)===23?0:23},a,utc).pillars:null};
  }
  function annual(year){if(!Number.isInteger(year)||year<1901||year>2199)throw Error('流年年份超出范围。');return GAN[mod(year-4,10)]+ZHI[mod(year-4,12)];}
  function seasonal(branch){return '寅卯辰'.includes(branch)?'春':'巳午未'.includes(branch)?'夏':'申酉戌'.includes(branch)?'秋':'冬';}
  return {calculate,resolveLocal,zonedParts,offsetAt,eot,god,element,polar,relations,annual,seasonal,termsAround,formatWall,wallStamp,calendarDate,GAN,ZHI,HIDDEN,ELEMENTS,JIE,mod};
});
