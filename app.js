/* All user input stays in this browser. No remote model calls. */
(()=>{
 'use strict';
 const Z=window.Ziping,C=window.ZIPING_CONTENT,P=window.ZipingPlaces,X=window.ZipingExtra,D=window.ZipingDeep,$=s=>document.querySelector(s);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeUrl=v=>/^https?:\/\//.test(v||'')?esc(v):'#';
 const cls=e=>({'木':'wood','火':'fire','土':'earth','金':'metal','水':'water'}[e]||'');
 const colors={'木':'#4a7c59','火':'#b94a3f','土':'#8a6236','金':'#b08d2e','水':'#3f6f96'};
 /* 干支两字分别按本字五行上色：干取天干五行，支取该支本气五行（与命盘地支行同口径） */
 const branchElement=b=>Z.element(Z.HIDDEN[Z.ZHI.indexOf(b)][0]);
 const pairHTML=(p,tag='')=>{const s=String(p||'');if(s.length<2)return `<span class="pillar-pair ${tag}"><i class="${cls(Z.element(s))}">${esc(s)}</i></span>`;
   return `<span class="pillar-pair ${tag}"><i class="${cls(Z.element(s[0]))}">${s[0]}</i><i class="${cls(Z.element(Z.HIDDEN[Z.ZHI.indexOf(s[1])][0]))}">${s[1]}</i></span>`;};
 const titles={chart:'八字排盘',analysis:'八字详批',ai:'AI 批盘',work:'批盘带练',learn:'子平学堂',tables:'干支速查',library:'古籍书斋',cases:'命例研读',saved:'我的命盘',about:'计算与依据'};
 const locations=[['北京','Asia/Shanghai',116.4074],['上海','Asia/Shanghai',121.4737],['杭州','Asia/Shanghai',120.1551],['广州','Asia/Shanghai',113.2644],['成都','Asia/Shanghai',104.0665],['西安','Asia/Shanghai',108.9398],['乌鲁木齐（北京时间）','Asia/Shanghai',87.6168],['香港','Asia/Hong_Kong',114.1694],['台北','Asia/Taipei',121.5654],['新加坡','Asia/Singapore',103.8198],['吉隆坡','Asia/Kuala_Lumpur',101.6869],['纽约','America/New_York',-74.006],['洛杉矶','America/Los_Angeles',-118.2437],['伦敦','Europe/London',-0.1276],['东京','Asia/Tokyo',139.6917],['檀香山','Pacific/Honolulu',-157.8583]];
 const demo={name:'研习示例',date:'2005-12-23',time:'08:37',calendar:'solar',leap:false,gender:'male',place:'浙江省杭州市',geoProv:'浙江省',geoCity:'杭州市',geoDist:'',placeOther:'',timezone:'Asia/Shanghai',longitude:120.1551,clock:'true',dayBoundary:0,ziStem:'next',ambiguity:'',unknownTime:false,demo:true};
 const storage={read(k,fallback){try{return JSON.parse(localStorage.getItem('ziping.'+k))??fallback;}catch{return fallback;}},write(k,v){try{localStorage.setItem('ziping.'+k,JSON.stringify(v));return true;}catch{toast('浏览器未允许保存；当前页面仍可使用。');return false;}}};
 const state={route:'chart',input:{...demo},draft:{...demo},chart:null,error:'',luckIndex:0,annualYear:null,lesson:'L01',completed:storage.read('completed',[]),notes:storage.read('notes',{}),saved:storage.read('saved',[]),steps:storage.read('steps',[]),work:storage.read('work',{}),workStep:0,libraryBook:'',libraryQ:'',libraryOffset:0,libraryResults:[],libraryTotal:0,serverLibrary:false,libraryLoading:false};
 Object.assign(state,{readerBook:'',readerAt:0,readerError:'',learnMode:'lesson',practiceId:'winter-m',practiceMode:'guided'});
 let toastTimer;
 function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2700);}
 function head(title,sub,eyebrow='ZIPING · STUDY',actions=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p></div><div class="heading-actions">${actions}</div></div>`;}
 const btn=(text,action,primary=false,extra='')=>`<button class="button ${primary?'primary':''}" data-action="${action}" ${extra}>${text}</button>`;
 const tag=(text,type='')=>`<span class="tag ${type}">${text}</span>`;
 const sourceButton=(id,label='查看原文依据')=>`<button class="source-link" data-source="${esc(id)}">${label} ↗</button>`;
 function field(label,control,small=''){return `<label class="field"><span class="field-label">${label}${small?`<small>${small}</small>`:''}</span>${control}</label>`;}
 const selected=(a,b)=>a===b?'selected':'';
 const checked=v=>v?'checked':'';
 const GEO=()=>window.ZipingGeo||{provinces:()=>[],cities:()=>[],districts:()=>[],entry:()=>null};
 function geoEntry(i){
   const name=[i.geoProv,i.geoCity,i.geoDist].filter(Boolean).join('');
   if(!i.geoProv)return null;
   const e=GEO().entry(i.geoProv,i.geoCity||'');
   if(!e)return null;
   const apx=e.a?1:0;
   return {found:true,name,geo:true,lon:e.x,lat:e.y,tz:'Asia/Shanghai',level:apx?3:(e.l||2),
     levelText:apx?'省直辖／近似坐标':'行政区划坐标',matchedBy:i.geoDist?`${i.geoProv} / ${i.geoCity} / ${i.geoDist}`:`${i.geoProv} / ${i.geoCity}`,coordsFrom:i.geoDist?`${i.geoCity}行政中心（区县共用市坐标，误差通常在 3 分钟内）`:`${i.geoCity}行政中心`};
 }
 function optionsHTML(list,cur,placeholder){
   return `<option value="">${esc(placeholder)}</option>`+list.map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('');
 }
 function geoHTML(i){
   const provs=GEO().provinces();
   const cities=i.geoProv?GEO().cities(i.geoProv):[];
   const dists=i.geoProv&&i.geoCity?GEO().districts(i.geoProv,i.geoCity):[];
   return `<div class="geo-grid">
     <label class="geo-cell"><span>省 / 自治区 / 直辖市</span><select name="geoProv" data-geo="prov" aria-label="省份">${optionsHTML(provs,i.geoProv,'请选择省份')}</select></label>
     <label class="geo-cell"><span>市 / 地区 / 州</span><select name="geoCity" data-geo="city" aria-label="城市"${i.geoProv?'':' disabled'}>${i.geoProv?optionsHTML(cities,i.geoCity,'请选择城市'):'<option value="">先选省份</option>'}</select></label>
     <label class="geo-cell"><span>区 / 县（可不选）</span><select name="geoDist" data-geo="dist" aria-label="区县"${i.geoCity?'':' disabled'}>${i.geoCity?optionsHTML(dists,i.geoDist,'不选区县（按市计算）'):'<option value="">先选城市</option>'}</select></label>
   </div>
   <input name="placeOther" aria-label="其他地点" class="geo-other" maxlength="60" value="${esc(i.placeOther||'')}" placeholder="海外或列表里没有？直接填地名，如「吉隆坡」" autocomplete="off">`;
 }
 function placeMatchHTML(i){
   const hit=String(i.placeOther||'').trim()?P.resolve(i.placeOther):(geoEntry(i)||P.resolve(i.place));
   if(!hit.found)return `<div class="place-hit miss"><b>未匹配到地名</b><span>换个写法试试（如「苏州」「乌鲁木齐」「吉隆坡」），或在下方高级设置里直接填出生地经度。真太阳时按经度换算，经度不对，时柱就会错。</span></div>`;
   const warn=hit.level>=3?`<em>仅识别到${hit.admin||'省级'}，用的是${hit.name}坐标，误差可能达半小时以上。建议补填区县级地名或精确经度。</em>`:'';
   const from=hit.coordsFrom?` · 坐标取自${esc(hit.coordsFrom)}`:'';
   return `<div class="place-hit ok"><b>已匹配：${esc(hit.name||hit.matchedBy)}</b><span>东经 ${hit.lon.toFixed(4)}° ／ 北纬 ${hit.lat.toFixed(4)}° · ${esc(hit.tz)} · ${esc(hit.levelText)}${hit.geo?from:` · ${esc(hit.matchedBy)}`}</span>${warn}</div>`;
 }
 function formHTML(){const i=state.draft;
   return `<div><section class="card input-card"><div class="card-head"><h2 class="card-title">出生信息</h2><span class="card-kicker">建立一张命盘</span></div><form id="birth-form" class="form-body" novalidate>
   ${state.error?`<div class="error-box" role="alert">${esc(state.error)}</div>`:''}
   ${field('命盘称呼',`<input name="name" aria-label="命盘称呼" value="${esc(i.name)}" maxlength="30" placeholder="为这张命盘取个名字">`,'可不填')}
   ${field('传统男女参数',`<div class="segmented"><button type="button" data-gender="male" class="${i.gender==='male'?'selected':''}" aria-pressed="${i.gender==='male'}">男 · 乾造</button><button type="button" data-gender="female" class="${i.gender==='female'?'selected':''}" aria-pressed="${i.gender==='female'}">女 · 坤造</button></div>`)}
   ${field('出生日期',`<div class="segmented" style="margin-bottom:9px"><button type="button" data-calendar="solar" class="${i.calendar==='solar'?'selected':''}" aria-pressed="${i.calendar==='solar'}">公历</button><button type="button" data-calendar="lunar" class="${i.calendar==='lunar'?'selected':''}" aria-pressed="${i.calendar==='lunar'}">农历</button></div><input name="date" aria-label="出生日期" type="${i.calendar==='lunar'?'text':'date'}" value="${esc(i.date)}" min="1901-01-01" max="2099-12-31" placeholder="YYYY-MM-DD" required>${i.calendar==='lunar'?`<span class="check-label"><input type="checkbox" name="leap" ${checked(i.leap)}>该月为闰月</span>`:''}`)}
   ${field('出生时间',`<input name="time" aria-label="出生时间" type="time" step="60" value="${esc(i.time)}" ${i.unknownTime?'disabled':''}><span class="check-label"><input type="checkbox" name="unknownTime" ${checked(i.unknownTime)}>出生时刻不详，保留候选盘</span>`,'记录到分钟')}
   <div class="field"><span class="field-label">出生地点<small>省 → 市 → 区县，自动取经度</small></span><div id="geo-wrap">${geoHTML(i)}</div><div id="place-hit-box">${placeMatchHTML(i)}</div><input type="hidden" name="place" value="${esc(i.place)}"></div>
   ${field('排盘时间口径',`<div class="segmented"><button type="button" data-clock="true" class="${i.clock==='true'?'selected':''}" aria-pressed="${i.clock==='true'}">真太阳时</button><button type="button" data-clock="mean" class="${i.clock==='mean'?'selected':''}" aria-pressed="${i.clock==='mean'}">平太阳时</button><button type="button" data-clock="civil" class="${i.clock==='civil'?'selected':''}" aria-pressed="${i.clock==='civil'}">钟表时</button></div><p class="micro-note">真太阳时＝钟表时＋（出生地经度−时区标准经线）×4分钟＋均时差。子平以太阳实际位置定时辰，默认启用；想对照原钟表读数时可切到「钟表时」。</p>`)}
   <details class="advanced" ${state.error?'open':''}><summary>高级设置与计算约定</summary>
   ${field('IANA 时区',`<input name="timezone" aria-label="IANA时区" value="${esc(i.timezone)}" list="zones"><datalist id="zones">${[...new Set([...locations.map(p=>p[1]),...P.list.map(p=>p.tz)])].map(z=>`<option value="${z}">`).join('')}</datalist>`,'由地点自动带入，可改')}
   ${field('出生地经度',`<input name="longitude" aria-label="出生地经度" type="number" min="-180" max="180" step="0.0001" value="${esc(i.longitude)}">`,'东正西负')}
   ${field('出生时刻误差范围',`<select name="timeUncertainty" aria-label="出生时刻误差范围">${[0,1,5,15,30,60,120].map(n=>`<option value="${n}" ${selected(Number(i.timeUncertainty||0),n)}>${n===0?'按填写读数起盘':`前后约${n}分钟，检查候选`}</option>`).join('')}</select>`)}
   ${field('日柱换日',`<select name="dayBoundary" aria-label="日柱换日"><option value="0" ${selected(Number(i.dayBoundary),0)}>00:00 子正换日</option><option value="23" ${selected(Number(i.dayBoundary),23)}>23:00 子初换日</option></select>`)}
   ${field('晚子时（23时段）起时干',`<select name="ziStem" aria-label="晚子时起时干" ${Number(i.dayBoundary)===23?'disabled':''}><option value="next" ${selected(i.ziStem,'next')}>午夜换日时，按次日日干起</option><option value="same" ${selected(i.ziStem,'same')}>午夜换日时，按当日日干起</option></select>`)}
   ${field('回拨重复时间',`<select name="ambiguity" aria-label="回拨重复时间"><option value="">遇到重复时要求明确选择</option><option value="earlier" ${selected(i.ambiguity,'earlier')}>选择较早的UTC瞬间</option><option value="later" ${selected(i.ambiguity,'later')}>选择较晚的UTC瞬间</option></select>`)}
   <p class="micro-note">年柱以立春、月柱以十二节切换。地点经度为城市近似值，可改为准确经度。历史时区仍需结合当地记录复核。</p></details>
   <div class="submit-area"><button type="submit" class="button primary submit-wide">起盘研习 <span>→</span></button><p class="fineprint" id="form-hint">资料仅在本机计算，不会发送至外部服务</p></div></form></section>
   <div class="note-card"><strong>起盘之前，先核时间</strong>出生地时区、换日口径及太阳时修正都可能改变命盘。遇到边界，先比较候选结果，再进入解释。</div></div>`;
 }
 function getForm(){
   const f=$('#birth-form');if(!f)return {...state.draft};
   const v=new FormData(f);
   const geoProv=String(v.get('geoProv')||'').trim(),geoCity=String(v.get('geoCity')||'').trim(),geoDist=String(v.get('geoDist')||'').trim();
   const placeOther=String(v.get('placeOther')||'').trim();
   const place=placeOther||[geoProv,geoCity,geoDist].filter(Boolean).join('');
   const geoDraft={...state.draft,geoProv,geoCity,geoDist,placeOther,place};
   const hit=placeOther?P.resolve(placeOther):(geoEntry(geoDraft)||P.resolve(place));
   let timezone=String(v.get('timezone')||'').trim();
   let longitude=v.get('longitude');
   const changed=place!==String(state.draft.place||'');
   const geoChanged=geoProv!==String(state.draft.geoProv||'')||geoCity!==String(state.draft.geoCity||'')||geoDist!==String(state.draft.geoDist||'')||placeOther!==String(state.draft.placeOther||'');
   // 三级选择是经度的权威来源：选了省市就以行政区坐标为��，不再看隐藏字段里的旧值
   if(hit.found&&(hit.geo||changed||geoChanged||longitude===''||longitude==null)){timezone=hit.tz;longitude=hit.lon;}
   return {...state.draft,name:String(v.get('name')||'未命名命盘').trim(),date:String(v.get('date')||''),time:String(v.get('time')||''),leap:v.has('leap'),unknownTime:v.has('unknownTime'),place,geoProv,geoCity,geoDist,placeOther,placeHit:hit,clock:String(state.draft.clock||'true'),timezone,longitude,dayBoundary:Number(v.get('dayBoundary')),ziStem:String(v.get('ziStem')||'next'),timeUncertainty:Number(v.get('timeUncertainty')||0),ambiguity:String(v.get('ambiguity')||'')};
 }
 function calc(input){try{if(!String(input.place||'').trim())throw Error('请填写出生地点：真太阳时要用它换算出生地经度。');state.chart=Z.calculate(input);state.input={...input};state.error='';state.luckIndex=0;state.annualYear=null;return true;}catch(e){state.error=e.message;return false;}}
 const TERMS={
   '主星':'本柱天干相对日主的十神。日柱天干是日主本人，不另标十神。',
   '天干':'露在上面的字，主外在、公开、易被看见的一面。',
   '地支':'藏在下面的字，主内在、处境与实际承载；地支本身按其本气参与十神换算。',
   '藏干':'地支内部所藏的天干，分本气、中气、余气。判旺衰看根，主要看这里。',
   '副星':'藏干相对日主换算出的十神，标在藏干下方，用来判断地支里藏着什么关系。',
   '星运':'日主在本柱地支的十二长生状态，看的是「我在这里有没有气」。',
   '自坐':'本柱天干坐自己地支的十二长生，看这一柱自身根基厚薄，与日主无关。',
   '神煞':'按本页 18 组神煞表检索到的标记，只作线索，不单独断事。',
   '星运':'日主在本柱地支上的十二长生状态（长生、沐浴……养），描述气势强弱，不等同吉凶。',
   '空亡':'旬空。由所在旬推得的两个空位，传统视为该支力量减弱，但不作事件断言。',
   '纳音':'六十甲子两两相配的纳音五行，多用于合婚、择日与辅助描述，与正五行并行。',
   '神煞':'按特定口诀标出的辅助符号，吉凶随查法与全局而定，不能单独断事。'
 };
 function checklistHTML(c){
   const steps=[
    ['期','定时间口径','核对出生记录、时区、真太阳时与换日口径','L02'],
    ['节','定年柱月柱','立春换年、十二节换月，确认出生在哪个节之后','L05'],
    ['日','排日柱时柱','确认子时归属与晚子时起干口径','L10'],
    ['神','标十神与藏干','干支各自对日主取十神，藏干分本气中气余气','L12'],
    ['旺','判旺衰','得令、得地、得势三栏分别写，再看克泄耗','L14'],
    ['格','取格局与用神','本气优先取格，再用调候→扶抑→通关分栏','L15'],
    ['运','接大运流年','先把起运落到公历年份，再逐年看触发','L22']
   ];
   const done=(state.steps||[]).map(String);
   return `<section class="card checklist-card" id="checklist"><div class="card-head"><h2 class="card-title">排盘七步自检</h2><span class="card-kicker">已核 ${done.length} / ${steps.length} 步</span></div>
   <p class="micro-note">拿一张陌生的盘，能按要求走完这七步并说清每一步依据，基础就算通了。顺序不能跳：不知道用神方向，就无法判断某个流年是帮还是耗。</p>
   <div class="checklist">${steps.map(([mark,title,desc,lesson],i)=>{const on=done.includes(String(i));return `<div class="check-row"><button type="button" class="check-step ${on?'done':''}" data-step="${i}" aria-pressed="${on}"><span class="check-mark">${on?'✓':mark}</span><span class="check-body"><b>${i+1}. ${esc(title)}</b><em>${esc(desc)}</em></span></button><a class="check-link" href="#learn/${lesson}">${lesson}</a></div>`;}).join('')}</div>
   <p class="micro-note">勾选只存在本机，用来提醒哪几步还没核；点右侧编号可跳到对应课程。<a href="#learn/L01">→ L01 先区分五种“正确”</a></p></section>`;
 }
 function chartTable(c){
   const labels=['年柱','月柱','日柱','时柱'],th=k=>`<td class="term" title="${esc(TERMS[k]||'')}">${k}</td>`;
   const ss=X.shensha(c),pos=['年','月','日','时'];
   const ssAt=pos.map((p,i)=>ss.filter(r=>r.found.some(f=>f.pos===p+'干'||f.pos===p+'支')).map(r=>r.name));
   return `<table class="chart-table" aria-label="四柱命盘"><thead><tr><th>四柱</th>${labels.map((x,i)=>`<th class="${i===2?'day-col':''}">${x}</th>`).join('')}</tr></thead><tbody>
   <tr class="gods">${th('主星')}${c.details.map((p,i)=>`<td class="${i===2?'day-col':''}">${i===2?'日主 · '+(c.input.gender==='male'?'乾':'坤'):p.god}</td>`).join('')}</tr>
   <tr class="stems">${th('天干')}${c.details.map((p,i)=>`<td class="${cls(p.element)} ${i===2?'day-col':''}">${p.stem}</td>`).join('')}</tr>
   <tr class="branches">${th('地支')}${c.details.map((p,i)=>`<td class="${cls(p.hidden[0].element)} ${i===2?'day-col':''}">${p.branch}</td>`).join('')}</tr>
   <tr>${th('藏干')}${c.details.map((p,i)=>`<td class="${i===2?'day-col':''}">${p.hidden.map((h,k)=>`<span class="hidden-stem ${cls(h.element)}" title="${esc(['本气','中气','余气'][k]||'余气')}">${h.stem}<small>${['本','中','余'][k]||'余'}</small></span>`).join('')}</td>`).join('')}</tr>
   <tr>${th('副星')}${c.details.map((p,i)=>`<td class="${i===2?'day-col':''}"><span class="sub-gods">${p.hidden.map(h=>`<em>${h.god}</em>`).join('')}</span></td>`).join('')}</tr>
   <tr>${th('星运')}${c.life.map((s,i)=>`<td class="${i===2?'day-col':''}">${s}</td>`).join('')}</tr>
   <tr>${th('自坐')}${c.details.map((p,i)=>`<td class="${i===2?'day-col':''}">${Z.lifeOf(p.stem,p.branch)}</td>`).join('')}</tr>
   <tr>${th('空亡')}${c.details.map((p,i)=>`<td class="${i===2?'day-col':''}">${p.void}</td>`).join('')}</tr>
   <tr>${th('纳音')}${c.details.map((p,i)=>`<td class="${i===2?'day-col':''}">${p.nayin}</td>`).join('')}</tr>
   <tr>${th('神煞')}${ssAt.map((list,i)=>`<td class="${i===2?'day-col':''}"><span class="ss-inline">${list.length?list.map(n=>`<em>${esc(n)}</em>`).join(''):'—'}</span></td>`).join('')}</tr>
   </tbody></table>`;
 }
 function chartViewTabs(){
   return `<div class="chart-view-tabs" role="tablist"><button type="button" role="tab" data-chart-view="basic" class="${state.chartView!=='pro'?'on':''}" aria-selected="${state.chartView!=='pro'}">基本排盘</button><button type="button" role="tab" data-chart-view="pro" class="${state.chartView==='pro'?'on':''}" aria-selected="${state.chartView==='pro'}">专业细盘</button><span class="cvt-hint">${state.chartView==='pro'?'六柱并列：流年、大运与原局四柱':'四柱、藏干、副星、星运、自坐、空亡、纳音、神煞'}</span></div>`;
 }
 const SIXTY=Array.from({length:60},(_,i)=>Z.GAN[i%10]+Z.ZHI[i%12]);
 const NAYIN=['海中金','炉中火','大林木','路旁土','剑锋金','山头火','涧下水','城头土','白蜡金','杨柳木','泉中水','屋上土','霹雳火','松柏木','长流水','沙中金','山下火','平地木','壁上土','金箔金','覆灯火','天河水','大驿土','钗钏金','桑柘木','大溪水','沙中土','天上火','石榴木','大海水'];
 function nayinOf(p){const i=SIXTY.indexOf(p);return i<0?'—':NAYIN[Math.floor(i/2)];}
 function voidOf(p){const i=SIXTY.indexOf(p);if(i<0)return '—';const k=Math.floor(i/10)*10;return SIXTY[(k+10)%60][1]+SIXTY[(k+11)%60][1];}
 function proCols(c){
   const li=Math.min(state.luckIndex||0,c.luck.rows.length-1), row=c.luck.rows[li];
   const year=Number(state.annualYear)||new Date().getFullYear();
   const yr=Z.annual(year);
   return {row,li,year,cols:[
     {label:'流年',pillar:yr,kind:'moving'},
     {label:'大运',pillar:row.pillar,kind:'moving'},
     ...c.pillars.map((p,i)=>({label:['年柱','月柱','日柱','时柱'][i],pillar:p,kind:'natal',i})),
   ]};
 }
 function chartTablePro(c){
   const {row,li,year,cols}=proCols(c);
   const cell=(col,content,extra='')=>`<td class="${extra}${col.i===2?' day-col':''}">${content}</td>`;
   const th=k=>`<td class="term">${k}</td>`;
   const ss=X.shensha(c),pos=['年','月','日','时'];
   const ssAt=pos.map((p,i)=>ss.filter(r=>r.found.some(f=>f.pos===p+'干'||f.pos===p+'支')).map(r=>r.name));
   return `<div class="pro-head"><span>第${li+1}步大运 ${row.pillar}（${row.year}起）</span><span>${year} 年 ${Z.annual(year)}</span><span>流月按节气，流年按立春</span></div>
   <div class="pro-wrap"><table class="chart-table pro-table" aria-label="专业细盘"><thead><tr><th>项目</th>${cols.map(col=>`<th class="${col.kind==='moving'?'pro-moving':''}${col.i===2?' day-col':''}">${col.label}</th>`).join('')}</tr></thead><tbody>
   <tr>${th('主星')}${cols.map(col=>cell(col,col.kind==='natal'&&col.i===2?'元'+(c.input.gender==='male'?'男':'女'):esc(Z.god(c.dayMaster,col.pillar[0])))).join('')}</tr>
   <tr class="stems">${th('天干')}${cols.map(col=>cell(col,`<span class="${cls(Z.element(col.pillar[0]))}">${col.pillar[0]}</span>`)).join('')}</tr>
   <tr class="branches">${th('地支')}${cols.map(col=>cell(col,`<span class="${cls(branchElement(col.pillar[1]))}">${col.pillar[1]}</span>`)).join('')}</tr>
   <tr>${th('藏干')}${cols.map(col=>cell(col,Z.HIDDEN[Z.ZHI.indexOf(col.pillar[1])].split('').map(st=>`<span class="hidden-stem ${cls(Z.element(st))}">${st}</span>`).join(''))).join('')}</tr>
   <tr>${th('副星')}${cols.map(col=>cell(col,`<span class="sub-gods">${Z.HIDDEN[Z.ZHI.indexOf(col.pillar[1])].split('').map(st=>`<em>${esc(Z.god(c.dayMaster,st))}</em>`).join('')}</span>`)).join('')}</tr>
   <tr>${th('星运')}${cols.map(col=>cell(col,esc(Z.lifeOf(c.dayMaster,col.pillar[1])))).join('')}</tr>
   <tr>${th('自坐')}${cols.map(col=>cell(col,esc(Z.lifeOf(col.pillar[0],col.pillar[1])))).join('')}</tr>
   <tr>${th('空亡')}${cols.map(col=>cell(col,voidOf(col.pillar))).join('')}</tr>
   <tr>${th('纳音')}${cols.map(col=>cell(col,nayinOf(col.pillar))).join('')}</tr>
   <tr>${th('神煞')}${cols.map(col=>cell(col,col.kind==='natal'?`<span class="ss-inline">${ssAt[col.i].length?ssAt[col.i].map(n=>`<em>${esc(n)}</em>`).join(''):'—'}</span>`:'<span class="muted">—</span>')).join('')}</tr>
   </tbody></table></div>`;
 }
 function luckStartHTML(c){
   const rows=c.luck.rows,li=Math.min(state.luckIndex||0,rows.length-1),row=rows[li];
   const next=rows[li+1];
   return `<div class="luck-start"><div><b>起运</b><span>出生后 ${c.luck.years} 年 ${c.luck.months} 个月 ${c.luck.days} 天 ${c.luck.hours} 时</span></div><div><b>交运</b><span>${row.year} 年 ${esc(localString(row.startUTC))}${next?`；下一步 ${next.year} 年`:'（第八步之后不再列）'}</span></div><div><b>顺逆</b><span>${c.luck.forward?'阳男阴女顺排':'阴男阳女逆排'}</span></div><div><b>年岁</b><span>当前第 ${li+1} 步 · 约 ${row.age} 周岁起</span></div></div>`;
 }
 function stripsHTML(c){
   const rows=c.luck.rows,li=Math.min(state.luckIndex||0,rows.length-1),row=rows[li];
   const year=Number(state.annualYear)||new Date().getFullYear();
   const months=X.monthLuck(year);
   return `<div class="strip-block"><div class="strip-head"><b>大运</b><span>点一步换看</span></div><div class="strip luck-strip">${rows.slice(0,8).map((r,i)=>`<button type="button" class="strip-cell ${i===li?'on':''}" data-luck-index="${i}"><em>${r.pillar}</em><span>${r.age}岁</span><small>${r.year}</small></button>`).join('')}</div></div>
   <div class="strip-block"><div class="strip-head"><b>流年</b><span>点一年换看</span></div><div class="strip year-strip">${(row.years||[]).map(y=>`<button type="button" class="strip-cell ${y.year===year?'on':''}" data-annual-year="${y.year}"><em>${y.pillar}</em><span>${y.year}</span></button>`).join('')}</div></div>
   <div class="strip-block"><div class="strip-head"><b>流月</b><span>${year} 年 · 按节气</span></div><div class="strip month-strip">${months.map(m=>`<button type="button" class="strip-cell"><em>${m.pillar}</em><span>${m.term}</span><small>${m.utc8?m.utc8.slice(5,10):''}</small></button>`).join('')}</div></div>`;
 }
 function localString(t){return Z.formatWall(Z.wallStamp(Z.zonedParts(t,state.input.timezone)));}
 function clockName(c){return c.input.clock==='civil'?'民用钟表时':c.input.clock==='mean'?'地方平太阳时':'地方真太阳时（近似）';}
 const hourOf=t=>Number(String(t).slice(11,13));
 const branchOfHour=h=>Z.ZHI[Math.floor(((h+1)%24)/2)];
 const signed=m=>(m>=0?'+':'')+m.toFixed(2);
 function solarCard(c){
   const s=c.solar;if(!s)return '';
   const hc=c.hourCompare;
   const cB=branchOfHour(hourOf(s.clockWall)),tB=branchOfHour(hourOf(s.trueWall));
   const zone=s.zoneMinutes/60,stdLon=s.zoneMinutes/4;
   const applied=c.input.clock!=='civil';
   let verdict='';
   if(!applied){
     verdict=`<div class="solar-verdict warn"><b>当前按钟表时定时辰，未启用太阳时校正。</b>若启用真太阳时，同一瞬间落在 ${tB}时（${hc?hc.true[3]:'—'}）；本盘时柱为 ${c.pillars[3]}。差 ${signed(s.longitudeCorrection+s.eotMinutes)} 分钟。</div>`;
   }else if(hc&&hc.hourChanged){
     verdict=`<div class="solar-verdict changed"><b>时柱已因校正而改变：${hc.civil[3]} → ${c.pillars[3]}。</b>钟表时落在 ${hc.civilBranch}时，真太阳时落在 ${hc.trueBranch}时，跨过了时辰分界。本盘采用校正后的 ${c.pillars[3]}。若出生记录本身不准，请用「出生时刻误差范围」比较候选。</div>`;
   }else if(hc&&hc.dayChanged){
     verdict=`<div class="solar-verdict changed"><b>校正跨过日界，日柱改变：${hc.civil[2]} → ${c.pillars[2]}。</b>这是换日时刻附近出生才会出现的情况，请核对原始记录。</div>`;
   }else{
     verdict=`<div class="solar-verdict ok"><b>已按真太阳时起盘，时柱未变（仍为 ${c.pillars[3]}）。</b>校正量 ${signed(s.longitudeCorrection+s.eotMinutes)} 分钟，未跨过 ${cB}时的分界，所以时柱与钟表时一致——换算已经生效，只是结果相同。</div>`;
   }
   return `<section class="card solar-card" id="solar-card"><div class="card-head"><h2 class="card-title">真太阳时换算</h2><span class="card-kicker">钟表时 → 太阳时</span></div>
   <table class="solar-table" aria-label="真太阳时换算明细">
     <tr><th>出生地钟表时</th><td class="mono-cell">${esc(s.clockWall)}</td><td>${esc(c.input.timezone)}，UTC${zone>=0?'+':''}${zone}</td></tr>
     <tr><th>经度时差</th><td class="mono-cell">${signed(s.longitudeCorrection)} 分</td><td>（${s.LON.toFixed(4)}° − ${stdLon}°）× 4 分／度</td></tr>
     <tr><th>均时差</th><td class="mono-cell">${signed(s.eotMinutes)} 分</td><td>出生瞬间太阳视运动与平太阳之差</td></tr>
     <tr class="solar-total"><th>真太阳时</th><td class="mono-cell">${esc(s.trueWall)}</td><td>落${c.input.clock==='civil'?cB:tB}时</td></tr>
   </table>
   <p class="micro-note">换算顺序：先按 IANA 历史时区把钟表读数还原为 UTC 瞬间（含 1986—1991 年大陆夏令时自动扣回），再加「（经度 − 时区标准经线）×4 分钟」，最后加均时差。年、月柱始终按同一 UTC 瞬间与立春、十二节比较，不因太阳时校正而偏移。</p>
   ${verdict}
   <p class="micro-note"><a href="#learn/L11">→ L11 平太阳时和真太阳时</a>　<a href="#learn/L03">→ L03 时区和夏令时</a></p>
   </section>`;
 }
 function shenshaCard(c){
   const ss=X.shensha(c);
   const kindClass=k=>k==='吉'?'good':k==='凶'?'bad':'neutral';
   return `<section class="card"><div class="card-head"><h2 class="card-title">神煞</h2><span class="card-kicker">共命中 ${ss.length} 组</span></div>
   ${ss.length?`<div class="ss-grid">${ss.map(s=>`<div class="ss-item ${kindClass(s.kind)}"><div class="ss-top"><b>${esc(s.name)}</b><span>${esc(s.kind)}</span></div><div class="ss-hit">${s.found.map(f=>`<i>${esc(f.pos)}${esc(f.char)}</i>`).join('')}</div><p>查${esc(s.from)}：${esc(s.query)} → 见 ${esc(s.targets)}</p><small>${esc(s.basis)}</small></div>`).join('')}</div>`:'<p class="micro-note">本页所列 18 组神煞未见命中；这不代表命盘另有缺陷，神煞本非主体。</p>'}
   <p class="micro-note">神煞是辅助标记：同一字在不同查法下吉凶相反，古籍亦主张「以神煞为辅，不可专恃」。这里只记录查法命中的位置，不把某个煞直接读成灾祸，也不把某个贵人读成必然得助。<a href="#learn/L24">→ L24 辅助信息的边界</a></p></section>`;
 }
 /* 两套旺衰口径的统一呈现：加权试算给分，规则初筛给标签。
    两者算法不同，可能一致、相反，或规则一方给不出定论——三种情况必须分开说，不能各页面各说一套。 */
 function strengthVerdict(c){
   const s=X.strengthScore(c),r=R.strength(c);
   const scoreSide=s.total>=62?'偏强':s.total>=52?'中和偏强':s.total>=42?'中和':s.total>=32?'中和偏弱':'偏弱';
   const ruleSide=r.label.includes('偏强')?'强':r.label.includes('偏弱')?'弱':'待辨';
   const scoreStrong=s.total>=52;
   const conflict=ruleSide!=='待辨'&&((scoreStrong&&ruleSide==='弱')||(!scoreStrong&&ruleSide==='强'));
   const undecided=ruleSide==='待辨';
   return {score:s.total,scoreSide,ruleLabel:r.label,conflict,undecided,ruleSide,rule:r,items:s.items,basis:s.basis,limits:s.limits};
 }
 function verdictLine(v){
   return `<b>${v.score} 分 · ${esc(v.scoreSide)}</b>（加权试算）<span class="verdict-sep">／</span>${esc(v.ruleLabel)}（规则初筛）`;
 }
 function verdictNote(v){
   if(v.conflict)return `<p class="verdict-conflict"><b>两套口径这次的结论相反</b>加权试算把月令、通根、明干帮扶折算成分数，规则初筛只看「月令是否生扶＋有无同根＋有无明干印比」三条同时成立。相反说明这张盘的强弱正卡在两种算法的分界上：回到三项明细逐条比证据，哪一项更硬就以哪一项为工作假设，不取平均，也不凭一个标签下结论。</p>`;
   if(v.undecided)return `<p class="verdict-undecided"><b>规则初筛给不出定论</b>它只认「月令生扶＋同根＋明干印比」同时成立才判强、三者皆无才判弱，本盘落在中间，所以记「待辨」。这时以加权分数作为工作假设，但必须把规则初筛列出的那几项证据补齐，并写下至少一条反证。</p>`;
   return `<p class="verdict-agree"><b>两套口径方向一致</b>方向和标签一致只说明两种算法不矛盾，不说明判断正确；仍要用克泄耗与合冲逐条复核。</p>`;
 }
 function strengthScoreCard(c){
   const v=strengthVerdict(c),s={items:v.items,basis:v.basis,limits:v.limits,total:v.score,grade:v.scoreSide};
   return `<section class="card"><div class="card-head"><h2 class="card-title">旺衰加权试算</h2><span class="card-kicker">${s.total} / 100 · ${esc(s.grade)}</span></div>
   <div class="score-rows">${s.items.map(it=>`<div class="score-row"><div class="score-head"><b>${esc(it.label)}</b><span>${it.score} / ${it.max}</span></div><div class="bar-track"><div class="bar-fill" style="width:${it.score/it.max*100}%"></div></div><p>${esc(it.detail)}</p></div>`).join('')}</div>
   <div class="score-total"><b>合计 ${s.total} 分 · ${esc(s.grade)}</b><span>${esc(s.basis)}</span></div>
   <div class="verdict-box"><div class="verdict-title">两套口径对照 · 详批页与本页同源</div><p class="verdict-main">${verdictLine(v)}</p>${verdictNote(v)}<p class="micro-note">写作业时按这个顺序：先抄三项明细，再抄分数，最后抄规则标签；三者有出入就写清出入在哪，别只留一个结论。<a href="#learn/L56">→ L56 身强身弱详讲</a>　<a href="#learn/L14">→ L14 旺衰为何不能简单计数</a></p></div>
   <p class="micro-note">${s.limits.map(esc).join(' ')}</p></section>`;
 }
 function gejuCard(c){
   const g=X.geju(c);
   return `<section class="card"><div class="card-head"><h2 class="card-title">格局取用候选</h2><span class="card-kicker">${esc(g.primary.name)} · 未判成败</span></div>
   <div class="fact-box"><b>取格依据</b><br>${esc(g.basis)}</div>
   <div class="geju-list">${g.cands.map(x=>`<div class="geju-item ${x===g.primary?'primary':''}"><b>${esc(x.name)}</b><span>月令${['本气','中气','余气'][x.k]}${esc(x.hidden.stem)}${esc(x.hidden.god)}${x.tou.length?' · 透于'+x.tou.map(t=>t.pos+'干').join('、'):' · 未透'}</span><p>${esc(x.condition)}</p></div>`).join('')}</div>
   <p class="micro-note">${esc(g.note)} ${esc(g.yongshen)}<a href="#learn/L15">→ L15 格局框架的阅读方法</a>　<a href="#learn/L16">→ L16 三种用神语境</a></p></section>`;
 }
 function palaceCard(c){
   const ps=X.palaces(c);
   return `<section class="card"><div class="card-head"><h2 class="card-title">四柱宫位</h2><span class="card-kicker">同一十神，落在不同宫位，事应不同</span></div>
   <div class="palace-grid">${ps.map(p=>`<div class="palace-item ${p.index===2?'day':''}"><div class="palace-top"><b>${esc(p.pos)}</b>${pairHTML(p.pillar,'palace-pillar')}</div><div class="palace-scope">${esc(p.scope)}</div><div class="palace-stem">干 ${pairHTML(p.stem.char)}<span>${esc(p.stem.god)}</span></div><div class="palace-stem">支本气 <span>${esc(p.branch.main)}</span></div><p>${esc(p.note)}</p><small>${esc(p.theme)}</small></div>`).join('')}</div>
   <p class="micro-note">年柱看根基与早年环境，月柱看父母兄弟与事业起点（月令同时定格局），日干为自身、日支为夫妻宫，时柱看子女与晚景。宫位只是坐标：同一关系落在此柱与落在彼柱，读法不同，但都不能凭一次冲合断定某位亲属必有何事。<a href="#learn/L09">→ L09 四柱的生成顺序</a></p></section>`;
 }
 function threeMethodsCard(c){
   const t=X.threeMethods(c);
   return `<section class="card"><div class="card-head"><h2 class="card-title">取用三法分栏</h2><span class="card-kicker">调候 → 扶抑 → 通关</span></div>
   <div class="method-list">
     <div class="method-item tiao"><div class="method-head"><b>一 · 调候</b><span>气候：${esc(t.climate)}</span></div><p>${esc(t.seasonText)}</p><div class="fact-box">${esc(t.tiaohou)}</div><small>局中识字统计：火 ${t.fire} ／ 水 ${t.water} ／ 土 ${t.earth}（天干与地支本气各计一次）</small></div>
     <div class="method-item fuyi"><div class="method-head"><b>二 · 扶抑</b><span>${t.strength.total} / 100 · ${esc(t.strength.grade)}</span></div><p>身强宜克泄耗，身弱宜生扶帮。本盘加权试算见上方「旺衰加权试算」卡，逐项加减可复算。</p><small>扶抑解决「够不够」，调候解决「冷不冷」，两者可能指向不同五行，冲突时传统多认调候之急需为先。</small></div>
     <div class="method-item tong"><div class="method-head"><b>三 · 通关</b><span>${t.tongguan.length?t.tongguan.length+' 组两强相持':'未见明显两行相战'}</span></div>
     ${t.tongguan.length?t.tongguan.map(x=>`<div class="tong-row"><b>${esc(x.pair)}</b><em>→ 以${esc(x.mid)}通关</em><span class="tag ${x.status.includes('已有')?'':'warn'}">${esc(x.status)}</span><p>${esc(x.text)}</p></div>`).join(''):'<p>按十神权重，本盘未检出两组对立力量同时偏重的情形；两行相战的判断也可能藏在合冲与月令里，需人工复核。</p>'}
     </div>
   </div>
   <p class="micro-note">${esc(t.note)}</p><p class="micro-note">${t.limits.map(esc).join(' ')}<a href="#learn/L16">→ L16 三种用神语境</a>　<a href="#learn/L21">→ L21 调候资料怎么查</a></p></section>`;
 }
 function energyCard(c){
   const e=X.tenGodEnergy(c),t=X.taiYuan(c);
   return `<section class="card"><div class="card-head"><h2 class="card-title">十神能量与胎元</h2><span class="card-kicker">明面轻重比较</span></div>
   <div class="energy-list">${e.list.map(x=>`<div class="bar-row"><span class="energy-god">${esc(x.god)}</span><div class="bar-track"><div class="bar-fill" style="width:${x.val/e.max*100}%"></div></div><span class="bar-count">${x.val}</span></div>`).join('')}</div>
   <p class="micro-note">${esc(e.basis)} 数值用于比较十神在明面上的轻重，不能换算成"财有多少""官有多大"。</p>
   <div class="ty-box"><b>胎元 ${esc(t.pillar)}</b><p>${esc(t.basis)}</p></div>
   <p class="micro-note">胎元属辅助参考，传统用于参看先天禀受，本页不据此推断健康或寿元。命宫、身宫的起法各家不一致（月建与月数两种取法相差数位），本版暂不输出，以免给出无法自洽的结果。<a href="#learn/L12">→ L12 十神相对关系</a></p></section>`;
 }
 function placeWarnings(c){
   const out=[];
   const hit=c.input.placeHit||P.resolve(c.input.place);
   if(!hit.found&&c.input.clock!=='civil')out.push(`出生地点「${c.input.place}」没有在地名库中匹配到，当前真太阳时用的是手填经度 ${c.input.longitude}°。经度不对，时柱就会错，请在「出生地点」换个写法或直接填写经度。`);
   else if(hit.found&&hit.level>=3&&c.input.clock!=='civil')out.push(`出生地点只识别到${hit.admin||'省级'}，用的是${hit.name}的城市中心坐标，实际出生地可能相差半小时以上的时差。请补填区县级地名或精确经度。`);
   return out;
 }
 function warningHTML(c){const all=[...(c.warnings||[]),...placeWarnings(c)];return all.length?`<div class="warning"><strong>需要留意的时间与资料条件</strong>${all.map(w=>`<div>· ${esc(w)}</div>`).join('')}${c.uncertain?`<div style="margin-top:8px">候选组合：${c.timeAlternatives.map(a=>a.pillars.join(' ')).join(' ／ ')}</div>`:''}</div>`:'';}
 function selectedLuck(){return state.chart?.luck?.rows[state.luckIndex];}
 function luckHTML(c){const l=c.luck,row=selectedLuck();return `<section class="card"><div class="card-head"><h2 class="card-title">大运 · 流年</h2><span class="card-kicker">点选大运，展开流年</span></div><div class="luck-explain"><strong>${l.forward?'顺行':'逆行'}</strong> · 出生后 ${l.years}年${l.months}月${l.days}日${l.hours}时 起运<br>交运：${esc(localString(l.startUTC))}（出生地时区）</div><div class="pillar-legend">${Z.ELEMENTS.map(e=>`<span class="${cls(e)}"><i></i>${e}</span>`).join('')}<em>天干按本字五行、地支按本气五行分别着色</em></div><div class="luck-scroll">${l.rows.map((r,i)=>`<button class="luck-item ${state.luckIndex===i?'active':''}" data-luck="${i}" aria-pressed="${state.luckIndex===i}"><span class="luck-year">${r.year}</span><span class="luck-age">约${r.age}周岁起</span>${pairHTML(r.pillar,'luck-pillar')}<span class="luck-god">${r.detail.god}</span></button>`).join('')}</div><div class="luck-detail"><div class="annual-strip">${Array.from({length:11},(_,i)=>{const y=row.year+i,ap=Z.annual(y);return `<button class="annual-chip ${state.annualYear===y?'active':''}" data-annual="${y}">${y} ${pairHTML(ap)}</button>`;}).join('')}</div>${state.annualYear?annualHTML(c,state.annualYear):'<p class="micro-note">流年柱按立春切换；交运年可能横跨两步大运，不能只看公历年份归运。</p>'}</div></section>`;}
 function annualHTML(c,year){
   const p=Z.annual(year);const rel=c.pillars.map((x,i)=>({label:['年柱','月柱','日柱','时柱'][i],items:Z.relations([x,p]).filter(r=>r.type==='地支六冲'||r.type==='地支六合'||r.type==='天干五合')})).filter(x=>x.items.length);
   const months=X.monthLuck(year);
   const luckPillar=(c.luck.rows[state.luckIndex]||c.luck.rows[0]).pillar;
   const flags=X.annualFlags(c,luckPillar,p);
   return `<p class="micro-note"><b>${year} ${p}</b>：流年天干相对日主为${Z.god(c.dayMaster,p[0])}。${rel.length?rel.map(r=>`${r.label}涉及${r.items.map(i=>i.pair+i.type).join('、')}`).join('；'):'在本页所列五合、六合、六冲表中，流年与原局未检出对应配对。'} 这是关系计算，不代表该年必有某事发生。</p>
   <div class="flag-block"><h4>岁运互动 · 伏吟／反吟／岁运并临</h4>
   ${flags.length?`<div class="flag-list">${flags.map(f=>`<div class="flag-item ${f.tone}"><div class="flag-top"><b>${esc(f.type)}</b><span>${esc(f.level)}</span></div><p>${esc(f.text)}</p></div>`).join('')}</div>`:'<p class="micro-note">本步大运与'+year+'流年之间、以及流年与四柱之间，未检出伏吟、反吟或岁运并临。没有这些关系不等于该年平顺，它们只是传统的结构提示。</p>'}
   <p class="micro-note">读法次序：先看原局有没有这个结构，再看本步大运是否把它推到台面上，最后才看这一年是否触发。跳过前两层只读流年，等于只看天气不看自己在哪。伏吟看「叠加在哪一柱」，反吟看「撞开的是不是维持平衡的那个字」；两者都不必然是凶。</p></div>
   <div class="month-block"><h4>${year} 年流月 · 按十二节切换</h4><div class="month-strip">${months.map(m=>`<span class="month-chip"><b>${esc(m.name)}${esc(m.branch)}</b><em>${pairHTML(m.pillar)}</em><small>${m.utc8?esc(m.utc8.slice(5,16)):'—'}</small></span>`).join('')}</div>
   <p class="micro-note">月柱以节为界（立春、惊蛰、清明……），不以农历初一换月。${year}年为${esc(p)}年，按五虎遁「${esc(p[0])}年起${esc(months[0].pillar[0])}寅」推得全年月干。时刻为北京时间（UTC+8）交节瞬间，出生地时区须另行换算。流月只列结构，不代表该月必有事件。<a href="#learn/L05">→ L05 十二节与月柱</a></p></div>`;
 }
 function elementsHTML(c){return `<section class="card"><div class="card-head"><h2 class="card-title">五行分布</h2><span class="card-kicker">识字统计</span></div><div class="element-body">${Z.ELEMENTS.map(e=>`<div class="bar-row"><span class="${cls(e)}">${e}</span><div class="bar-track"><div class="bar-fill" style="width:${c.counts[e]/8*100}%;background:${colors[e]}"></div></div><span class="bar-count">${c.counts[e]} / 8</span></div>`).join('')}<p class="micro-note">天干与地支本气各计一次，共8项。数量不等于旺衰，也不据此认定喜用。</p></div></section>`;}
 function relationsHTML(c){const rs=R.relationFacts(c.pillars);return `<section class="card"><div class="card-head"><h2 class="card-title">干支关系</h2><span class="card-kicker">结构观察</span></div><div class="relation-list">${rs.length?rs.map(r=>`<div class="relation"><b>${r.pair}</b><span>${r.type}</span><em>${r.positions}</em></div>`).join(''):'<p class="micro-note">未检出本页关系表中的配对；不代表不存在其他取法。</p>'}<p class="micro-note">关系记录不等于成化、吉凶或具体事件。四冲、六破及三刑自刑按基础总表明示口径列出；流派分歧保留。<a href="#learn/basics">查看完整口径 →</a></p></div></section>`;}

 function unknownHTML(c){return `<div class="results-column">${warningHTML(c)}<section class="card"><div class="card-head"><h2 class="card-title">时刻未知 · 候选命盘</h2>${tag('不生成唯一详批','wine')}</div><div class="empty" style="padding:25px"><h3>${c.partial.map(p=>p||'待定').join('　')}　时柱未知</h3><p>上方仅列在本次枚举中一致的年、月、日柱。以下是该本地日期的候选组合，不能从中任选一张充当真实出生盘。</p></div><div class="candidate-grid">${c.candidates.map(p=>`<div class="candidate"><b>${p.pillars.join(' ')}</b><span class="micro-note">候选组合 · 无优先顺序</span></div>`).join('')}</div></section><div class="analysis-cta"><div><h3>先补原始时间，再讨论细节</h3><p>可以先进入学堂，学习出生资料和候选盘的处理方法。</p></div><a class="button" href="#learn/L02">学习资料核验 ↗</a></div></div>`;}
 function chartFromUTC(input,ms){
   const p=Z.zonedParts(ms,input.timezone),pad2=n=>String(n).padStart(2,'0');
   return Z.calculate({...input,date:`${p[0]}-${pad2(p[1])}-${pad2(p[2])}`,time:`${pad2(p[3])}:${pad2(p[4])}`});
 }
 function candidateHours(c){
   return [-7200000,0,7200000].map(d=>{try{return chartFromUTC(c.input,c.utc+d);}catch{return null;}}).filter(Boolean);
 }
 function workAutoHTML(c){
   const ys=D.yongshen(c),gj=X.geju(c),lucks=R.eightLuck(c),G=D.gates(c);
   const nowYear=new Date().getFullYear();
   const cur=G.now;
   return `<section class="card work-auto" id="work-auto"><div class="card-head"><h2 class="card-title">本盘自动判读 · 对照用的底稿</h2><span class="card-kicker">先自己写，再对照这里</span></div><div class="work-auto-body">
    <div class="wa-row"><b>身强身弱</b><span class="wa-tag">${esc(ys.level)} · ${ys.total} 分</span><p>${esc(ys.line)}${esc(ys.why)}</p></div>
    <div class="wa-row"><b>喜用</b><span class="wa-tag good">${esc(ys.favorGods||'—')}</span><p>${esc(ys.favor)}；${esc(ys.elements)}。${esc(ys.climate)}</p></div>
    <div class="wa-row"><b>忌神</b><span class="wa-tag bad">${esc(ys.avoidGods||'—')}</span><p>${esc(ys.avoid)}。${esc(ys.reverse)}</p></div>
    <div class="wa-row"><b>格局</b><span class="wa-tag">${esc(gj.primary.name)}</span><p>${esc(gj.primary.condition)}</p></div>
    <div class="wa-row"><b>当前运</b><span class="wa-tag">${cur?esc(cur.pillar):'未起运'}</span><p>${cur?esc(cur.luck.lines[0])+esc(cur.luck.lines[1]):'尚未起运。'}</p></div>
    <div class="wa-row"><b>今年</b><span class="wa-tag">${cur&&cur.year?esc(cur.year.pillar):esc(Z.annual(nowYear))}</span><p>${cur&&cur.year?esc(cur.year.lines.slice(0,3).join('')):esc('本步运内没有今年的分段。')}</p></div>
    <p class="micro-note">这是程序按本页口径给出的判读，不是标准答案；你写的和它不一样，先检查是不是漏了证据，再决定谁对。往下十二步，就是把这六行展开成一份完整批盘。</p>
   </div></section>`;
 }
 function workStep(title,n,why,data,ask,ref,pitfall,lesson){
   const key='s'+n,val=esc(state.work[key]||'');
   return `<section class="card work-step" id="work-${n}"><div class="work-head"><span class="work-no">${n}</span><div><h3>${esc(title)}</h3><p>${esc(why)}</p></div></div>
   <div class="work-body">${data}
   <div class="work-ask"><label for="work-${n}">写下你的判断</label><textarea id="work-${n}" data-work="${key}" class="lesson-note" rows="3" placeholder="${esc(ask)}">${val}</textarea></div>
   <details class="work-ref"><summary>对答案：这一步该写到什么程度</summary><div>${ref}</div></details>
   <p class="work-pitfall"><b>常见错误</b>${esc(pitfall)}${lesson?'　<a href="#learn/'+lesson+'">→ '+lesson+'</a>':''}</p>
   </div></section>`;
 }
 /* ===== 结论摘要：先给判断，再给依据 ===== */
 const GOD_VIBE={
  '比肩':'自己能扛，认死理，不爱欠人情','劫财':'敢冲、爱争，出手快过想','食神':'温和、会享受，手上要有活儿','伤官':'脑子快、嘴也快，不服管',
  '正财':'务实、算得清，喜欢稳稳当当','偏财':'大方、会来事，机会来了敢下手','正官':'守规矩、要体面，怕出错','七杀':'扛得住压力，脾气也硬',
  '正印':'念旧、好学，想得多做得慢','偏印':'敏感、挑，专挑冷门的路走'
 };
 const GROUP_FACE={peer:'同辈与自我',output:'表达与手艺',wealth:'钱与资源',power:'规矩与压力',resource:'学习与靠山'};
 const GROUP_USE={peer:'比劫',output:'食伤',wealth:'财星',power:'官杀',resource:'印星'};
 const GROUP_LUCK={peer:'帮身、合伙，也分你的钱',output:'适合输出、学手艺、换赛道',wealth:'财路打开，但要防摊子铺太大',power:'责任压上来，位置和是非一起来',resource:'读书、资历、贵人，节奏偏慢'};
 function godsOfElement(dm,el){const rep=['甲','丙','戊','庚','壬'][Z.ELEMENTS.indexOf(el)];const g=Z.god(dm,rep);return g;}
 function groupOf(god){return Object.keys(GROUPS).find(k=>GROUPS[k].includes(god));}
 const GROUPS={peer:['比肩','劫财'],output:['食神','伤官'],wealth:['正财','偏财'],power:['正官','七杀'],resource:['正印','偏印']};
 function conclusionData(c){
  const sc=X.strengthScore(c),rs=R.strength(c),gj=X.geju(c),tm=X.threeMethods(c),en=X.tenGodEnergy(c);
  const weak=sc.total<45,strong=sc.total>55;
  const favor=new Set(weak?['正印','偏印','比肩','劫财']:strong?['食神','伤官','正财','偏财','正官','七杀']:[]);
  const hot=(tm.climate==='暖'||tm.climate==='温')&&(c.counts['火']||0)>=3&&(c.counts['水']||0)<=2;
  const climateEl=tm.climate==='寒'?'火':hot?'水':null;
  const climateGod=climateEl?godsOfElement(c.dayMaster,climateEl):'';
  if(climateGod)favor.add(climateGod);
  if(!weak&&!strong){ // 中和：补最弱的一组
    const low=[...en.list].sort((a,b)=>a.val-b.val)[0];
    if(low)favor.add(low.god);
  }
  const top=[...en.list].sort((a,b)=>b.val-a.val).slice(0,2);
  const baseFavor=[...favor].filter(g=>g!==climateGod);
  const luck=c.luck.rows.slice(0,8).map(r=>{
    const sg=Z.god(c.dayMaster,r.pillar[0]),bg=Z.god(c.dayMaster,Z.HIDDEN[Z.ZHI.indexOf(r.pillar[1])][0]);
    const score=(favor.has(sg)?1:0)+(favor.has(bg)?1:0)+(climateGod&&(sg===climateGod||bg===climateGod)?1:0);
    return {...r,stemGod:sg,branchGod:bg,score,verdict:score>=2?'顺':score===1?'平':'逆'};
  });
  return {sc,rs,gj,tm,en,weak,strong,favor:[...favor],baseFavor,climateEl,climateGod,top,luck};
 }
 function conclusionHTML(c){
  const d=conclusionData(c),sc=d.sc,gj=d.gj,tm=d.tm,rs=d.rs,bf=d.baseFavor;
  const dayRel=R.relationFacts(c.pillars).filter(r=>r.indices.includes(2)),dayRelText=R.relationText(dayRel)||'未见合冲';
  const side=sc.total>=60?'偏强':sc.total>=52?'略强':sc.total>44?'中和':sc.total>36?'中和偏弱':'偏弱';
  const topGods=d.top.map(x=>x.god);
  const spouseGod=c.input.gender==='male'?'正财':'正官';
  const spouseAlt=c.input.gender==='male'?'偏财':'七杀';
  const spouseFound=c.details.filter(p=>p.god===spouseGod||p.god===spouseAlt).map(p=>p.stem+p.god);
  const dayHidden=c.details[2].hidden.map(h=>h.stem+h.god).join('、');
  const goodLuck=d.luck.filter(l=>l.verdict==='顺'),badLuck=d.luck.filter(l=>l.verdict==='逆');
  const favText=d.favor.length?d.favor.join('、'):'顺其最旺者微调';
  const item=(label,verdict,basis,tag,tone='')=>`<div class="verdict-item ${tone}"><div class="verdict-label">${label}<span class="verdict-tag">${tag}</span></div><p class="verdict-say">${verdict}</p><p class="verdict-basis">${basis}</p></div>`;
  const ys0=D.yongshen(c);
  const lead=`${c.dayMaster}${Z.element(c.dayMaster)}生在${c.pillars[1][1]}月，${sc.total} 分，判${ys0.level}。${d.weak?'底子不算厚，但也没到虚的地步：有人帮、有根，只是不多。':d.strong?'底子厚，力气大，怕的是憋着没处使。':'不好不坏，属于看运走的一类。'}${d.climateEl?`格局偏${tm.climate==='寒'?'冷':'燥'}，先要${d.climateEl}来调，再谈别的。`:''}`;
  return `<section class="card conclusion-card" id="report-conclusion"><div class="card-head"><h2 class="card-title">结论摘要</h2><span class="card-kicker">先看判断，再看依据</span></div><div class="conclusion-body">
    <p class="conclusion-lead">${esc(lead)}</p>
    ${(()=>{const ys=D.yongshen(c);return `<div class="verdict-hero"><div class="vh-main"><span>身强身弱</span><b>${esc(ys.level)}</b><em>${ys.total} 分 · 超过 52 判强、低于 44 判弱</em></div><div class="vh-col"><span>喜用（${esc(ys.favorGods||'—')}）</span><p>${esc(ys.favor)}</p><em>${esc(ys.elements)}</em></div><div class="vh-col bad"><span>忌神（${esc(ys.avoidGods||'—')}）</span><p>${esc(ys.avoid)}</p><em>运年见之则紧，见喜则松</em></div><div class="vh-note"><p>${esc(ys.climate)}</p>${ys.conflict?`<p class="warn-text">${esc(ys.conflict)}</p>`:''}${ys.tongguan?`<p>${esc(ys.tongguan)}</p>`:''}<p class="micro-note">${esc(ys.reverse)}</p></div></div>`;})()}
    <div class="verdict-grid">
      ${(()=>{const ys=D.yongshen(c);return item('日主强弱',`判为「${ys.level}」（${ys.total} 分）。${d.weak?'按弱用，但不作从格论——有印有根，从不了。':d.strong?'按强用，取克泄耗，不取印比。':'三栏都在中间，按中和处理，运来定方向。'}`,`得令 ${sc.items[0].score}/40、得地 ${sc.items[1].score}/35、得势 ${sc.items[2].score}/25；规则初筛：${rs.label}`,d.weak?'明确':'倾向','')})()}
      ${item('格局',`月令${c.pillars[1][1]}，本气${c.details[1].hidden[0].stem}为${gj.primary.name.replace('格','')}，先按「${gj.primary.name}」看。${gj.primary.tou.length?'已透，成格的门开着。':'未透，只能算有力，成格还差一口气。'}`,`${gj.basis.slice(0,60)}…`,gj.primary.tou.length?'倾向':'待辨','')}
      ${(()=>{const favMain=[...new Set(d.favor.filter(g=>g!==d.climateGod).map(g=>groupOf(g)).filter(Boolean))];const climGrp=d.climateGod?groupOf(d.climateGod):'';const same=climGrp&&favMain.includes(climGrp);const useTxt=favMain.map(g=>GROUP_USE[g]).join('、')||'不限';const say=d.climateEl?(same?`扶抑要${useTxt}，调候要${d.climateEl}，两条线指同一个方向，用起来不别扭。`:`扶抑要${useTxt}，调候却要${d.climateEl}——对${c.dayMaster}日主是${d.climateGod}，两法打架。传统做法是先救急：${tm.climate==='寒'?'寒局先暖':'燥局先润'}，暖过来再补扶抑，不要一味补身。`):`调候不急，只看扶抑：${useTxt}。`;return item('用神方向',say,`调候：${tm.climate}（宜${d.climateEl||'不急'}）；扶抑：${useTxt}；通关：${tm.tongguan.length?tm.tongguan[0].pair+'（'+tm.tongguan[0].status+'）':'未见两强相持'}`,d.climateEl?'明确':'倾向','')})()}
      ${item('性情',`${topGods.join('、')}最重：${topGods.map(g=>GOD_VIBE[g]||'').filter(Boolean).join('；')}。这是取象层面的说法，落到人身上还要看成长环境。`,`十神明面轻重：${d.en.list.slice(0,4).map(x=>x.god+x.val).join('、')}`,'倾向','')}
      ${item('六亲与家庭',`日支${c.pillars[2][1]}藏${dayHidden}，夫妻宫看这里。${spouseFound.length?`伴侣星在${[...new Set(spouseFound)].join('、')}，明面上有位置。`:'伴侣星没在明面上露头，多半藏在支里或等运来引。'}`,`年柱${c.pillars[0]}看根基，月柱${c.pillars[1]}看父母兄弟`,spouseFound.length?'倾向':'待辨','')}
      ${item('事业',`${bf.includes('食神')||bf.includes('伤官')?'靠手艺、表达、内容换钱的路子顺，靠关系的路子慢。':bf.includes('正官')||bf.includes('七杀')?'在有规矩、有考核的地方更稳，自己单干的成本高。':bf.includes('正财')||bf.includes('偏财')?'跟钱、资源、经营打交道顺手，纯技术会做得闷。':bf.includes('正印')||bf.includes('偏印')?'先在一个体系里把资历熬出来，比四处试快。':'先找能立住脚的一技之长，别急着换方向。'}`,`输出：${c.details.map(p=>p.god).filter(g=>['食神','伤官'].includes(g)).join('、')||'明面未见'}；约束：${c.details.map(p=>p.god).filter(g=>['正官','七杀'].includes(g)).join('、')||'明面未见'}`,'倾向','')}
      ${item('财运',`财路${c.details.some(p=>['正财','偏财'].includes(p.god))?'明面上有':'主要在支里'}，${d.weak?'身不厚，赚得到也容易散，先把固定收入做稳，别急着上杠杆。':d.strong?'身有余力，能扛资产；比劫重时合伙容易分账不清，先把规则写下来。':bf.includes('正财')||bf.includes('偏财')?'运来财就动，运过就收，别把一时的行情当本事。':'看运，运来财就动，运过就收。'}`,`财星位置：${c.details.map((p,i)=>['年','月','日','时'][i]+p.god).filter(x=>/财/.test(x)).join('、')||'无'}`,'倾向','')}
      ${item('婚恋',`${c.input.gender==='male'?'男命看财星与日支。':'女命看官杀与日支。'}${spouseFound.length?'星在明面，缘分来得早也来得直接。':'星藏，多数是先相处再定名分。'}${/冲|害|刑|破/.test(dayRelText)?'日支有冲害，关系里容易有拉扯，聚少离多也算应。':'日支安稳，感情里不太折腾。'}`,`日支${c.pillars[2][1]}相关关系：${esc(dayRelText)}`,'待辨','')}
      ${item('身体与作息',`${d.climateEl==='火'?'局冷，怕冷、手脚凉、循环慢，秋冬要多动。':d.climateEl==='水'?'局燥，容易上火、口干、睡不好，少熬夜。':'寒热还算平均，留意作息与情绪。'}这只是五行偏枯对应的生活提示，不是病名。`,`五行统计：${Object.entries(c.counts).map(([k,v])=>k+v).join(' ')}`,'倾向','')}
      ${item('运势走势',`${goodLuck.length?`顺的步子：${goodLuck.map(l=>`第${l.index+1}步${l.pillar}（${l.year}起）`).join('、')}。`:'八步运里没有明显顺的，靠本事和人稳。'}${badLuck.length?`逆的步子：${badLuck.map(l=>`第${l.index+1}步${l.pillar}（${l.year}起）`).join('、')}，这几年宜守。`:'没有明显逆的运，节奏比较平。'}`,`按每步运干支是否落在扶抑喜用（${favText}）或调候之需上计分，属结构判断，不是事件预测。`,'倾向','')}
    </div>
    <div class="conclusion-foot"><p>这些结论有明确口径：强弱按本页 40／35／25 加权，格局按月令本气取，用神按扶抑＋调候，运程按运干支是否落在喜用。用这套口径能算的到这里；口径之外的事（具体职业、金额、婚期、病名）这里不下判断，因为算不出来。</p><p class="micro-note">往下走先过三关：拿过去的运验两三条，对得上再谈现在和以后。<a href="#report-gates">→ 过三关</a>　<a href="#learn/L56">→ L56 身强身弱</a></p></div>
  </div></section>`;
 }
 /* ===== 过三关：断过去、验现在、应未来（逐运逐年具体断） ===== */
 function threeGatesHTML(c){
  const G=D.gates(c),ys=G.ys;
  const gate=(no,title,q,body)=>`<div class="gate"><div class="gate-head"><span class="gate-no">${no}</span><h3>${title}</h3><span class="gate-q">${q}</span></div>${body}</div>`;
  const pastBody=G.past.length?G.past.map(p=>`<div class="gate-item"><b>第${p.number}步 ${p.pillar}　判「${p.luck.verdict}」　${p.luck.stage.name}</b><p>${esc(p.luck.lines[0])}${esc(p.luck.lines[2]||'')}</p>${p.years.map(({y,r})=>`<p class="gate-year"><b>${y.year} ${y.pillar}</b>（${r.god}）：${esc(r.lines[0].replace(/^[^，]*，/,''))}${esc((r.lines[3]||'').replace(/^[^，]*，/,''))}</p>`).join('')}<p class="gate-check">要核对的：上面这两个年份，<b>是否各发生过一件与「${esc(D.THEME[p.years[0]?p.years[0].r.god:'正官'])}」同类的事</b>？对得上，这条结构在这张盘上算立住；完全不是这回事，就划掉，别硬圆。</p></div>`).join(''):'<p class="micro-note">这张盘还没有走完的整步大运。可以改看流年：挑一个已经过去的年份，按同样方法对。</p>';
  const nowBody=G.now?`<div class="gate-item"><b>第${G.now.number}步 ${G.now.pillar}　判「${G.now.luck.verdict}」　${G.now.luck.stage.name}</b><p>${esc(G.now.luck.lines[0])}${esc(G.now.luck.lines[1])}</p><p>${esc(G.now.luck.lines[2]||'')}</p>${G.now.year?`<p class="gate-year"><b>${G.now.year.year} ${G.now.year.pillar}</b>（${G.now.year.god}，判「${G.now.year.tone}」）：${esc(G.now.year.lines[1])}${esc(G.now.year.lines[3]||'')}</p>`:''}<p class="gate-check">要核对的：最近两三年里，${esc(G.now.luck.stage.note)}这一类主线有没有在身上出现？有，就说明这套判法站得住；没有，先别急着往下断。</p></div>`:'<p class="micro-note">尚未起运，先看童限与家庭环境。</p>';
  const futureBody=G.future.length?G.future.map(r=>`<div class="gate-item"><b>${r.year} ${r.pillar} · ${r.god}（判「${r.tone}」）</b><p>${esc(r.lines[0])}${esc(r.lines[1])}</p><p>${esc(r.lines[2]||'')}${esc(r.lines[3]||'')}</p><p class="gate-check">先把话撂下：${esc(r.lines[r.lines.length-1])}</p></div>`).join(''):'<p class="micro-note">没有可用的未来流年段。</p>';
  return `<section class="card gates-card" id="report-gates"><div class="card-head"><h2 class="card-title">过三关 · 拿这张盘验一验</h2><span class="card-kicker">断过去 → 验现在 → 应未来</span></div><div class="gates-body">
   <p class="gates-lead">批盘最怕自说自话。所以先不谈以后：从走过的运里挑年份，把“那一年你身上大概发生了什么”说成能被点头或摇头的话，当事人点头了，再往下断。三关过不了两关，这套结构在这张盘上就不成立。</p>
   <div class="ys-strip"><span class="ys-chip strong">${esc(ys.level)}（${ys.total} 分）</span><span class="ys-chip">喜 ${esc(ys.favGroups.map(g=>D.GNAME[g]).join('、'))}</span><span class="ys-chip bad">忌 ${esc(ys.avoidGroups.map(g=>D.GNAME[g]).join('、'))}</span><span class="ys-chip">${esc(ys.elements)}</span></div>
   ${gate('一','验过去','对得上才算立住',pastBody)}
   ${gate('二','验现在','当下这步运在讲什么',nowBody)}
   ${gate('三','应未来','先把话撂下，再等结果',futureBody)}
   <div class="gate-note"><b>怎么算过关</b><p>三关是递进：过去对得上，才谈现在；现在对得上，才敢说以后。上面每一条都写成了“哪一年、什么方向、怎么算应”——<b>核对必须由当事人来做</b>，程序不能替你确认某年是不是真的换了工作、搬了家。对不上就记“未应”，不要改口径去圆。</p></div>
  </div></section>`;
 }
 function workHTML(){
   const c=state.chart&&!state.chart.unknownTime&&!state.chart.uncertain?state.chart:null;
   if(!c)return head('批盘带练','对着真实盘面，按八步走完一次完整批盘；每一步都有可核对的数据和参考答案。','PRACTICE · 八步批盘')+`<div class="card empty"><h3>先建立一张命盘</h3><p>带练台用你排盘页的当前命盘。先去起一张盘，再回来按八步走。</p><a class="button primary" href="#chart">去排盘 →</a></div>`;
   const cands=candidateHours(c),st=X.strengthScore(c),gj=X.geju(c),tm=X.threeMethods(c),ps=X.palaces(c),ss=X.shensha(c),ty=X.taiYuan(c),ys=D.yongshen(c);
   const row=c.luck.rows[state.luckIndex]||c.luck.rows[0];
   const year=new Date().getUTCFullYear(),flags=X.annualFlags(c,row.pillar,Z.annual(year));
   const done=Object.keys(state.work).filter(k=>String(state.work[k]||'').trim().length>0).length;

   const s1=workStep('收资料',1,'批盘的第一步不是看盘，是把输入钉死。资料不清，后面全是猜。',
    `<div class="work-data"><div class="kv"><b>当前输入</b>${esc(c.input.name)} · ${c.input.gender==='male'?'男':'女'} · ${esc(c.civil)} · ${esc(c.input.place)} · ${esc(c.input.timezone)}</div>
     <div class="kv"><b>采用口径</b>${clockName(c)} · ${Number(c.input.dayBoundary)===23?'23':'0'}点换日 · 晚子时起干${c.input.ziStem==='same'?'当日':'次日'}</div>
     <div class="kv"><b>待补信息</b>记录来源（出生证/家人口述/回忆）· 时刻精度（到分/到时辰/只知上下午）· 出生地是否精确到区县 · 是否双胞胎</div></div>
     <p class="micro-note">还要问清：谁在问、和你什么关系、他关心什么。批盘不是背命书，目的不清就会把话说到不该说的方向。</p>`,
    '例：记录来自出生证，时间到分；出生地为县医院，精度可到区；被问者本人关注职业方向。',
    '<p>合格写法是四行：来源、精度、地点、目的。任一项缺失都要在结论里标明"该项未核"。</p><p>不要用"大概""应该是"填补记录；不确定就写不确定。</p>',
    '只知道"天快亮"，却直接填 06:00 起盘——把区间资料改写成点值，后面所有时柱结论都不成立。','L02')+

   workStep('定盘：过四道闸',2,'时柱错一根，子女宫与晚年全偏，格局也可能从成格变破格。四道闸按顺序过。',
    `<div class="work-data"><div class="kv"><b>① 夏令时</b>${c.input.timezone==='Asia/Shanghai'?'中国 1986—1991 年夏季曾拨快 1 小时，已按 IANA 历史规则处理':'按该地 IANA 历史规则处理'}</div>
     <div class="kv"><b>② 真太阳时</b>${c.solar?`钟表时 ${esc(c.solar.clockWall)} → 经度差 ${signed(c.solar.longitudeCorrection)} 分 → 均时差 ${signed(c.solar.eotMinutes)} 分 → 真太阳时 ${esc(c.solar.trueWall)}`:'未填经度，无法换算'}</div>
     <div class="kv"><b>③ 子时归属</b>${Number(String(c.clock).slice(11,13))===23?'本盘落在 23 时段，需确认按 23 点还是 0 点换日':'不涉及子时边界'}</div>
     <div class="kv"><b>④ 跨节</b>前一节 ${esc(c.before.name)} ${new Date(c.before.utc).toISOString().slice(0,16)} · 后一节 ${esc(c.after.name)} ${new Date(c.after.utc).toISOString().slice(0,16)}</div>
     ${c.hourCompare?`<div class="kv"><b>校正前后</b>钟表时 ${c.hourCompare.civil[3]} → 真太阳时 ${c.hourCompare.true[3]}${c.hourCompare.hourChanged?'（<b class="warn-text">已改变，采用校正后</b>）':'（未变）'}</div>`:''}</div>`,
    '例：四闸已过，采用真太阳时；出生距上一节 4 天，月柱稳定；不涉子时。',
    '<p>四闸要逐条写"已过"或"存疑"，不能只写"已核对"。</p><p>跨节两小时内出生时，必须给出前后两节的时刻，并说明取哪一边、为什么。</p>',
    '把"农历初一"当月柱起点；或只看钟表时不看经度。','L05')+

   workStep('标注盘面',3,'先把可查表的部分抄全，再谈判断。这一步不许出现解释性语言。',
    `<div class="work-data"><div class="pillar-line">${c.pillars.map((p,i)=>`<span class="pl-item"><em>${['年','月','日','时'][i]}</em>${pairHTML(p,'pl-pair')}<small>${esc(c.details[i].god)}</small></span>`).join('')}</div>
     <div class="kv"><b>藏干</b>${c.details.map((p,i)=>`${['年','月','日','时'][i]}支${esc(p.branch)}藏${p.hidden.map(h=>h.stem+'·'+h.god).join('、')}`).join('；')}</div>
     <div class="kv"><b>空亡</b>${c.details.map((p,i)=>`${['年','月','日','时'][i]}${p.void}`).join(' · ')}</div>
     <div class="kv"><b>纳音</b>${c.details.map(p=>p.nayin).join(' · ')}</div>
     <div class="kv"><b>胎元</b>${esc(ty.pillar)}</div>
     <div class="kv"><b>神煞</b>${ss.length?ss.map(s=>`${s.name}（${s.found.map(f=>f.pos+f.char).join('、')}）`).join('；'):'本页表未命中'}</div></div>`,
    '例：四柱已抄全，藏干本气中气余气分明，神煞只记不判。',
    '<p>这一步只允许"抄"，不允许"所以"。神煞命中不等于吉凶，写位置即可。</p><p>藏干一定要分本气/中气/余气，不然后面判根气会错。</p>',
    '把神煞当结论："命带羊刃所以脾气暴"——标签化之后就停了思考。','L13')+

   workStep('验盘：用已知经历反推时辰',4,'这是新手最常跳过、也最救命的一步。时辰不确定时，先拿已知的事去对。',
    `<div class="work-data"><div class="kv"><b>三个候选时辰的差异</b></div>
     <div class="cand-grid">${cands.map((x,i)=>`<div class="cand-item ${x.pillars.join()===c.pillars.join()?'cur':''}"><b>${['前一时辰','当前读数','后一时辰'][i]}</b><span class="cand-time">${esc(x.solar?x.solar.trueWall.slice(11,16):x.clock.slice(11,16))}</span><span class="cand-pillar">${pairHTML(x.pillars[3],'pl-pair')}</span><small>时干${esc(x.details[3].god)} · 时支藏${x.details[3].hidden.map(h=>h.stem+h.god).join('、')}</small><small>起运 ${x.luck.rows[0].year}年 ${esc(x.luck.rows[0].pillar)}</small></div>`).join('')}</div>
     <div class="kv"><b>可用来校时的事件</b>有明显年月、影响大、不易记错：重大搬迁、升学或中断学业、第一次长期离乡、结婚或离婚、子女出生、重大手术、职业性质变化、购房迁居。</div>
     <div class="kv"><b>不宜使用</b>性格自评、日常情绪、短期得失、"我感觉财运一般"这类宽泛描述。</div></div>
     <p class="micro-note">判定标准：三件以上独立事件都对上，才可采信；只对上一件，多半是巧合。核对时不要把候选盘的解释先说给对方听，避免他无意中迎合。校时本质是概率筛选，最终记录应写作"推定时辰"，与出生证的确定时间分开。</p>`,
    '例：三件事件分别落在 2011、2016、2021，其中两件只有当前读数盘能对上——采信当前时辰，标注为推定。',
    '<p>合格写法：列出用了哪几件事、每件事落在哪个候选盘、对上几件、结论是"采信/存疑/不采信"。</p><p>若三个时辰都对不上，正确结论是"资料可能有误，重新核对出生日期与地点"，不是硬挑一个。</p>',
    '只挑说中的那件，忽略对不上的两件；或者反过来，为了自圆其说去修改事件描述。','L26')+

   workStep('定强弱与格局',5,'先定日主承受力，再定全局骨架。两者都不许直接跳到用神。',
    `<div class="work-data"><div class="score-rows">${st.items.map(it=>`<div class="score-row"><div class="score-head"><b>${esc(it.label)}</b><span>${it.score} / ${it.max}</span></div><div class="bar-track"><div class="bar-fill" style="width:${it.score/it.max*100}%"></div></div><p>${esc(it.detail)}</p></div>`).join('')}</div>
     <div class="kv"><b>试算合计</b>${st.total} / 100 · ${esc(st.grade)}（本页自定权重，可复算不等于定论）</div>
     <div class="kv"><b>取格依据</b>${esc(gj.basis)}</div>
     <div class="kv"><b>格局候选</b>${gj.cands.map(x=>`${esc(x.name)}（月令${['本气','中气','余气'][x.k]}·${x.tou.length?'透于'+x.tou.map(t=>t.pos+'干').join('、'):'未透'}）`).join('；')}</div></div>`,
    '例：失令但有根有印，试算 35 分偏弱候选；食神格成立与否尚缺条件，先列争点。',
    '<p>合格写法必须包含：三栏各自的证据、至少一个争点、以及"什么证据会让我改判"。</p><p>能写"本盘从格条件不足，暂按普通格局处理"比硬判一个格局强。</p>',
    '只数五行个数；或跳过旺衰直接取用神——后面的运年判断会全错。','L56')+

   workStep('取格局',6,'强弱是力气，格局是骨架。先看月令本气给了什么，再看它透不透、有没有救。',
    `<div class="work-data"><div class="kv"><b>月令</b>${esc(c.pillars[1][1])} 月 · 本气 ${esc(c.details[1].hidden[0].stem)}（${esc(c.details[1].hidden[0].god)}）· 中气 ${esc(c.details[1].hidden[1]?c.details[1].hidden[1].stem+c.details[1].hidden[1].god:'无')} · 余气 ${esc(c.details[1].hidden[2]?c.details[1].hidden[2].stem+c.details[1].hidden[2].god:'无')}</div>
     <div class="kv"><b>取格依据</b>${esc(gj.basis)}</div>
     <div class="kv"><b>候选</b>${gj.cands.map((x,i)=>`${i===0?'①':'②'}${esc(x.name)}（月令${['本气','中气','余气'][x.k]}，${x.tou.length?'透于'+x.tou.map(t=>t.pos+'干').join('、'):'未透'}）`).join(' ')}</div>
     <div class="kv"><b>成格三问</b>①月令本气有没有透到天干？②透出来的字有没有被合、被冲、被克？③有没有一个字来接（救应）？三问缺一，只能算「有力」，不能算「成格」。</div></div>`,
    '例：月令本气为伤官，年干透出、无合无冲，时干见印来接——可写「伤官配印，成格有救，但印被财隔，救得不彻底」。',
    `<p>合格写法：先写月令本气与透藏，再写"成在哪一问、缺在哪一问"，最后写一句"我按哪个格看"。</p><p>参考（本盘）：<b>${esc(gj.primary.name)}</b>——${esc(gj.primary.condition)}</p><p class="micro-note">透干情况：${esc(gj.primary.tou&&gj.primary.tou.length?gj.primary.tou.map(t=>t.pos+'干').join('、'):'本气未透')}。未透不等于不成格，只说明这张盘的力量更多藏在地支里。</p>`,
    '见月令有字就报一个格名，不问透不透、不看有没有被破——这是查表，不是取格。','L15')+

   workStep('定喜忌',7,'格局定了骨架，喜忌定方向。这一步必须给出明确答案：喜什么、忌什么、为什么。',
    `<div class="work-data"><div class="kv"><b>判定</b>${esc(ys.line)}</div>
     <div class="kv"><b>为什么</b>${esc(ys.why)}</div>
     <div class="kv"><b>喜用</b>${esc(ys.favor)}　→　用神取 ${esc(ys.favorGods||'—')}；${esc(ys.elements)}</div>
     <div class="kv"><b>忌神</b>${esc(ys.avoid)}　→　${esc(ys.avoidGods||'—')}</div>
     <div class="kv"><b>调候</b>${esc(ys.climate)}</div>
     ${ys.conflict?`<div class="kv"><b>两法冲突</b>${esc(ys.conflict)}</div>`:''}
     ${ys.tongguan?`<div class="kv"><b>通关</b>${esc(ys.tongguan)}</div>`:''}
     <div class="kv"><b>改判条件</b>${esc(ys.reverse)}</div></div>`,
    '例：判身弱，喜印比（土金），忌财官食伤（木火水）；调候要火但火为官杀，按"先救急再扶抑"处理。',
    `<p>合格写法四行：判什么、凭什么、喜什么、什么情况下改判。四行缺一行，后面论运就没有尺子。</p><p class="micro-note">本页口径：≥52 判强，≤44 判弱，中间按中和；调候优先于扶抑；两法打架时先救急。</p>`,
    '只写"身弱喜印比"却不写为什么弱、也不写什么时候会改判——这种结论经不起追问。','L58')+

   workStep('分宫读事',8,'同一十神落在不同宫位，事应完全不同。星与宫必须同时说。',
    `<div class="work-data"><div class="palace-grid">${ps.map(p=>`<div class="palace-item ${p.index===2?'day':''}"><div class="palace-top"><b>${esc(p.pos)}</b>${pairHTML(p.pillar,'palace-pillar')}</div><div class="palace-scope">${esc(p.scope)}</div></div>`).join('')}</div>
     <div class="kv"><b>六亲星位置</b>${[
       ['婚姻',c.input.gender==='male'?'财星':'官杀',R.occurrences(c,c.input.gender==='male'?'wealth':'power')],
       ['事业', '官印食伤', [...R.occurrences(c,'power'),...R.occurrences(c,'resource'),...R.occurrences(c,'output')]],
       ['父母', '财印', [...R.occurrences(c,'wealth'),...R.occurrences(c,'resource')]],
       ['子女', c.input.gender==='male'?'官杀':'食伤', R.occurrences(c,c.input.gender==='male'?'power':'output')],
       ['同辈', '比劫', R.occurrences(c,'peer')]
     ].map(([n,g,o])=>`${n}（${g}）：${R.list(o)}`).join('<br>')}</div>
     <div class="kv"><b>取用三法</b>调候：${esc(tm.tiaohou)}｜扶抑：${st.total} 分 ${esc(st.grade)}｜通关：${tm.tongguan.length?tm.tongguan.map(x=>x.pair+'→以'+x.mid+'通关（'+x.status+'）').join('；'):'未见明显两行相战'}</div></div>`,
    '例：婚姻看财星在年干透出并藏于时支，日支巳为夫妻宫，藏正官——星与宫各说一半，须再论承接。',
    '<p>合格写法：每个议题先写星在哪、再写宫是什么、再写两者的条件，最后写"不能断定什么"。</p><p>只用星不看宫，或只用宫不看星，都会漏一半。</p>',
    '见财星就断婚、见官星就断升职；把"星出现"等同于"事情发生"。','L61')+

   workStep('事业、财运、婚恋的落点',9,'同一组十神落在不同宫位、不同强弱上，答案完全不同。这一步把结构翻成人话。',
    `<div class="work-data"><div class="kv"><b>明面十神轻重</b>${X.tenGodEnergy(c).list.slice(0,5).map(x=>`${x.god}${x.val}`).join('　')}</div>
     <div class="kv"><b>事业</b>输出 ${esc(R.list(R.occurrences(c,'output')))}；约束 ${esc(R.list(R.occurrences(c,'power')))}；支持 ${esc(R.list(R.occurrences(c,'resource')))}</div>
     <div class="kv"><b>财运</b>财星 ${esc(R.list(R.occurrences(c,'wealth')))}；同辈分配 ${esc(R.list(R.occurrences(c,'peer')))}</div>
     <div class="kv"><b>婚恋</b>${c.input.gender==='male'?'财星':'官杀'} ${esc(R.list(R.occurrences(c,c.input.gender==='male'?'wealth':'power')))}；日支 ${pairHTML(c.pillars[2])}</div></div>`,
    '例：事业走食伤输出＋印星支持，先做能出作品、能被评价的活；财星在时支不透，钱要靠手艺慢慢攒，别指望机会财。',
    `<p>合格写法：每个议题写三句——星在哪、宫是什么、条件够不够，最后补一句"不能断定什么"。</p><p>参考（本盘）：事业以${esc(ys.favGroups.includes('output')?'输出':'')}${esc(ys.favGroups.includes('resource')?'支持':'')}${esc(ys.favGroups.includes('power')?'约束':'')}为喜用方向；婚恋看${esc(c.input.gender==='male'?'财星与日支':'官杀与日支')}，星宫要分开说。金额、职位、婚期不在这里下判断——算不出来。</p>`,
    '见财断富、见官断贵、见冲断离——把符号直接当事件。','L63')+

   workStep('接大运',10,'原局定有没有，大运定推不推上台面，流年定触不触发。顺序不能倒。',
    `<div class="work-data"><div class="kv"><b>起运</b>${c.luck.forward?'顺行':'逆行'} · 出生后 ${c.luck.years}年${c.luck.months}月${c.luck.days}日${c.luck.hours}时 起运 · 交运 ${esc(localString(c.luck.startUTC))}</div>
     <div class="kv"><b>当前选取</b>第${state.luckIndex+1}步 ${esc(row.pillar)} · ${row.year}年起 · ${esc(row.detail.god)}</div>
     <div class="kv"><b>${year} 流年</b>${Z.annual(year)} · 相对日主为${Z.god(c.dayMaster,Z.annual(year)[0])}</div>
     <div class="kv"><b>岁运互动</b>${flags.length?flags.map(f=>f.type+'（'+f.level+'）').join('；'):'未检出伏吟、反吟、岁运并临'}</div></div>
     <p class="micro-note">写应期时要能回答三问：原局有没有这个结构？这一步大运有没有把它推到台面？这一年的流年有没有扣动扳机？三问缺一个，都不能断事。</p>`,
    '例：原局有财无承接，2031 起乙酉运财星得地，2034 甲寅年与原局形成…——三层齐全才可列为候选窗口。',
    '<p>合格写法：三层各一句，并给出"如果不对，最可能错在哪一层"。</p><p>能说出"某年是候选窗口，但仅为候选"比断言必然发生更专业。</p>',
    '只按公历元旦归运；或只看流年干支，不看它在哪步大运里。','L44')+

   workStep('断流年',11,'大运给舞台，流年扣扳机。挑一年，把"为什么是这一年"说清楚。',
    (()=>{const yy=(row.years||[]).find(y=>y.year===new Date().getFullYear())||(row.years||[])[0];const yr=yy?D.yearOne(c,row,yy,ys):null;return `<div class="work-data"><div class="kv"><b>取年</b>${yy?`${yy.year} ${yy.pillar}（${yy.detail.god}）· 判「${yr.tone}」`:'本运无可用流年'}</div>
     ${yr?`<div class="kv"><b>流年 vs 大运</b>运干 ${esc(row.detail.god)}／流年干 ${esc(yr.god)}${yr.lines[2]?`<br>${esc(yr.lines[2])}`:''}</div>
     <div class="kv"><b>与原局</b>${esc(yr.lines[3]||'未见明面关系')}</div>
     <div class="kv"><b>细断</b>${yr.lines.slice(1,5).map(x=>esc(x)).join('<br>')}</div>`:'<p class="micro-note">这一步需要先选一步大运。</p>'}</div>`;})(),
    '例：2026 丙午，正官年，与日支午午自刑——岗位或责任会有动作，但压力落在自己与伴侣这一层，不是子女。',
    `<p>合格写法：先写这一年是什么十神、判顺逆；再写它与大运、与原局的关系落在哪一宫；最后写一句可证伪的话。</p><p>本页口径：流年干看事类，流年支看落点；与大运同气＝同一件事被推两次；冲日支先看关系与自身，不先看子女。</p>`,
    '只说"今年官杀旺，注意压力"，不说是哪一层、怎么算应——这种话谁都能说。','L74')+

   workStep('出结论',12,'批盘的终点不是说得准，是让对方能听懂你的推理，并能反驳。',
    `<div class="work-data"><div class="kv"><b>交付前自查</b></div><div class="checklist-inline">
       <span>□ 每个结论都能指回盘面哪一个字</span><span>□ 没出现"必然""一定""肯定"</span><span>□ 写了至少一条反证或例外</span><span>□ 没碰生死、重病、子女数量、投资标的、诉讼胜负</span><span>□ 未核项已标明"该项未核"</span><span>□ 当事人能复述你的推理</span></div>
     <div class="kv"><b>输出模板</b>① 已核的输入与口径 ② 盘面事实（不含解释） ③ 结构判断与争点 ④ 分议题的条件式结论 ⑤ 时间窗口（候选，非断言） ⑥ 未核项与建议补充的资料</div></div>`,
    '把这一段写成给当事人看的六段话，不要写成笔记。',
    '<p>合格标准：外行读完能说出"你为什么这么讲"，而不只是记住结论。</p><p>结论里出现绝对化措辞，就是不合格。</p>',
    '把话说满以显得权威；或反过来只讲术语不讲人话。','L45')+

   `<div class="card work-summary"><h3>本次带练进度 ${done} / 12</h3><p class="micro-note">作业存在本机浏览器，换设备不跟随。做完十二步可以导出详批对照，看程序给的条件与你自己写的差在哪。</p><div class="actions"><a class="button" href="#analysis">对照八字详批 →</a><a class="button" href="#chart">换一张盘 →</a></div></div>`;

   return head('批盘带练','对着真实盘面走完十二步；每步都有这张盘的具体数据、该写什么、合格标准与常见错法。','PRACTICE · 十二步批盘')+workAutoHTML(c)+`<div class="work-layout"><aside class="card work-toc"><h3>十二步索引</h3>${['收资料','定盘','标注盘面','验盘','定强弱','取格局','定喜忌','分宫读事','事业财运婚恋','接大运','断流年','出结论'].map((n,i)=>`<a href="#work" data-scroll="work-${i+1}">${String(i+1).padStart(2,'0')} ${n}</a>`).join('')}<small>顺序不可跳：不知道用神方向，就无法判断某个流年是帮还是耗。</small></aside><div class="work-main">${s1}</div></div>`;
 }

 function chartResultsHTML(){
   const c=state.chart;
   if(state.error)return `<div class="card empty"><h3>还不能起盘</h3><p>${esc(state.error)}</p></div>`;
   if(!c)return `<div class="card empty"><h3>从一张命盘开始</h3><p>填写出生信息，选择计算口径后起盘。</p></div>`;
   return `${!c?'<div class="card empty"><h3>从一张命盘开始</h3><p>填写出生信息，选择计算口径后起盘。</p></div>':c.unknownTime?unknownHTML(c):`<div class="results-column">${warningHTML(c)}<section class="card"><div class="chart-summary"><div><h2>${esc(c.input.name)} ${tag(c.input.gender==='male'?'乾造':'坤造')}${c.input.demo?tag('教学示范','green'):''}</h2><div class="chart-meta"><span>公历 <b>${esc(c.civil.slice(0,16))}</b></span><span>${esc(c.input.place)} · ${esc(c.input.timezone)}</span></div><div class="chart-meta"><span>农历 ${esc(c.lunar)} <span title="按同一瞬间的北京时间日期展示">（UTC+8）</span></span></div></div><span class="tag green">本机计算</span></div><div class="chart-settings"><span>${clockName(c)}</span><span>${Number(c.input.dayBoundary)===23?'23点':'0点'}换日</span><span>立春换年 · 十二节换月</span></div>${chartViewTabs()}<div id="chart-body">${state.chartView==='pro'?chartTablePro(c)+luckStartHTML(c)+stripsHTML(c):chartTable(c)}</div><div class="chart-caption"><span>日时计算读数：${esc(c.clock)}${c.input.clock==='true'?' · 均时差 '+c.correction.toFixed(2)+'分':''}</span><button class="text-button" data-action="calculation-details">计算依据 ↗</button></div></section>${solarCard(c)}${luckHTML(c)}<div class="below-grid">${elementsHTML(c)}${relationsHTML(c)}</div><div class="below-grid">${strengthScoreCard(c)}${gejuCard(c)}</div><div class="below-grid">${shenshaCard(c)}${energyCard(c)}</div><div class="below-grid">${palaceCard(c)}${threeMethodsCard(c)}</div>${checklistHTML(c)}<div class="analysis-cta"><div><h3>从命盘，读到命理</h3><p>分清计算事实与传统解释，按步骤展开这张命盘。</p></div><div class="actions"><a href="#analysis" class="button primary">查看八字详批 →</a><a href="#ai" class="button ai-jump">✦ AI 批盘</a></div></div></div>`}`;
 }
 function chartHTML(){
   return head('八字排盘','由出生信息起盘，让每一个干支都有据可循。','CHART · 四柱八字',btn('↻ 载入示例','demo')+btn('↓ 导出命盘','export-json')+btn('＋ 保存命盘','save',true))+`<div class="two-col">${formHTML()}<div id="chart-results">${chartResultsHTML()}</div></div>`;
 }
 const godMeanings={比肩:['自主与同伴','传统上借同类关系讨论自主、协作和资源边界。'],劫财:['合作与分配','传统上用来讨论同伴参与、竞争与资源分配。'],食神:['积累与输出','传统象义常围绕持续产出、技能表达和成果沉淀。'],伤官:['表达与创新','传统象义常讨论表达、创新与规则之间的关系。'],偏财:['外部资源','传统语境常借此讨论外部机会、流动资源与经营。'],正财:['经营与兑现','传统语境常讨论资源管理、稳定经营与成果兑现。'],七杀:['压力与执行','传统语境常讨论约束、压力与处理挑战的方式。'],正官:['秩序与责任','传统语境常讨论规则、角色责任与组织要求。'],偏印:['研究与转化','传统语境常讨论专门学习、非标准知识与支持。'],正印:['学习与支持','传统语境常讨论学习、资质、文献与支持系统。']};
 function baseReportSections(c){
   const d=c.dayMaster,e=Z.element(d),season=Z.seasonal(c.pillars[1][1]),month=c.details[1],main=month.hidden[0],positions=['年干','月干','日干','时干'];
   const visible=c.details.filter((p,i)=>i!==2),vg=visible.map(p=>p.god);
   const rootText=c.roots.length?c.roots.map(r=>`${r.position}支藏${r.stems.join('、')}`).join('；'):'四个地支所藏中未见与日主同五行的天干';
   const reveals=month.hidden.map(h=>{const at=c.details.map((p,i)=>p.stem===h.stem?positions[i]:null).filter(Boolean);return `${h.stem}（${h.god}）${at.length?'透于'+at.join('、'):'未见同字透出'}`;}).join('；');
   const findGod=names=>{const a=[];c.details.forEach((p,i)=>{if(i!==2&&names.includes(p.god))a.push(`${positions[i]}${p.stem}为${p.god}`);p.hidden.forEach(h=>{if(names.includes(h.god))a.push(`${['年','月','日','时'][i]}支藏${h.stem}为${h.god}`);});});return a;};
   const wealth=findGod(['正财','偏财']),officer=findGod(['正官','七杀']),output=findGod(['食神','伤官']),resource=findGod(['正印','偏印']);
   const contains=(arr)=>vg.some(g=>arr.includes(g));const chains=[];
   if(contains(['食神','伤官'])&&contains(['正财','偏财']))chains.push('天干同时见食伤与财，可进一步研读“输出如何承接资源”的生克链；是否形成有效的食伤生财结构仍需条件核查。');
   if(contains(['正官','七杀'])&&contains(['正印','偏印']))chains.push('天干同时见官杀与印，可讨论约束、学习支持之间的关系；仅有两类十神并不足以认证官印相生成格。');
   if(contains(['伤官'])&&contains(['正官']))chains.push('天干同见伤官与正官，传统会关注表达与规则的制约关系；须进一步看位置、根气和是否有其他生克路线。');
   if(!chains.length)chains.push('可见天干未满足本页列举的三种组合入口。进一步分析应回到每个藏干、位置与月令，不为凑结论强贴格局名称。');
   const relations=R.relationFacts(c.pillars).map(r=>`${r.positions}：${r.pair}${r.type}`).join('；')||'未检出本页固定关系表中的组合';
   const detailGods=visible.map(p=>`${p.stem}为${p.god}，${godMeanings[p.god][1]}`).join('');
   const lr=selectedLuck();
   return [
     {id:'foundation',title:'先核命盘与计算口径',fact:`公历记录 ${c.civil}，${c.input.timezone}，UTC偏移 ${c.offsetMinutes/60}小时。四柱：${c.pillars.join('、')}。`,paragraphs:[`这份详批以${clockName(c)}计算日时柱，采用${Number(c.input.dayBoundary)===23?'23:00':'00:00'}换日。${Number(c.input.dayBoundary)===23?'23时段已经进入次日。':'晚子时按'+(c.input.ziStem==='same'?'当日':'次日')+'日干起时干。'}年、月柱以同一UTC瞬间与立春、十二节比较。`,`这一步先处理命盘是否成立。你当前的出生地经度为${c.input.longitude}°${c.input.clock==='civil'?'，民用钟表时模式未使用经度修正。':c.solar?`，经度时差${signed(c.solar.longitudeCorrection)}分、均时差${signed(c.solar.eotMinutes)}分，合计${signed(c.solar.longitudeCorrection+c.solar.eotMinutes)}分，真太阳时为${c.solar.trueWall}（钟表时${c.solar.clockWall}）。${c.hourCompare?.hourChanged?`校正使时柱由钟表时的${c.hourCompare.civil[3]}变为${c.pillars[3]}，本次采用的是校正后结果。`:'校正后时柱未变。'}`:'，属于所输入的地点参数；城市中心经度不能代替精确出生地点。'}若原记录有时间误差，后面的十神和结构解释也需要随候选盘重新核对。`],reflection:'如果这不是教学示例，请先核对出生记录、时区和时间精度，再阅读下文。'},
     {id:'month',title:'日主与月令：先看所处时令',fact:`日主${d}，属${Z.polar(d)}${e}；生于${month.branch}月，归入${season}令阅读。月令本气${main.stem}，相对于日主为${main.god}。`,paragraphs:[`就这张盘而言，阅读的起点是“${d}${e}在${month.branch}月”，而不是先数哪一种五行最多。月令本气为${main.stem}${main.element}，与日主的关系落在${main.god}这一类，因此可以从这一语境查阅格局材料。`,`这里给的是月令本气的阅读入口。月令全部藏干还包括${month.hidden.map(h=>h.stem+'（'+h.god+'）').join('、')}，是否透出、相互制约以及整盘根气都要继续看。不能凭这一句便认定已经成格，也不能把某一星名直接当作你的性格或命运。`],source:'BK01-L148-C0',reflection:'阅读重点：你是否能分清“月令本气是什么”与“整盘是否成格”？'},
     {id:'roots',title:'根气与扶助：不以数量定强弱',fact:`日主同五行根气候选：${rootText}。`,paragraphs:[`这张盘中，${c.roots.length?`可以在${c.roots.map(r=>r.position+'支').join('、')}找到日主同五行的藏干`:'按本页固定藏干表，没有检出日主同五行根气'}。这是可以查表复核的结构事实。根在本气还是余气、位置远近及是否受冲合，都不能被一个“有根”标签代替。`,`支持日主的印星线索为：${resource.length?resource.join('；'):'本页所列天干与藏干中未检出印星'}。这提供生扶关系的观察入口，但本页的加权试算虽然给出百分制分数，但那套权重是本页自定的，只用于把月令、通根、明干帮扶三项放在同一把尺上比较，不是传统定论，也不输出唯一扶抑喜忌。旺衰仍需把月令深浅、根气实效与全局生克放在一起讨论，分数只作为工作假设的起点。`],source:'BK01-L128-C0',reflection:'不要把“未见同类根气”直接翻译成“能力差”，也不要把“有印”当作学历事实。'},
     {id:'structure',title:'透藏与格局候选：逐字核对',fact:`月令藏干的透出情况：${reveals}。`,paragraphs:[`盘面天干除日主之外为${c.details.map((p,i)=>i!==2?`${positions[i]}${p.stem}（${p.god}）`:null).filter(Boolean).join('、')}。透干要按同一个字来查，不能把同五行的另一天干当作同字透出。`,...chains,`本页以月令结构为主线，不把调候之用、扶抑之喜忌和格局用神混成同一项。对于从格、化气格、成格与破格，现阶段保留条件说明，不给未经师资审核的自动认证。`],source:'BK01-L148-C0',reflection:'对每个候选都应继续问：支持条件有哪些，什么现象会推翻这个判断？'},
     {id:'climate',title:'寒暖与用神：分别提出判断问题',fact:`${d}${e}生于${month.branch}月，按${season}令研读；盘中明干为${c.details.map(p=>p.stem+p.element).join('、')}。`,paragraphs:[`先从季节提出问题：${season==='冬'?'冬令的传统阅读常关注寒暖与生发条件，但有火字不等于暖局条件已经成立。':season==='夏'?'夏令的传统阅读常关注炎燥与润泽条件，但有水字不等于调候条件已经满足。':season==='春'?'春令的传统阅读常关注生发与余寒、湿润的具体阶段，寅、卯、辰并不能混为一谈。':'秋令的传统阅读常关注收敛、燥湿及季节深浅，申、酉、戌需要分别讨论。'}这张盘还须把${rootText}这些根气线索合在一起看。`,`再区分“用神”指什么。月令格局语境以${main.god}作为阅读入口；扶抑要讨论日主生扶与耗泄的条件；调候要讨论寒暖燥湿。三个问题可能牵涉不同五行，不能用一个“缺什么补什么”的答案全部代替。`,`本页把这些判断条件留在明处，暂不给未经审核的唯一喜用认证。若进一步查阅《穷通宝鉴》等材料，应定位${d}日、${month.branch}月对应段落，再看全局是否满足前提；不能只摘一句季节口诀。`],reflection:'研读任务：分别写出月令结构、扶抑、调候三个问题；标明目前已经核出的条件和缺少的条件。'},
     {id:'relations',title:'合冲刑害破：有关系，也要有条件',fact:relations+'。',paragraphs:[`以上按固定配对表核出，是这张原局的结构关系。五合与六合只记录相合，尚未判断是否化成另一种五行；三合、三会齐见也仍需要月令、透干等条件。`,`传统详批常从这些关系讨论生克路线是否改变。本页不从一个冲字直接推出搬家、分手或受伤，也不把相刑标签翻译成灾祸。先把涉及的位置、字和关系核对清楚，再查整段论述。`],reflection:'如果你在别处看到某个断语，请核对它用的是同一套相刑、合化规则，而不是仅仅出现相同的字。'},
     {id:'expression',title:'处事与表达：作为自我观察的线索',fact:`可见十神：${c.details.map((p,i)=>i!==2?`${positions[i]}${p.god}`:null).filter(Boolean).join('、')}。`,paragraphs:[detailGods,`把这些象义用于自我观察时，更有帮助的问题是：在需要表达意见时，你如何同时照顾事实与规则？在合作时，资源和责任是否说明白？这些问题可由实际经历检验，不要求你先接受某种固定性格标签。`,`本页不会仅因某星出现便写“你天生强势”“你必然内向”。如果某段传统象义与你的经历不符，应如实记为不符，而不是重新解释到总能套上。`],reflection:'记录一个符合与一个不符合的具体经历。保留反例比只挑说中的部分更有学习价值。'},
     {id:'work',title:'事业与学习：读结构，再落到选择',fact:`食伤线索：${output.length?output.join('；'):'未检出'}。官杀线索：${officer.length?officer.join('；'):'未检出'}。`,paragraphs:[`在传统象义中，食伤常联系技能与输出，官杀常联系约束与职责，印常联系学习和支持。就这张盘的已列事实，可以把“输出—规则—学习支持”作为复盘框架，观察你怎样形成成果、怎样接受反馈。`,`更具体的职业决定应结合专业能力、兴趣、行业机会和实际试做结果。建议选择一个现有项目，分别写清你的产出、评价标准和需要补的知识，再用完成情况评估下一步。命盘不会自动给出唯一职业，也不能替代现实调查。`],reflection:'实践任务：用一页纸列出可展示的成果、需要遵守的标准、以及下一项学习计划。'},
     {id:'wealth',title:'财务与合作：先看资源如何使用',fact:`财星线索：${wealth.length?wealth.join('；'):'在本页固定藏干和天干表中未检出财星'}。`,paragraphs:[`财星在这里是“日主所克”的关系名。${wealth.length?'它在盘中出现，说明有对应的五行关系可讨论，不表示已经证实拥有财富。':'未检出财星，也不能直接解释为没有收入或缺少经营能力。'}看财还需要联系食伤、比劫、印等生克路线，不能把财星数量等同于资产。`,`如果把这部分用于现实复盘，可以检查收入来源、支出预算、合作分成和合同责任是否清楚。任何投资、借贷或大额支出都应依据真实风险和现金流判断；本页不提供由干支推导的收益数额或买卖时点。`],reflection:'可核查的问题：合作中的贡献、报酬和退出约定是否已经写清？'},
     {id:'relationships',title:(c.input.gender==='male'?'男命':'女命')+'：伴侣星、夫妻宫与六亲取法',fact:`本盘传统参数为${c.input.gender==='male'?'男命 / 乾造，以财星为伴侣阅读入口':'女命 / 坤造，以官杀为伴侣阅读入口'}。星的线索：${(c.input.gender==='male'?wealth:officer).join('；')||'未检出，不等于现实没有伴侣'}。共同夫妻宫日支${c.pillars[2][1]}，藏${c.details[2].hidden.map(h=>h.stem+'（'+h.god+'）').join('、')}。`,paragraphs:[`按本课采用的传统${c.input.gender==='male'?'男命财星法，先分正财偏财的位置、透藏与根气，再将财星和日支的关系分开看。偏财不是外遇事实，正偏财同见也不等于必有多段婚姻':'女命官杀法，先分正官七杀的位置、透藏与制化，再看日支。官杀同见不是品德评价，伤官与官同现也不能直接证实婚姻不幸'}。这些是历史六亲象义约定，不改变日主十神算法，也不证明现代伴侣的性别、身份或行为。`,`星与宫分开记录，再检查合冲的实际位置、财印食伤等路线与作用条件。日支有合冲只是关系事实，不等于某年一定结婚、离异或发生不忠；未见对应星也不等于现实无伴侣。`,`子息另须声明取法。部分传统男以官杀、女以食伤为入口，其他文本有阳干长生及不同映射；不能混用后得出确定人数、性别或生育能力。学业、事业与资源仍按共同的月令、根气、透藏方法完整分析。`,`可结合真实生活核对沟通、责任分担、金钱约定与冲突修复。对他人的判断要基于行为和证据；传统术语不能代替对方的实际说明。男女完整示范、流派分歧和同生对照在第31—41讲与整盘实训中。`],reflection:'先核本段标明的男女参数与传统取法，再分别列星、宫、作用条件和现实待核问题。'},
     {id:'timing',title:'大运与流年：变化来自哪一层',fact:`${c.luck.forward?'顺':'逆'}行，取${c.luck.term.name}，出生与该节相差${c.luck.gapMinutes}整分钟；折${c.luck.years}年${c.luck.months}月${c.luck.days}日${c.luck.hours}时起运。`,paragraphs:[`当前点选大运为${lr.pillar}，从出生地时间${localString(lr.startUTC)}开始，至${localString(lr.endUTC)}前结束。其天干${lr.pillar[0]}相对于日主为${Z.god(d,lr.pillar[0])}。可在排盘区点选另一运，再回到这里比较。`,`运与年是在原局上增加讨论层次，不能脱离原局只凭一个流年字判成败。起运算法、历日加法和岁数口径都已声明；本页采用折算年龄与确切交运时刻，不用公历年份一刀切归运。`,state.annualYear?`${state.annualYear}年柱为${Z.annual(state.annualYear)}，此处指立春后的命理年；要看某一天是否已进入该年与该运，仍须比较瞬间。`:'在排盘区点选流年，可查看该年与原局新增的基础关系。这类列举是结构观察，尚非经过独立检验的事件预测。'],reflection:'做年度研读时先写下规则和观察窗口，再记录符合、不符合与无法判断的情况。'},
     {id:'limits',title:'收束：已经知道什么，还需核什么',fact:`本次已计算四柱、藏干、十神、基础关系与起运折算。${c.warnings.length?'同时保留'+c.warnings.length+'条输入或边界提示。':'未触发当前设置下的边界提示；这不等于出生记录已被核实。'}`,paragraphs:[`这份报告的目标是让你看见这张盘的组成和阅读步骤。古籍网络整理本仍需校勘，复杂格局仍需师资审核，现有案例没有完成独立预测有效性验证。数据量、文字篇幅与程序测试通过，都不能替代这些审核。`,`若你希望继续研习，建议先完成“十神相对关系”“透干与通根”“三种用神语境”三课，再用同一份输入逐步复盘。若要实际使用，请保留原始资料，核对不确定时间，并把解释与真实经历分别记录。`],reflection:'不确定的地方可以明确留下；详细不等于把未知也说成确定。'}
   ];
 }

 function catCaseCard(c){
   const r=caseChart(c);
   return `<article class="case-card cat-case"><header class="case-head"><b>${esc(c.id)} ${esc(c.name)}</b><span class="case-kind">${esc(c.catName)}</span><span class="case-meta">${esc(c.birth.gender==='male'?'乾':'坤')} · ${esc(c.birth.date)} ${esc(c.birth.time)} · ${esc(c.birth.place)}</span></header>
    ${r?`<div class="case-chart">${r.pillars.map((x,i)=>`<span class="cc-item">${pairHTML(x)}<em>${['年','月','日','时'][i]}</em><small>${esc(r.details[i].god)}</small></span>`).join('')}</div>`:''}
    <div class="case-tags">${(c.tags||[]).map(t=>`<i>${esc(t)}</i>`).join('')}</div>
    <div class="case-block"><b>判读示范</b><p>${esc(c.reading)}</p></div>
    <div class="case-block chain"><b>推理链</b><p>${esc(c.chain)}</p></div>
    <div class="case-block limit"><b>边界</b><p>${esc(c.limits)}</p></div>
   </article>`;
 }
 function categoryCasesHTML(){
   const gs=C.caseGroups||[];if(!gs.length)return '';
   const all=C.teachingCases||[];
   return `<section class="card tc-library" id="cat-cases" style="margin-top:22px"><div class="card-head"><h2 class="card-title">分类教学盘 · ${gs.length} 类 × 5 盘</h2><span class="card-kicker">每类五盘，配判读与反证</span></div>
    <p class="micro-note">按结构检索生成，四柱与分数由本页引擎现算，不含生平事件。每一类给五盘，是为了让你看到「同一个结构在不同盘上长什么样」——同一句结论，落到不同日主、不同宫位上，写法可以完全不同。下面是分类索引，点类别可直接跳到该类五盘。</p>
    <div class="cat-chips">${gs.map(g=>`<a href="#cases" data-scroll="cat-${g.key}">${esc(g.name)}<i>${g.ids.length}</i></a>`).join('')}</div>
    ${gs.map(g=>`<div class="cat-group" id="cat-${g.key}"><h3 class="cat-title">${esc(g.name)}<span>${g.ids.length} 盘 · 对应 ${g.lessons.join('、')}</span></h3><div class="lesson-cases">${g.ids.map(id=>{const c=all.find(x=>x.id===id);return c?catCaseCard(c):'';}).join('')}</div></div>`).join('')}
   </section>`;
 }
 function teachingCasesHTML(){
   const cs=C.teachingCases||[];if(!cs.length)return '';
   const used={};(C.caseMap?Object.keys(C.caseMap):[]).forEach(k=>(C.caseMap[k]||[]).forEach(r=>{if(!used[r.id])used[r.id]=k;}));
   return `<section class="card tc-library" style="margin-top:22px"><div class="card-head"><h2 class="card-title">结构教学盘 · ${cs.length} 例</h2><span class="card-kicker">按结构检索生成，非真实人物</span></div><p class="micro-note">这些盘是按目标结构在 1974—2002 年的合法日期范围内检索出来的，四柱由本页引擎现算，用来练「看到这个结构该怎么写」。它们不含生平事件，也不能用来证明命理有效。每一例都标注了首次出现的讲次，点进去可看该讲的完整判读与练习。</p><div class="tc-grid">${cs.map(c=>{const r=caseChart(c);const link=used[c.id];return `<article class="tc-item"><header><b>${esc(c.id)} ${esc(c.name)}</b><span class="tc-kind">${esc(c.kind)}</span></header><div class="tc-pillars">${r?r.pillars.map((x,i)=>`<span>${pairHTML(x)}<em>${['年','月','日','时'][i]}</em></span>`).join(''):'—'}</div><div class="tc-meta">${esc(c.birth.gender==='male'?'乾':'坤')} · ${esc(c.birth.date)} ${esc(c.birth.time)} · ${esc(c.birth.place)}</div><div class="case-tags">${(c.tags||[]).map(t=>`<i>${esc(t)}</i>`).join('')}</div><details><summary>展开判读示范</summary><p>${esc(c.reading)}</p><p class="tc-chain"><b>推理链</b>${esc(c.chain)}</p><p class="tc-limit"><b>边界</b>${esc(c.limits)}</p></details>${link?`<a class="source-link" href="#learn/${esc(link)}">在 ${esc(link)} 中研读 →</a>`:''}</article>`;}).join('')}</div></section>`;
 }
 function casesHTML(){return head('命例研读','示范盘用于练方法，文献样本用于练证据；如实保留未知。','CASES · 证据与推演')+`<div class="warning" style="margin-bottom:22px">目前没有完成独立预测验证的案例。下列样本不用于宣称命理准确率；公开人物生平已知，属于回顾研读。</div><div class="case-grid"><article class="card case-card">${tag('可复算教学示例','green')}<h3>一张盘，从识字到结构</h3><div class="case-params">2005-12-23 08:37 · UTC+8 · 民用钟表时<br>乙酉　戊子　辛巳　壬辰</div><p>从辛日见乙为偏财、见戊为正印、见壬为伤官开始，练习将所有藏干都相对于同一日主换算。此为程序回归示例，未声称属于真实人物。</p><button class="button primary" data-action="demo">载入示范命盘 →</button></article><article class="card case-card">${tag('流派分歧教学')}<h3>23:30，为何出现不同日柱</h3><div class="case-params">1988-02-15 23:30 · UTC+8<br>午夜换日：庚子日　｜　23点换日：辛丑日</div><p>将换日设置与晚子时起时干分别调整，查看日柱和十神如何联动。比较规则，保留两种明确口径。</p><button class="button" data-action="zi-demo">载入晚子时示例 →</button></article>${C.caseFacts.map(c=>`<article class="card case-card">${tag('机构文献事实样本')}<h3>${esc(c.name)}</h3><div class="case-params">出生日期：${esc(c.birth.date)}<br>时刻：${esc(c.birth.time||'未知，不补造')} · ${esc(c.birth.place)}</div><p>${esc(c.review_status)}</p><p>${esc(c.reason)}</p><a class="source-link" target="_blank" rel="noreferrer" href="${safeUrl(c.birth.source)}">查看出生资料来源 ↗</a>${c.events.map(e=>`<p class="micro-note">${esc(e.date)} · ${esc(e.fact)} <a class="source-link" href="${safeUrl(e.source)}" target="_blank" rel="noreferrer">原始来源 ↗</a></p>`).join('')}<p class="micro-note">未作为独立预测验证；不把人物生平反推成已验证断法。</p></article>`).join('')}</div>${teachingCasesHTML()}${categoryCasesHTML()}`;}
 function savedHTML(){return head('我的命盘','只在当前浏览器保存；可导出备份后再继续研习。','RECORDS · 本机收藏',btn('↓ 导出全部备份','export-saved'))+`${state.saved.length?state.saved.map(s=>`<article class="card saved-row"><div><h3>${esc(s.input.name)}</h3><p>${esc(s.input.date)} ${esc(s.input.unknownTime?'时刻未知':s.input.time)} · ${esc(s.input.place)} · ${esc(s.input.timezone)}</p></div><div class="actions"><button class="button primary small" data-load="${s.id}">打开命盘</button><button class="button small" data-delete="${s.id}">移除收藏</button></div></article>`).join(''):'<div class="card empty"><h3>留下一张值得研习的命盘</h3><p>在排盘页点击“保存命盘”，下次可在这里继续。浏览器清理可能清除记录，重要内容请导出备份。</p><a class="button primary" href="#chart">去排盘 →</a></div>'}<section class="card about-copy" style="margin-top:20px"><h2>从备份继续</h2><p>可导入本网页导出的单盘文件或命盘备份。导入后仍按当前版本重新计算，不执行文件中的任何代码。</p><label class="button">导入 JSON 备份<input id="import-file" type="file" accept="application/json,.json" style="display:none"></label></section>`;}
 function aboutHTML(){return head('计算与依据','知道程序算了什么，也知道哪些问题仍需核查。','METHOD · 有据可循')+`<section class="card about-copy"><h2>本机运行，四个独立模块</h2><p>八字排盘由固定版本历法库与时间处理程序计算；八字详批由这些结果和原创条件说明生成，先给结论再给依据；干支速查把散在各讲里的知识点排成表；子平学堂单独保存课程进度、笔记和练习。本版没有连接外部大模型，不上传出生资料。</p><h2>排盘采用的明确约定</h2><table class="definition-table"><tr><th>项目</th><th>本版行为</th></tr><tr><td>支持日期</td><td>1901—2099年出生日期；公历或农历输入，闰月单列</td></tr><tr><td>年、月柱</td><td>立春换年、十二节换月，统一UTC比较</td></tr><tr><td>地点与经度</td><td>省—市—区县三级联动，内置 34 个省级、358 个地级、3086 个区县的离线行政区划；选中即取行政中心经度，也可直接填海外地名（376 个城市坐标库）。区县共用所属市坐标，误差通常在 3 分钟以内，接近时辰边界时会提示复核</td></tr><tr><td>日、时柱</td><td>默认按地方真太阳时（钟表时＋经度时差＋均时差），可切换平太阳时或民用钟表时对照；支持0点或23点换日</td></tr><tr><td>真太阳时明细</td><td>逐项显示钟表时、经度时差、均时差、真太阳时与所落时辰，并对比校正前后时柱是否改变</td></tr><tr><td>排盘表</td><td>主星／天干／地支／藏干／副星／星运／自坐／空亡／纳音／神煞 十行，按问真式纵向排布；藏干标本气中气余气，副星为藏干十神，自坐为本柱天干坐本支的十二长生</td></tr><tr><td>结论与过三关</td><td>详批顶部给日主、格局、用神、性情、六亲、事业、财运、婚恋、身体、运程十项判断，标注明确／倾向／待辨；随后按「验过去—验现在—应未来」过三关，断语必须可证伪</td></tr><tr><td>神煞</td><td>18 组常用神煞，逐组标明查法口诀与命中位置；只作辅助标记，不单独断事</td></tr><tr><td>旺衰试算</td><td>月令40／通根35／天干帮扶25 的透明加权，合计100分并给出分级；权重为本页自定，可复算不等于定论</td></tr><tr><td>格局与用神</td><td>按「月令本气优先、本气不透取透出之中余气」列出取格候选与成格条件，不自动认证成败，不输出唯一喜用神</td></tr><tr><td>四柱宫位</td><td>年柱主根基与早年、月柱主父母兄弟与事业起点、日支为夫妻宫、时柱主子女晚景；宫位只作坐标，不凭一次冲合断定亲属事件</td></tr><tr><td>岁运互动</td><td>逐年检出伏吟（干支整体相同）、反吟（天干相克＋地支六冲）、岁运并临（大运与流年干支相同），并标出落在哪一宫、该柱管什么</td></tr><tr><td>取用三法</td><td>调候（寒暖燥湿）／扶抑（加权试算）／通关（十神两强相持时的中介）分栏呈现；调候按原则判断，非《穷通宝鉴》逐条照录</td></tr><tr><td>流月</td><td>按十二节排全年月建，月干依五虎遁推得，列出交节时刻；不以农历初一换月</td></tr><tr><td>晚子时</td><td>午夜换日时可另选当日或次日日干起时干</td></tr><tr><td>历史时区</td><td>当前浏览器Intl/IANA实现；回拨要求选择，前拨缺口拒绝；1970年前仍需历史文献核实</td></tr><tr><td>均时差</td><td>NOAA公开公式近似实现，未认证秒级精度；近时辰边界提示候选</td></tr><tr><td>大运</td><td>年干阴阳配男女参数定顺逆；顺取下一节、逆取上一节；分钟折算法</td></tr><tr><td>交运历日</td><td>UTC+8参考下先加年、月（月底截齐），再加日、时，最后转出生地时区</td></tr><tr><td>流年</td><td>以立春起止的一整段命理年；交运年须按具体瞬间分段</td></tr><tr><td>旺衰与关系口径</td><td>普通扶抑按得令、得地、得助、克泄耗透明初筛；天干四冲、六破、三刑自刑按基础总表声明的口径，不自动认证成化或特殊格局</td></tr><tr><td>详批范围</td><td>18节原局研读、前8步大运及每步全部立春流年；跨交运年按有效窗口分别列出</td></tr><tr><td>五行条形图</td><td>四天干+四地支本气各计1，展示数量，不能据此确定旺衰或喜用</td></tr></table><h2>参考问真的范围</h2><p>参考公开页面的四柱纵向排布、藏干与十神分层、五行着色、大运流年展开方式，另行制作本网页视觉和交互。未复制其品牌、付费课程或私人详批；尚未完成与问真实机所有设置的一致性认证。</p><h2>古籍与案例的状态</h2><p>7部核心书籍的13,448个可追溯段落供本地研读。书斋会显示网络本、行号、段落ID、质量标记与校勘状态。原文确实存在与原文足以支持某个判断是两件事；本版不会把待审段落自动升级为专家断语。</p><p>78讲包括基础总表、身强身弱、男女专题、分步讲解、示范、带练与独立作业。复杂解释与课程效果仍需具备相关能力的师资审阅和试学；目前没有完成独立预测验证的案例，不能承诺命理能准确预测人生。</p><h2>联网研究来源</h2><p>下面保存的是本次公开页面研究入口。学习其信息组织与方法层次，详批和课程文字为本项目原创。联网获取记录另存于项目的references目录。</p><ul>${C.research.map(r=>`<li><a href="${safeUrl(r.url)}" target="_blank" rel="noreferrer">${esc(r.name)} ↗</a></li>`).join('')}</ul><h2>如何继续改进</h2><p>已经补入时间歧义处理、计算口径、起运明细、原文检索、独立教学和纠错提示。人工校勘、专家复审、真实对象同意后的案例收集与独立验证，仍需实际执行，程序无法自动替代。</p><p>本地版本可以继续开发和检查；对外发布前应筛选已获授权的原文版本，并重新测试部署环境使用的时区版本与计算结果。</p></section>`;}
 function render(){document.title=titles[state.route]+' · 子平研习';$('#page-name').textContent=titles[state.route];document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===state.route));$('#main').innerHTML=({chart:chartHTML,analysis:analysisHTML,ai:aiHTML,work:workHTML,learn:lessonsHTML,tables:tablesHTML,library:libraryHTML,cases:casesHTML,saved:savedHTML,about:aboutHTML}[state.route]||chartHTML)();
   try{window.ZipingAI&&window.ZipingAI.bind(state.chart);}catch(err){console.warn('AI 面板未初始化',err);}
   localizeLessonRefs($('#main'));
   const _cl=$('.course-list'),_act=$('.lesson-button.active');
   if(_cl&&_act&&_cl.scrollHeight>_cl.clientHeight+4){_cl.scrollTop=Math.max(0,_act.offsetTop-_cl.clientHeight/2);}
 }
 /* 课程经重排后，课程编号（L56）与它在列表中的位置（第24讲）不再一致。
    界面上的交叉引用一律改写成「第N讲」，href 仍用编号，改的是可见文字。
    课程页顶部另标「第N讲 · 编号 L56」，两种说法都能对上。 */
 function lessonPosMap(){const m={};C.lessons.forEach((l,i)=>{m[l.id]=i+1;});return m;}
 function localizeLessonRefs(root){
   if(!root)return;
   const map=lessonPosMap();
   const walk=node=>{
     if(node.nodeType===3){
       const s=node.nodeValue;
       if(/L\d{2}/.test(s))node.nodeValue=s.replace(/(?<![A-Za-z0-9_\/-])L(\d{2})(?!\d)/g,(all,id)=>{
         const n=map['L'+id];
         return n?`第${n}讲`:all;
       });
     }else if(node.nodeType===1&&!['SCRIPT','STYLE','TEXTAREA'].includes(node.tagName)&&node.dataset.keep===undefined){
       [...node.childNodes].forEach(walk);
     }
   };
   walk(root);
 }
 function route(){if($('#birth-form'))state.draft=getForm();const raw=location.hash.slice(1).split('/'),r=raw[0]||'chart';state.route=Object.hasOwn(titles,r)?r:'chart';state.learnMode=r==='learn'&&raw[1]==='practice'?'practice':r==='learn'&&raw[1]==='basics'?'basics':r==='learn'&&raw[1]==='gates'?'gates':'lesson';if(r==='learn'&&C.lessons.some(l=>l.id===raw[1]))state.lesson=raw[1];state.readerBook=r==='library'&&C.books.some(b=>b.id===raw[1])?raw[1]:'';state.readerAt=Math.max(0,Math.floor(Number(raw[2])||0));state.readerError='';render();window.scrollTo(0,0);}
 function dialog(title,html){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!$('#source-dialog').open)$('#source-dialog').showModal();}
 function sourceDialog(p){const b=C.books.find(b=>b.id===p.source_id);dialog(p.title,`<span class="tag">${esc(p.review_status)} · 网络整理本</span><p>${esc(p.chapter)} · 原文件第${p.line_start}行</p><blockquote>${esc(p.text)}</blockquote><p><button class="button small" data-original-id="${esc(p.id)}">打开完整原文及前后文 →</button></p><p>此处确认的是本地文本存在与定位关系。尚未逐字对照扫描本，也未认证它足以支持自动人生断语。</p>${p.quality_flags?.length?`<p>质量提示：${esc(p.quality_flags.join('；'))}</p>`:''}<p class="mono">段落：${esc(p.id)}<br>Unicode字符：${p.char_start}—${p.char_end}<br>段落SHA256：${esc(p.text_sha256)}<br>原文件SHA256：${esc(b?.sha256||'')}</p>${b?`<a class="source-link" href="${safeUrl(b.source_url)}" target="_blank" rel="noreferrer">查看该整理本来源 ↗</a>`:''}`);}
 function calculationDetails(){const c=state.chart;if(!c||c.unknownTime)return;const s=c.solar;dialog('本盘的计算链',`<div class="fact-box">${esc(c.pillars.join('　'))}</div><p>原始出生读数：${esc(c.civil)}<br>IANA时区：${esc(c.input.timezone)}<br>UTC瞬间：${new Date(c.utc).toISOString()}<br>当天UTC偏移：${c.offsetMinutes}分钟<br>日时采用读数：${esc(c.clock)}<br>时钟口径：${clockName(c)}</p>${s?`<p><b>太阳时换算链</b><br>钟表时 ${esc(s.clockWall)}<br>经度差 ${signed(s.longitudeCorrection)} 分（经度 ${s.LON.toFixed(4)}°，标准经线 ${(s.zoneMinutes/4).toFixed(2)}°）<br>均时差 ${signed(s.eotMinutes)} 分<br>地方平太阳时 ${esc(s.lmtWall)}<br>地方真太阳时 ${esc(s.trueWall)}${c.hourCompare?`<br>校正前后时柱：${c.hourCompare.civil[3]} → ${c.hourCompare.true[3]}${c.hourCompare.hourChanged?'（已变）':'（未变）'}`:''}</p>`:''}<p>前一节：${c.before.name}，${new Date(c.before.utc).toISOString()}<br>后一节：${c.after.name}，${new Date(c.after.utc).toISOString()}<br>起运取节：${c.luck.term.name}，间隔${c.luck.gapMinutes}整分钟。</p><p>${esc(c.luck.algorithm)}</p><p>引擎：${c.engine}<br>浏览器时区实现：Intl / 当前浏览器内置版本，前端无法可靠读取完整tzdb版本。</p>${c.ziAlternative?`<p>另一换日口径：${c.ziAlternative.join('　')}。晚子时起干仍依当前设置。</p>`:''}${c.solarAlternatives?.length?`<p>太阳时边界观察：${c.solarAlternatives.map(a=>`${a.shiftMinutes>0?'+':''}${a.shiftMinutes}分钟：${a.pillars.join(' ')}`).join('<br>')}</p>`:''}<p>没有完成问真实机兼容认证；节令90秒阈值用于提示复核，不是精度承诺。</p>`);}
 function download(name,data,type='application/json'){const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:type+';charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name.replace(/[\\/:*?"<>|]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}

 function saveChart(){if(!state.chart){toast('请先起盘。');return;}const entry={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),input:{...state.input},savedAt:new Date().toISOString()};state.saved.unshift(entry);if(storage.write('saved',state.saved))toast('已保存到“我的命盘”。');}
 function checkAnswer(id){const q=C.questions.find(q=>q.id===id),input=$(`[data-answer="${id}"]`),feedback=$('#feedback-'+id);if(!q||!input||!feedback)return;const answer=input.value.trim();if(!answer){toast('先写下你的答案，再核对。');return;}const norm=s=>String(s).replace(/[，,。\s、：:]/g,'');const closed=['十神','六十甲子','五行','阴阳','藏干'].includes(q.topic)&&String(q.answer).length<=12;const correct=norm(answer)===norm(q.answer);feedback.classList.toggle('wrong',closed&&!correct);feedback.textContent=(closed?(correct?'✓ 答案一致。':'请再检查。'):'这是研读题，请自己比较步骤与条件。')+' 参考答案：'+q.answer+' 说明：'+q.explanation;}
 function actions(action){switch(action){case'demo':state.draft={...demo};calc(state.draft);if(state.route==='chart')render();else location.hash='chart';break;case'zi-demo':state.draft={...demo,name:'晚子时示例',date:'1988-02-15',time:'23:30'};calc(state.draft);location.hash='chart';break;case'calculation-details':calculationDetails();break;case'save':saveChart();break;case'export-json':if(state.chart)download(state.input.name+'_命盘.json',{format:'ziping-chart-v1',input:state.input,result:state.chart});break;case'export-report':exportReport();break;case'print':printFullReport();break;case'export-saved':download('子平命盘备份.json',{format:'ziping-backup-v1',records:state.saved});break;case'next-unfinished':{const next=C.lessons.find(l=>!state.completed.includes(l.id))||C.lessons[0];location.hash='learn/'+next.id;break;}case'clear-book':state.libraryBook='';state.libraryQ='';state.libraryResults=[];state.libraryTotal=0;render();break;case'load-more':searchLibrary(true);break;case'more-questions':{const pool=C.questions.filter(q=>q.lesson===state.lesson);state.questionRound=(state.questionRound||0)+1;const start=state.questionRound*4%pool.length;document.querySelectorAll('[data-question-card]').forEach((node,i)=>{const q=pool[(start+i)%pool.length];node.outerHTML=`<div class="question-card" data-question-card="${q.id}"><label for="answer-${q.id}">${q.id} · ${esc(q.question)}</label><div class="answer-row"><input id="answer-${q.id}" data-answer="${q.id}" aria-label="${esc(q.question)}" placeholder="先写下你的答案"><button class="button small" data-check="${q.id}">核对答案</button></div><div class="question-feedback" id="feedback-${q.id}" aria-live="polite"></div></div>`;});toast('已更换练习题。');break;}}}
 document.addEventListener('submit',e=>{if(e.target.id==='birth-form'){e.preventDefault();const i=getForm();i.demo=false;state.draft=i;const ok=calc(i);render();if(ok)toast('命盘已按当前设置更新。');else $('.error-box')?.scrollIntoView({block:'center',behavior:'smooth'});}if(e.target.id==='library-form'){e.preventDefault();state.libraryQ=$('#library-query').value.trim();if(!state.libraryQ&&!state.libraryBook){toast('请输入关键词或选择一本书。');return;}searchLibrary();}});
 document.addEventListener('click',async e=>{
   const el=e.target.closest('button,a');if(!el)return;
   if(el.closest('.mobile-more'))el.closest('details').removeAttribute('open');
   if(el.dataset.action){e.preventDefault();actions(el.dataset.action);}
   if(el.dataset.chartView){state.chartView=el.dataset.chartView;storage.write('chartView',state.chartView);const body=$('#chart-body');if(body)body.innerHTML=state.chartView==='pro'?chartTablePro(state.chart)+luckStartHTML(state.chart)+stripsHTML(state.chart):chartTable(state.chart);const tabs=document.querySelectorAll('[data-chart-view]');tabs.forEach(b=>{const on=b.dataset.chartView===state.chartView;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});return;}
   if(el.dataset.luckIndex!==undefined){state.luckIndex=Number(el.dataset.luckIndex);state.annualYear=null;const body=$('#chart-body');if(body&&state.chart)body.innerHTML=chartTablePro(state.chart)+luckStartHTML(state.chart)+stripsHTML(state.chart);return;}
   if(el.dataset.annualYear!==undefined){state.annualYear=Number(el.dataset.annualYear);const body=$('#chart-body');if(body&&state.chart)body.innerHTML=chartTablePro(state.chart)+luckStartHTML(state.chart)+stripsHTML(state.chart);return;}
   if(el.dataset.gender){state.draft={...getForm(),gender:el.dataset.gender};calc(state.draft);render();}
   if(el.dataset.clock){state.draft={...getForm(),clock:el.dataset.clock};calc(state.draft);render();toast(el.dataset.clock==='true'?'已按出生地真太阳时定时辰。':el.dataset.clock==='mean'?'已按地方平太阳时定时辰（不含均时差）。':'已按出生地钟表时定时辰，不做太阳时校正。');}
   if(el.dataset.calendar){const old=getForm();if(old.calendar!==el.dataset.calendar){try{if(el.dataset.calendar==='lunar'){const a=Z.calendarDate(old),l=Solar.fromYmd(...a.slice(0,3)).getLunar();old.date=`${l.getYear()}-${String(Math.abs(l.getMonth())).padStart(2,'0')}-${String(l.getDay()).padStart(2,'0')}`;old.leap=l.getMonth()<0;}else{const a=Z.calendarDate(old);old.date=Z.formatWall(Z.wallStamp(a)).slice(0,10);old.leap=false;}}catch{toast('原日期无效，切换后请重新输入日期。');}old.calendar=el.dataset.calendar;}state.draft=old;render();}
   if(el.dataset.luck){state.luckIndex=Number(el.dataset.luck);state.annualYear=null;const y=window.scrollY;state.draft=getForm();render();window.scrollTo(0,y);}
   if(el.dataset.annual){state.annualYear=Number(el.dataset.annual);const y=window.scrollY;state.draft=getForm();render();window.scrollTo(0,y);}
   if(el.dataset.scroll){e.preventDefault();const t=document.getElementById(el.dataset.scroll)||document.getElementById('report-'+el.dataset.scroll);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}
   if(el.dataset.lesson){state.lesson=el.dataset.lesson;if(location.hash==='#learn/'+state.lesson)render();else location.hash='learn/'+state.lesson;}
   if(el.dataset.complete){const id=el.dataset.complete;state.completed=state.completed.includes(id)?state.completed.filter(x=>x!==id):[...state.completed,id];storage.write('completed',state.completed);const y=scrollY;render();scrollTo(0,y);}
   if(el.dataset.step!==undefined&&el.dataset.step!==''){const k=String(el.dataset.step);state.steps=(state.steps||[]).includes(k)?state.steps.filter(x=>String(x)!==k):[...(state.steps||[]),k];storage.write('steps',state.steps);const y=scrollY;render();scrollTo(0,y);}
   if(el.dataset.check)checkAnswer(el.dataset.check);
   if(el.dataset.source)openSource(el.dataset.source);
   if(el.dataset.passage){const p=state.libraryResults.find(p=>p.id===el.dataset.passage);if(p)sourceDialog(p);}
   if(el.dataset.book){const mark=storage.read('readerMarks',{})[el.dataset.book];readerRoute(el.dataset.book,Number(mark?.at||0));}
   if(el.dataset.scroll){e.preventDefault();$('#report-'+el.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});}
   if(el.dataset.load){const s=state.saved.find(s=>s.id===el.dataset.load);if(s){state.draft={...s.input};if(calc(s.input))location.hash='chart';else{location.hash='chart';}}}
   if(el.dataset.delete){state.saved=state.saved.filter(s=>s.id!==el.dataset.delete);storage.write('saved',state.saved);render();toast('已移除这条本机收藏。');}
 });
 document.addEventListener('change',async e=>{
   if(e.target.closest('#birth-form')){
     const isPlace=e.target.dataset.geo||e.target.name==='placeOther';
     const i=getForm();
     if(isPlace&&i.placeHit&&i.placeHit.found){i.timezone=i.placeHit.tz;i.longitude=i.placeHit.lon;}
     state.draft=i;
     // 地点只做局部更新：避免重绘打断输入或吞掉回车提交
     if(isPlace){
       // 级联：选了省清空市，选了市清空区；只局部更新，不打断其他输入
       if(e.target.dataset.geo==='prov'){state.draft.geoCity='';state.draft.geoDist='';}
       if(e.target.dataset.geo==='city'){state.draft.geoDist='';}
       const i2=getForm();state.draft=i2;
       const wrap=$('#geo-wrap');if(wrap)wrap.innerHTML=geoHTML(i2);
       const box=$('#place-hit-box');if(box)box.innerHTML=placeMatchHTML(i2);
       const form=$('#birth-form');
       if(form&&form.elements.timezone)form.elements.timezone.value=i2.timezone;
       if(form&&form.elements.longitude)form.elements.longitude.value=i2.longitude;
       // 选完地点立即按新经度重算，不用再点一次「起盘研习」
       if(state.chart&&calc(i2)){
         const box=$('#chart-results');if(box)box.innerHTML=chartResultsHTML();
         const t=$('#chart-table')||null;
         const hint0=$('#form-hint');
         if(hint0){const nt=i2.placeHit&&i2.placeHit.found?`已按${i2.placeHit.name||'新地点'}重算时柱：${i2.placeHit.lon.toFixed(2)}°E`:'地点已更新';hint0.textContent=nt;hint0.style.color='#5d7a4a';}
       }
     }
     if(['unknownTime','dayBoundary'].includes(e.target.name))render();
     else if(e.target.closest('#birth-form')&&/^(date|time|timezone|longitude|timeUncertainty)$/.test(e.target.name||'')){
       const i3=getForm();state.draft=i3;
       if(state.chart&&calc(i3)){const box=$('#chart-results');if(box)box.innerHTML=chartResultsHTML();}
     }
     const hint=$('#form-hint');
     if(hint){
       const ph=state.draft.placeHit;
       if(isPlace&&state.chart&&ph&&ph.found){hint.textContent=`已按${ph.name}重算时柱（${Number(ph.lon).toFixed(2)}°E），右侧命盘已同步更新`;hint.style.color='#5d7a4a';}
       else{hint.textContent='设置已修改，点击「起盘研习」更新右侧命盘';hint.style.color='#9e774e';}
     }
   }
   if(e.target.id==='import-file'&&e.target.files[0]){try{const file=e.target.files[0];if(file.size>2e6)throw Error('文件过大，请导入本网页的JSON备份。');const data=JSON.parse(await file.text());let inputs;if(data.format==='ziping-chart-v1')inputs=[data.input];else if(data.format==='ziping-backup-v1'&&Array.isArray(data.records))inputs=data.records.map(r=>r.input);else throw Error('不是本网页支持的备份格式。');if(inputs.length>200)throw Error('一次最多导入200张命盘。');const fresh=inputs.map(i=>{if(typeof i?.name!=='string'||i.name.length>100||typeof i?.date!=='string')throw Error('备份字段不完整。');Z.calculate(i);return {id:crypto.randomUUID(),input:i,savedAt:new Date().toISOString()};});state.saved=[...fresh,...state.saved];storage.write('saved',state.saved);render();toast('已导入'+fresh.length+'张命盘，并按当前引擎核验。');}catch(err){toast('导入失败：'+err.message);}}
 });
 document.addEventListener('input',e=>{if(e.target.dataset.note){state.notes[e.target.dataset.note]=e.target.value;storage.write('notes',state.notes);}if(e.target.dataset.work!==undefined){state.work[e.target.dataset.work]=e.target.value;storage.write('work',state.work);}});
 $('#close-dialog').addEventListener('click',()=>$('#source-dialog').close());
 $('#source-dialog').addEventListener('click',e=>{if(e.target===$('#source-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
 $('#help-button').addEventListener('click',()=>dialog('从这里开始研习','<p>① 在排盘页核对出生记录，选择地点、日期、时间和计算口径后起盘。</p><p>② 在八字详批页，按盘面事实、条件说明和自查问题逐步阅读；可导出报告。</p><p>③ 在子平学堂按78讲学习，回答练习，记录笔记并标记进度。</p><p>④ 古籍书斋提供来源与原文定位，书籍全文与检索可在直接打开网页时使用。所有出生输入在本机处理；本版不调用外部大模型。</p><p>遇到出生时刻未知、夏令时重复或靠近交节时，先处理候选，不急于选择唯一命盘。</p>'));
  // Full-text local reader: classic script loading also works under file://.
 const bookJobs=new Map();
 function loadBook(id){
   if(!C.books.some(b=>b.id===id))return Promise.reject(Error('书籍编号无效'));
   if(window.ZIPING_BOOKS?.[id])return Promise.resolve(window.ZIPING_BOOKS[id]);
   if(bookJobs.has(id))return bookJobs.get(id);
   const job=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('books/'+id+'.js',document.baseURI).href;s.onload=()=>window.ZIPING_BOOKS?.[id]?resolve(window.ZIPING_BOOKS[id]):reject(Error('书库文件内容不完整'));s.onerror=()=>{s.remove();bookJobs.delete(id);reject(Error('未能读取随网页附带的 books/'+id+'.js，请保留完整网页文件夹后重试。'));};document.head.append(s);});bookJobs.set(id,job);return job;
 }
 let readerTicket=0,searchTicket=0;
 function readerRoute(id,at){location.hash='library/'+id+'/'+Math.max(0,at||0);}
 async function prepareReader(id){const ticket=++readerTicket;state.readerError='';try{await loadBook(id);}catch(e){state.readerError=e.message;}if(ticket===readerTicket&&state.route==='library'&&state.readerBook===id)render();}
 function tablesHTML(){
   const T=window.ZipingTables;
   if(!T)return head('干支速查','表还没载入。','REFERENCE · 表格速查')+'<div class="card empty"><h3>速查表未载入</h3><p>请确认 tables.js 与网页在同一目录，然后刷新。</p></div>';
   const nav=T.nav().map(([id,label],i)=>`<a href="#tables" data-scroll="ref-${id}"><span>${String(i+1).padStart(2,'0')}</span>${label}</a>`).join('');
   return head('干支速查','把干支、藏干、十神、长生、合冲刑害破、神煞、纳音排成表，查得到才用得上。','REFERENCE · 一表一查')+
     `<div class="ref-layout"><aside class="card ref-toc"><h3>表格目录</h3>${nav}<small>机械性内容由引擎现算；解释性内容标为本页常见取法，各家有别处一并写明。</small></aside><div class="ref-main">${T.sections()}</div></div>`;
 }
 function libraryHTML(){
   if(state.readerBook)return readerHTML();
   const marks=storage.read('readerMarks',{});
   return head('古籍书斋','七部书全文随网页保存，双击打开也能阅读和检索。','LIBRARY · 循源阅读')+`<form class="search-bar" id="library-form"><input id="library-query" aria-label="检索古籍原文" value="${esc(state.libraryQ)}" maxlength="80" placeholder="全文检索，如：月令、男以财、女命"><button class="button primary" type="submit">检索原文</button></form><p class="micro-note">完整离线书库 · 13,448段原文 · 点击书籍直接进入阅读器。网络整理本尚待校勘，原文中的时代判断需辨读。</p><div id="library-results">${libraryResultsHTML()}</div><div class="library-grid">${C.books.map((b,i)=>`<section class="card book-card"><div class="book-cover" style="background:${['#d8cfb4','#c3cbb9','#d5c5ab','#bfc9c2','#dbceb3','#d0b9a8','#bfc1ad'][i]}"><span>${esc(b.title.replace('_网络整理本',''))}</span></div><div><h3>${esc(b.title.replace('_网络整理本',''))}</h3><p>${b.paragraph_count.toLocaleString()}段全文<br>网络整理本 · 待校勘</p><button class="button small" data-book="${b.id}">翻阅原文 ↗</button>${marks[b.id]?`<button class="source-link" data-resume="${b.id}">继续第${Number(marks[b.id].at)+1}段 →</button>`:''}</div></section>`).join('')}</div>`;
 }
 function libraryResultsHTML(){
   if(state.libraryLoading)return '<div class="card empty" role="status">正在读取随网页保存的七部书全文并检索…</div>';
   if(state.libraryError)return `<div class="error-box" role="alert">${esc(state.libraryError)}<button class="button" data-action="retry-search">重新检索</button></div>`;
   if(!state.libraryQ)return '';
   return `<section class="book-results"><h2>全文检索结果</h2><p class="micro-note">完整离线索引 · ${state.libraryTotal}项结果${state.libraryTotal?'，点击进入所在原文前后文':''}</p>${state.libraryResults.map(p=>`<article class="card passage-card"><h3>${esc(p.title)} · ${esc(p.chapter)}</h3><p>${esc(p.text)}</p><div class="passage-meta">${esc(p.id)} · 原文件第${p.line_start}行 · ${esc(p.review_status)}</div><button class="button small" data-read-passage="${esc(p.id)}" data-read-book="${p.source_id}">阅读前后文 →</button> <button class="source-link" data-passage="${esc(p.id)}">来源与定位 ↗</button></article>`).join('')}${state.libraryResults.length<state.libraryTotal?btn('继续载入检索结果','load-more'):''}</section>`;
 }
 async function searchLibrary(append=false){
   const ticket=++searchTicket,q=state.libraryQ;state.libraryLoading=true;state.libraryError='';if(!append){state.libraryOffset=0;state.libraryResults=[];}if($('#library-results'))$('#library-results').innerHTML=libraryResultsHTML();
   try{const books=await Promise.all(C.books.map(b=>loadBook(b.id)));const matches=books.flatMap(b=>b.passages).filter(p=>q&&(p.text.includes(q)||p.chapter.includes(q)));if(ticket!==searchTicket)return;state.libraryTotal=matches.length;state.libraryResults.push(...matches.slice(state.libraryOffset,state.libraryOffset+15));state.libraryOffset=state.libraryResults.length;}catch(e){if(ticket!==searchTicket)return;state.libraryError=e.message;}
   state.libraryLoading=false;if(state.route==='library'&&!state.readerBook&&$('#library-results'))$('#library-results').innerHTML=libraryResultsHTML();
 }
 function readerHTML(){
   const id=state.readerBook,b=C.books.find(b=>b.id===id),data=window.ZIPING_BOOKS?.[id];
   if(!b)return head('未找到书籍','返回书架选择一本书。')+'<a class="button" href="#library">返回书架</a>';
   const header=head(b.title.replace('_网络整理本',''),'全文阅读 · 保留原段顺序、来源行号和校勘状态','READER · 古籍书斋','<a class="button" href="#library">← 返回书架</a>');
   if(state.readerError)return header+`<div class="error-box" role="alert">${esc(state.readerError)}<button class="button" data-action="retry-book">重试读取</button></div>`;
   if(!data){queueMicrotask(()=>prepareReader(id));return header+'<div class="card empty" role="status">正在打开本书完整原文…</div>';}
   const size=12,start=Math.min(Math.max(0,state.readerAt||0),data.passages.length-1),end=Math.min(start+size,data.passages.length),section=data.sections.filter(s=>s.at<=start).at(-1),font=storage.read('readerFont',20),mark=storage.read('readerBookmarks',{})[id];
   const marks=storage.read('readerMarks',{});marks[id]={at:start,time:new Date().toISOString()};storage.write('readerMarks',marks);
   const nav=`<div class="reader-nav"><button class="button small" data-reader-at="${Math.max(0,start-size)}" ${start===0?'disabled':''}>← 上一页</button><span>第 ${start+1}—${end} 段 / 共 ${data.passages.length} 段</span><button class="button small" data-reader-at="${end}" ${end>=data.passages.length?'disabled':''}>下一页 →</button></div>`;
   return header+`<div class="reader-layout"><aside class="card reader-toc"><h2>目录与阅读分段</h2><p class="micro-note">有章名时沿用原索引；“阅读分段”为网页导航，非原书章名。</p><label class="field"><span>跳到原文段落</span><input id="reader-jump" aria-label="跳到原文段落" type="number" min="1" max="${data.passages.length}" value="${start+1}"></label><button class="button small" data-action="reader-jump">跳转</button><div class="reader-sections">${data.sections.map(s=>`<button class="lesson-button ${s===section?'active':''}" data-reader-at="${s.at}">${esc(s.title)}</button>`).join('')}</div></aside><article class="card reader-article" style="--reader-font:${font}px"><div class="reader-toolbar"><label>字号 <select id="reader-font" aria-label="原文字号">${[18,20,22,24,28].map(n=>`<option value="${n}" ${font===n?'selected':''}>${n}</option>`).join('')}</select></label><button class="button small" data-action="bookmark-book">保存当前页书签</button>${mark!==undefined?`<button class="source-link" data-reader-at="${Number(mark)}">回到书签 · 第${Number(mark)+1}段</button>`:''}<button class="text-button" data-action="book-info">版本与来源 ↗</button></div><form id="reader-search-form" class="search-bar"><input id="reader-query" aria-label="本书搜索" placeholder="在本书中查找词句" maxlength="80" value="${esc(state.readerQ||'')}"><button class="button" type="submit">本书查找</button></form><div id="reader-search-results" aria-live="polite"></div>${nav}<div class="reader-context"><strong>${esc(section?.title||'原文')}</strong><span class="tag">网络整理本 · 待校勘</span></div>${data.passages.slice(start,end).map((p,i)=>`<section class="reader-passage" id="reader-p-${start+i}"><div class="passage-meta">第${start+i+1}段 · ${esc(p.id)} · 原文件第${p.line_start}行</div><p>${esc(p.text)}</p><button class="source-link" data-reader-source="${start+i}">来源、质量与哈希 ↗</button>${p.quality_flags?.length?`<p class="micro-note">${esc(p.quality_flags.join('；'))}</p>`:''}</section>`).join('')}${nav}<p class="micro-note">翻页位置自动记录在当前浏览器。字词、异体字和整理者注记按本地索引保留，尚未逐字对照扫描本；书中历史偏见不等于本课程的现实判断。</p></article></div>`;
 }
 function searchReader(){const data=window.ZIPING_BOOKS?.[state.readerBook],q=$('#reader-query')?.value.trim();state.readerQ=q||'';const target=$('#reader-search-results');if(!data||!target)return;if(!q){target.textContent='请输入本书要查找的词句。';return;}const matches=data.passages.map((p,i)=>({p,i})).filter(x=>x.p.text.includes(q)||x.p.chapter.includes(q));target.innerHTML=`<p class="micro-note">找到 ${matches.length} 段，列出前100项。</p><div class="reader-find-list">${matches.slice(0,100).map(({p,i})=>`<button class="reader-find" data-reader-at="${i}"><b>第${i+1}段</b> ${esc(p.text.slice(Math.max(0,p.text.indexOf(q)-25),Math.max(0,p.text.indexOf(q)-25)+110))}</button>`).join('')}</div>`;}

 // Learning sequence and assessments; reading marks never certify mastery.
 const passedLessons=()=>storage.read('lessonPass',{});
 const caseChartCache=new Map();
 function caseChart(c){
   if(caseChartCache.has(c.id))return caseChartCache.get(c.id);
   let r=null;
   try{r=Z.calculate({name:c.name,date:c.birth.date,time:c.birth.time,calendar:'solar',gender:c.birth.gender,place:c.birth.place,timezone:c.birth.tz||'Asia/Shanghai',longitude:c.birth.lon,clock:'true',dayBoundary:0,ziStem:'next'});}catch(e){r=null;}
   caseChartCache.set(c.id,r);return r;
 }
 function lessonCasesHTML(l){
   const refs=(C.caseMap||{})[l.id]||[];
   if(!refs.length)return '';
   const KIND={'结构教学盘':'按结构检索生成','边界盘':'时间口径训练','公开档案':'官方记录'};
   return `<h3>本节配套案例 · ${refs.length} 盘</h3><p class="micro-note">每一讲至少五盘：先从「与本讲的关系」看这张盘为什么要放在这里，再看判读、推理链与边界。结构教学盘是按目标结构在合法日期范围内检索出来的盘，四柱由本页引擎现算，用于练习判读；它不是真实人物，不含生平事件。边界盘专门练时间口径。</p><div class="lesson-cases">${refs.map(ref=>{
     const c=(C.teachingCases||[]).find(x=>x.id===ref.id);if(!c)return '';
     const r=caseChart(c);
     const head=r?`<div class="case-chart">${r.details.map((p,i)=>`<div class="cc-item"><em>${['年','月','日','时'][i]}</em>${pairHTML(p.stem+p.branch)}<small>${i===2?'日主':esc(p.god)}</small></div>`).join('')}</div>`:'<p class="micro-note">此盘未能完成计算。</p>';
     return `<article class="case-card"><header class="case-head"><b>${esc(c.id)} ${esc(c.name)}</b><span class="case-kind">${KIND[c.kind]||esc(c.kind)}</span><span class="case-meta">${esc(c.birth.gender==='male'?'乾':'坤')} · ${esc(c.birth.date)} ${esc(c.birth.time)} · ${esc(c.birth.place)}</span></header>${head}<div class="case-tags">${(c.tags||[]).map(t=>`<i>${esc(t)}</i>`).join('')}</div><p class="case-point"><b>与本讲的关系</b>${esc(ref.point)}</p><div class="case-block"><b>判读示范</b><p>${esc(c.reading)}</p></div><div class="case-block chain"><b>推理链</b><p>${esc(c.chain)}</p></div><div class="case-block limit"><b>边界与常见误读</b><p>${esc(c.limits)}</p></div></article>`;
   }).join('')}</div>`;
 }
 function lessonsHTML(){
   if(state.learnMode==='practice')return practiceHTML();if(state.learnMode==='basics')return basicsHTML();if(state.learnMode==='gates')return gatesHTML();
   const l=C.lessons.find(x=>x.id===state.lesson)||C.lessons[0],idx=C.lessons.indexOf(l),done=state.completed.includes(l.id),qs=C.questions.filter(q=>q.lesson===l.id),sample=qs.slice(0,4),depth=(C.depthMap&&C.depthMap[l.id])||C.depth[idx],pass=passedLessons()[l.id];
   const stage=C.studyStages.find(s=>idx+1>=s.from&&idx+1<=s.to);
   return head('子平学堂','从核盘、结构到男女完整研读，通过示范、带练与陌生盘作业逐渐独立。','ACADEMY · 循序研习','<a class="button primary" href="#learn/practice">进入整盘实训 →</a><a class="button" href="#learn/gates">过三关训练 →</a>')+`<div class="course-summary"><div class="progress-circle">${state.completed.length}/${C.lessons.length}</div><div><h2>学会一套可以复核的传统读盘流程</h2><p>${C.lessons.length}讲 · 男命、女命分讲 · ${Object.keys(passedLessons()).length}讲确定题已通过；已读标记单独记录</p></div><button class="button" data-action="next-unfinished">继续未读课程 →</button></div><details class="card pathway" ${idx===0?'open':''}><summary>学习路线与结业材料 · 先看怎样才算学会</summary><div class="stage-grid">${C.studyStages.map(s=>`<section><b>${esc(s.title)}</b><p>第${s.from}—${s.to}讲 · ${esc(s.goal)}</p><p class="micro-note">交付：${esc(s.task)}</p><a class="source-link" href="#learn/${esc((C.lessons[s.from-1]||{}).id||'L01')}">开始这一阶段 →</a></section>`).join('')}</div><p class="micro-note">课程目标是独立组织有依据、可复算的传统研读；师资复审与试学仍待进行，学习进度不代表人生预测能力。</p></details><div class="academy-tabs"><a class="button primary" href="#learn/basics">基础总表与旺衰练习</a><a class="button" href="#learn/L49">干支与十神总表</a><a class="button" href="#learn/L56">旺衰四栏</a><a class="button" href="#learn/L61">婚姻事业与六亲</a><a class="button" href="#learn/L31">男女方法总表</a><a class="button" href="#learn/L33">男命专题</a><a class="button" href="#learn/L36">女命专题</a><a class="button" href="#learn/practice">完整示范 / 带练 / 独立作业</a><button class="button" data-action="export-study">导出学习备份</button><label class="button">导入学习备份<input id="import-study" type="file" accept=".json" hidden></label></div><div class="course-layout"><aside class="card course-list">${C.lessons.map((x,i)=>`${C.studyStages.some(s=>s.from===i+1)?`<div class="course-group">${C.studyStages.find(s=>s.from===i+1).title}</div>`:''}<button class="lesson-button ${x.id===l.id?'active':''}" data-lesson="${x.id}"><span>${i+1}</span><b>${esc(x.title)}</b>${state.completed.includes(x.id)?'<i title="已读">✓</i>':''}${passedLessons()[x.id]?'<i title="确定题通过">●</i>':''}</button>`).join('')}</aside><article class="card lesson-article"><div class="eyebrow">第 ${idx+1} 讲<span data-keep> · 编号 ${esc(l.id)}</span> · ${esc(l.track||'男女共通基础')} · 建议${l.estimated_minutes||25}分钟与另行练习</div><h2>${esc(l.title)}</h2><div class="lesson-objective">本课目标：${esc(l.objective)}</div><p class="micro-note">阶段任务：${esc(stage?.task)} ${l.prerequisites?.length?'建议先学 '+l.prerequisites.join('、'):''}</p><div class="lesson-lead"><p>${esc(l.body)}</p></div><h3>${esc(l.deep_heading)}</h3>${l.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<h3>按步骤动手推演</h3><ol class="lesson-steps">${l.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><h3>讲解示范</h3><div class="lesson-example">${esc(l.example)}</div>${depth?`<section class="depth-panel"><h3>${esc(depth[0])}</h3><p>${esc(depth[1])}</p><h4>先自己做</h4><p>${esc(depth[2])}</p><details><summary>展开纠错与检查重点</summary><p>${esc(depth[3])}</p></details></section>`:''}${l.references?.length?`<p>${l.references.map(r=>C.books.some(b=>b.id===String(r).split('-')[0])?`<button class="source-link" data-original-id="${esc(r)}">打开相关原文 ${esc(r)} ↗</button>`:'').join(' ')}</p>`:''}${lessonCasesHTML(l)}<h3>分项练习</h3><p>${esc(l.practice)}</p>${sample.map(q=>`<div class="question-card" data-question-card="${q.id}"><label for="answer-${q.id}">${q.id} · ${esc(q.question)}</label><div class="answer-row"><input id="answer-${q.id}" data-answer="${q.id}" aria-label="${esc(q.question)}" placeholder="先写答案，再核对"><button class="button small" data-check="${q.id}">核对答案</button></div><div class="question-feedback" id="feedback-${q.id}"></div></div>`).join('')}${qs.length>4?`<p class="micro-note">本课题库${qs.length}题。<button class="text-button" data-action="more-questions">换一组练习 ↻</button></p>`:''}<details class="question-card"><summary>开放任务自查与人工复审要点</summary><ol>${l.pass_criteria.map(p=>`<li>${esc(p)}</li>`).join('')}</ol><p>文字题不能由勾选或自动匹配认证精通。保留你的依据和反证，交同伴或教师复审。</p></details><section class="lesson-exam"><h3>本课确定题小测</h3><p class="micro-note">小测仅核查可明确判定的事实，答对后单独记为“确定题通过”。</p>${lessonExamHTML(l.id)}<p id="lesson-exam-feedback" aria-live="polite">${pass?'✓ 这讲确定题曾全部通过。':''}</p></section><h3>研习笔记与开放任务答案</h3><textarea class="lesson-note" id="lesson-note" data-note="${l.id}" aria-label="研习笔记" placeholder="写计算、取法、条件、原文定位、反证。">${esc(state.notes[l.id]||'')}</textarea><p class="micro-note">本浏览器自动保存，建议导出学习备份。当前为原创教学稿，尚待师资复审和试学。</p><div class="lesson-actions"><button class="button" data-lesson="${C.lessons[Math.max(0,idx-1)].id}" ${idx===0?'disabled':''}>← 上一讲</button><button class="button ${done?'':'primary'}" data-complete="${l.id}">${done?'✓ 已读 · 撤销标记':'标记本课已读 ✓'}</button><button class="button" data-lesson="${C.lessons[Math.min(idx+1,C.lessons.length-1)].id}" ${idx===C.lessons.length-1?'disabled':''}>下一讲 →</button></div><p><a class="button primary" href="#learn/practice">把本课方法放进整盘实训 →</a></p></article></div>`;
 }
 function gateTable(headers,rows){return `<div class="ref-table-wrap"><table class="ref-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td${i===0?' class="row-head"':''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
 function gatesHTML(){
  const c=state.chart;
  const rows=[
    ['第一关 · 验过去','挑两件已经发生的事，说清年份区间、什么事、为什么这么断','当事人点头，且不是“放之四海皆准”的话'],
    ['第二关 · 验现在','说清当下这步运的主题、正在推的事、该防的坑','当事人能对上主线，细节可以偏'],
    ['第三关 · 应未来','给一个时间窗、一个具体方向、一个可证伪的标志','到点能判“应”或“未应”，不许含糊'],
  ];
  const traps=[
    ['巴纳姆话术','“你有时外向有时内向”“你早年有过一次变动”——谁都对，等于没说。'],
    ['事后改口','没应就说“时候未到”“被别的字化了”。改口径之前先记下原话。'],
    ['只报喜','顺着当事人想听的说。批盘不是哄人，先说不好的那部分。'],
    ['拿术语挡','说不清就说“格局复杂”。真复杂就写清复杂在哪两层。'],
  ];
  return head('过三关','把断语放在能被证明、也能被推翻的位置上。','ACADEMY · 三关训练','<a class="button" href="#learn">← 回到课程</a>')+
   `<section class="card about-copy"><h2>为什么要过三关</h2><p>学八字最容易走的一条歪路，是拿一套词去套所有人：说几句“你外表随和，内心有主见”，听的人点头，于是以为自己会了。过三关就是掐断这条路——先断已经发生的事，对不上就别往下断。</p><p>顺序不能反：过去对不上，现在就是猜；现在对不上，未来就是编。三关过两关，这套结构在这张盘上才算立住。</p></section>
   <section class="card ref-block"><div class="card-head"><h2 class="card-title">三关怎么写</h2><span class="card-kicker">写不出来，就是还没学会</span></div><div class="ref-body">${gateTable(['关卡','要写什么','合格标准'],rows)}<p class="ref-note">每一关都要求“可证伪”：时间窗、方向、标志，三样缺一不可。写“今年事业有变动”不算，写“今年三月到九月之间换岗或换汇报对象”才算。</p></div></section>
   <section class="card ref-block"><div class="card-head"><h2 class="card-title">四种自欺</h2><span class="card-kicker">对照检查</span></div><div class="ref-body">${gateTable(['毛病','样子'],traps)}</div></section>
   ${c?threeGatesHTML(c)+`<section class="card"><div class="card-head"><h2 class="card-title">把判断写下来</h2><span class="card-kicker">存在本机，换设备不跟随</span></div><div class="conclusion-body"><label class="gate-write"><span>第一关：我断的过去两件事</span><textarea class="lesson-note" data-note="gate1" placeholder="例：2016—2019 之间，工作从执行岗换到要带人的岗，压力骤然变大。">${esc(state.notes.gate1||'')}</textarea></label><label class="gate-write"><span>第二关：当下这步运的主线与该防的坑</span><textarea class="lesson-note" data-note="gate2" placeholder="例：这步运在推“责任”，要防的是揽事太多、身体透支。">${esc(state.notes.gate2||'')}</textarea></label><label class="gate-write"><span>第三关：未来三年的可证伪断语</span><textarea class="lesson-note" data-note="gate3" placeholder="例：2027 年上半年之前，换岗或换城市，二者至少发生一件。">${esc(state.notes.gate3||'')}</textarea></label><p class="micro-note">写完隔半年回来看一次，应了打勾，没应写清原因。千万不要倒过来——先有结果再补理由。</p></div></section>`:`<div class="card empty"><h3>先起一张盘</h3><p>三关要落在具体命盘上才有意义。去排盘页起一张，再回来对照。</p><a class="button primary" href="#chart">去排盘 →</a></div>`}`;
 }
 function examItems(id){
   const bank=(C.quizBank&&C.quizBank[id])||[];
   if(bank.length)return bank.slice(0,4);
   const closed=C.questions.filter(q=>q.lesson===id&&['十神','六十甲子','五行','阴阳','藏干'].includes(q.topic)&&String(q.answer).length<=12).slice(0,3).map(q=>({question:q.question,answer:q.answer,explanation:q.explanation}));
   const own=C.genderChecks.find(q=>q.lesson===id)||C.lessonChecks.find(q=>q.lesson===id);
   return [...(own?[own]:[]),...closed];
 }
 function lessonExamHTML(id){return examItems(id).map((q,i)=>`<label class="field"><span>${esc(q.question)}</span>${q.options?`<select data-exam-answer="${i}" aria-label="${esc(q.question)}"><option value="">请选择</option>${q.options.map(v=>`<option>${esc(v)}</option>`).join('')}</select>`:`<input data-exam-answer="${i}" aria-label="${esc(q.question)}" placeholder="填写确定答案">`}</label>`).join('')+`<button class="button" data-exam="${id}">提交本课小测</button>`;}
 function gradeLesson(id){const questions=examItems(id),norm=s=>String(s).replace(/[，,。\s、：:]/g,'');let n=0;const feedback=questions.map((q,i)=>{const v=$(`[data-exam-answer="${i}"]`)?.value||'';const ok=norm(v)===norm(q.answer);if(ok)n++;return `${ok?'✓':'待订正'} ${q.question} 参考：${q.answer}。${q.explanation}`;});if(n===questions.length){const all=passedLessons();all[id]={at:new Date().toISOString(),correct:n,total:questions.length};storage.write('lessonPass',all);}$('#lesson-exam-feedback').textContent=`${n}/${questions.length}。${n===questions.length?'本课确定题已通过。':'尚未通过，订正后可重做。'} `+feedback.join(' ');}

 const practiceSamples=[
  {id:'winter-m',name:'冬金男命 · 完整示范',date:'2005-12-23',time:'08:37',gender:'male',reading:'辛金子月失令，有酉中辛本气根、巳中庚同类根，戊印透月且巳辰藏戊；壬癸食伤泄，乙财耗。先按普通格局列条件，不能省略根印便从弱。',climate:'冬令寒湿须问火的温暖条件。丙火藏巳不透，巳有根字线索却仍要查冬令效力；辰子水势、湿土印的作用也要讨论，不能见火就称调候完成。',structure:'子藏癸为食神且未同字透；时透壬为伤官，月透戊为正印。可以讨论食伤与印的制约、乙财的承接，不能把壬当癸透。'},
  {id:'winter-f',name:'冬金女命 · 完整示范',date:'2005-12-23',time:'08:37',gender:'female',reading:'与同生男命的月令根气完全相同：失令但有酉根和戊印扶助，壬癸食伤与乙财提供泄耗线索。强弱不能由性别改变，保留扶抑条件而不数五行下结论。',climate:'冬令寒湿，需讨论巳藏丙的效力和土水寒湿条件。调候问题不因男女性别切换而相反；先查季节，再查全局。',structure:'月令癸食神未透、壬伤官透时、戊印透月。女命也要完整读月令格局与工作学习，不能只把全部结构缩成夫子两星。'},
  {id:'spring-m',name:'春水男命 · 迁移训练',date:'1994-03-18',time:'10:20',gender:'male',reading:'癸水生卯月，木令泄水，原局四支戌卯卯巳不藏水，明干双丁财、甲伤官继续泄耗；戌藏辛、巳藏庚是印线索，但均藏而未透，不能忽视也不能自动当强扶。先提出日主偏弱待审的工作判断，查印的效力和从格门槛；全无根不等于已从。',climate:'癸水卯月是春水泄于木的讨论。原局丁火透两处，水无支根；是否需要金生水源、水助日主，须与财印、木火路线合读。不能直接套冬辛暖局，也不能仅因水少就给补水结论。',structure:'卯藏乙食神，甲伤官透年不等于乙透；月时两丁为偏财，可讨论食伤生财候选。须核身是否承载、暗印是否有效与财印制约，不能同见食伤财就认证成格。'},
  {id:'autumn-f',name:'秋土女命 · 迁移训练',date:'1998-09-18',time:'15:40',gender:'female',reading:'戊土酉月，金令泄土，辰藏戊为同字根、寅申亦藏戊，寅藏丙偏印；己劫财未见，不能将所有土都称劫财。庚食神、辛伤官明透，泄土路线清楚，但有根不等于强弱已经定论，要比较根与输出的效力。',climate:'秋土与酉令金旺的燥湿需分开。辰藏癸、申藏壬提供水的线索，寅藏丙提供火的线索，都非明透；是否足以润燥或制金，需全局条件。切勿把酉月直接称金日主。',structure:'酉藏辛为伤官，月干辛同字透；时干庚为食神，年干戊比肩。可由伤官月令入口讨论输出与财印承接；寅中甲为七杀、辰中乙为正官，女命官杀均藏，不能由此贴品德标签。'},
  {id:'summer-f',name:'夏土女命 · 独立作业',date:'2002-06-20',time:'11:15',gender:'female',reading:'己土生午月，丁火偏印当令，三午藏己比肩与丁印，未又藏己丁，印比根扶多；壬正财、庚伤官透，提供财和输出路线。普通强土工作判断要写根印依据，也要查庚壬承接，不以土字数充当旺衰评分。',climate:'夏土火旺，原局壬水透但四支不藏水，庚金透而支内无金根。可以提出润燥与金水承接的问题，却不能因见壬就认定调候完成；火土作用及财根须继续核查。',structure:'午藏丁偏印、己比肩；月干丙为正印而不是丁偏印同字透。庚伤官、壬正财可列生克路线；女命官杀线索为未藏乙七杀，未见甲正官，不编配应验故事。'},
  {id:'spring-f',name:'春水女命 · 独立作业',date:'1994-03-18',time:'10:20',gender:'female',reading:'癸水卯月失于木令泄耗，原局无水支根，甲木与双丁提供泄耗；戌辛、巳庚为暗印线索。与同生男命完全相同，先写弱的支持，再写暗印效力等反证，不因性别改强弱。',climate:'癸水卯月要看木火泄耗与金水承接。丁火两透而癸无支根，暗庚辛能否生扶需继续研读，不能用一句春暖就略去水源问题。',structure:'卯藏乙食神未同字透，年干甲伤官明透，月时丁偏财。女命官杀为土：戌巳藏戊正官，戌中无己，未见己七杀。传统伴侣入口从男盘丁财改为女盘戊官，月令候选不变。'}
 ];
 const writingSteps=[['input','资料与计算口径','原始来源、日期、时区、时间精度、时钟模式、换日约定。'],['facts','四柱与全部十神','四柱、日主、明干与藏干逐项换算。'],['month','月令与透藏','月令本气、各藏干、同字透在何位。'],['roots','根气与扶泄','得令、得地、得助、克泄耗；至少一条反证。'],['structure','格局候选与救应','候选、支持、破坏、救应；声明采用的传统框架。'],['climate','扶抑与调候分别写','分别写问题、前提、暂定判断与待核项。'],['relations','合冲及作用条件','位置、配对、成化条件、原局与新增关系分开。'],['work','工作学习与资源','从结构转到中性核查问题，补现实技能与环境资料。'],['gender','男命 / 女命星宫','标明男女取法，伴侣星位置、日支、子息取法分歧。'],['luck','顺逆、取节与起运','年干阴阳、方向、首运、折算与交运时刻。'],['timing','运年叠加','选一运一年，列新增条件和窗口，保留未应验可能。'],['conclusion','结论、反证与原文','计算事实、传统解释、未知分开；至少两个原文定位与两个反证。']];
 function getPractice(){const s=practiceSamples.find(s=>s.id===state.practiceId)||practiceSamples[0],input={...demo,...s,name:s.name,demo:true};return {s,c:Z.calculate(input)};}
 function workshopReferences(c,s){const pos=['年','月','日','时'];const target=c.input.gender==='male'?['正财','偏财']:['正官','七杀'];const stars=[];c.details.forEach((p,i)=>{if(i!==2&&target.includes(p.god))stars.push(pos[i]+'干'+p.stem+p.god);p.hidden.forEach(h=>{if(target.includes(h.god))stars.push(pos[i]+'支藏'+h.stem+h.god);});});const loc=t=>Z.formatWall(Z.wallStamp(Z.zonedParts(t,c.input.timezone)));
   return [
   `${c.input.date} ${c.input.time}，Asia/Shanghai，民用钟表时，0点换日，晚子按次日日干起时干，${c.input.gender==='male'?'男命':'女命'}。合成教学算例，无出生证和生平，不编配现实事件。`,
   `四柱${c.pillars.join('、')}；日主${c.dayMaster}。`+c.details.map((p,i)=>`${pos[i]}干${p.stem}${i===2?'为日主':'为'+p.god}；${p.branch}藏${p.hidden.map(h=>h.stem+h.god).join('、')}`).join('。'),
   `${c.pillars[1][1]}月本气${c.details[1].hidden[0].stem}，相对日主为${c.details[1].hidden[0].god}。`+c.details[1].hidden.map(h=>`${h.stem}${c.details.some(p=>p.stem===h.stem)?'同字见于明干':'未同字透出'}`).join('；')+'。同五行不能当同字透。',
   s.reading+' 查表根气：'+(c.roots.map(r=>r.position+'支藏'+r.stems.join('、')).join('；')||'未见同五行藏根')+'。',s.structure,s.climate,
   (c.relations.map(r=>r.positions+'：'+r.pair+r.type).join('；')||'本页关系表未检出配对')+'。先核存在，后论作用，不由冲合直接断人生事件。',
   '先列明干中的输出、资源、约束与支持，再讨论作用条件。现实需核教育、技能、行业、收入与责任。可以提出学习计划或合作核查问题，不能认定唯一职业、收入数额或投资时点。',
   `本样本为${c.input.gender==='male'?'男命，采用财星伴侣入口':'女命，采用官杀伴侣入口'}。线索：${stars.join('；')||'未检出，不等于现实没有伴侣'}。共同日支${c.pillars[2][1]}，藏${c.details[2].hidden.map(h=>h.stem+h.god).join('、')}。子息须另声明取法，不据字数断生育数量、性别或健康。`,
   `${c.pillars[0][0]}为${Z.polar(c.pillars[0][0])}年干，本盘${c.luck.forward?'顺':'逆'}行，首运${c.luck.rows[0].pillar}。取${c.luck.term.name}，间隔${c.luck.gapMinutes}分钟，折${c.luck.years}年${c.luck.months}月${c.luck.days}日${c.luck.hours}时，交运${loc(c.luck.startUTC)}。`,
   `可先选首运${c.luck.rows[0].pillar}，其运干${Z.god(c.dayMaster,c.luck.rows[0].pillar[0])}。再选交运后的一个立春年，按具体日期检查归运。只写新增结构及前提，不配造应验故事。`,
   '收束先列已核四柱十神，再列月令结构工作判断、未定强弱或成格条件、男女星宫及运序，最后列反证与现实资料需求。可查《子平真诠》论用神、论妻子，《三命通会》女命段及本库对应日干月令。网络本待校勘，不作专家背书。'
   ];
 }
 function practiceHTML(){const {s,c}=getPractice(),all=storage.read('practiceDrafts',{}),d=all[s.id]||{},mode=state.practiceMode||'guided',refs=workshopReferences(c,s),score=(d.rubric||[]).reduce((a,b)=>a+Number(b||0),0),record=storage.read('practiceChecks',{})[s.id];
   return head('整盘实训','先看完整示范，再做带练，最后独立完成陌生男命与女命。','WORKSHOP · 独立推演','<a class="button" href="#learn/L48">结业要求 ↗</a><a class="button" href="#learn/L01">返回课程</a>')+`<div class="card practice-settings"><label class="field"><span>选择训练盘 · 全部为合成教学样本</span><select id="practice-sample" aria-label="训练盘">${practiceSamples.map(x=>`<option value="${x.id}" ${s.id===x.id?'selected':''}>${x.name}</option>`).join('')}</select></label><label class="field"><span>训练方式</span><select id="practice-mode" aria-label="训练方式"><option value="example" ${mode==='example'?'selected':''}>完整示范 · 展开十二步</option><option value="guided" ${mode==='guided'?'selected':''}>带练 · 先答后看参考</option><option value="independent" ${mode==='independent'?'selected':''}>独立作业 · 隐藏参考</option></select></label><div class="actions"><button class="button" data-action="compare-genders">同生男女对照</button><button class="button primary" data-action="export-practice">导出本份作业</button></div></div><p class="practice-birth">${s.date} ${s.time} · Asia/Shanghai · 民用时 · 0点换日 · <strong>${s.gender==='male'?'男命 / 乾造':'女命 / 坤造'}</strong></p><div class="note-card">独立模式先完成并保存自己的答案，再自行切换示范对照。确定题可自动核查；格局、喜用、解释与报告质量需要自评和人工复审。自评分数不作精通或预测准确率认证。</div><section class="card practice-facts"><h2>先闭卷完成四道确定题</h2>${[['pillars','四柱（依年、月、日、时，用空格隔开）'],['day','日主天干'],['direction','大运方向（顺行 / 逆行）'],['firstLuck','第一步大运']].map(([key,title])=>`<label class="field"><span>${title}</span><input data-practice-check="${key}" aria-label="${title}" value="${esc(d.checks?.[key]||'')}"></label>`).join('')}<button class="button" data-action="grade-practice">核对确定题</button><p id="practice-grade" aria-live="polite">${record?`${record.correct}/4（曾核对的记录，修改后应重新核对）。`:''}</p></section><div class="practice-steps">${writingSteps.map(([key,title,hint],i)=>`<section class="card practice-step"><div class="eyebrow">STEP ${i+1} · ${key==='gender'?(s.gender==='male'?'男命专题':'女命专题'):'男女共通'}</div><h2>${title}</h2><p>${esc(mode==='independent'?'请独立写证据、采用的规则与不确定项。':hint)}</p><textarea class="lesson-note" data-work="${key}" aria-label="${title}作业" placeholder="先写自己的推演；自动保存在本浏览器。">${esc(d.answers?.[key]||'')}</textarea>${mode==='independent'?'':`<details class="worked-reference" ${mode==='example'?'open':''}><summary>展开分步示范与核查重点</summary><p>${esc(refs[i])}</p></details>`}<label class="rubric-label">本项自评 <select data-rubric="${i}" aria-label="${title}自评">${[[0,'0 · 缺失或有关键错误'],[1,'1 · 有内容，依据或条件不全'],[2,'2 · 有依据、有条件与未知']].map(([v,t])=>`<option value="${v}" ${Number(d.rubric?.[i]||0)===v?'selected':''}>${t}</option>`).join('')}</select></label></section>`).join('')}</div><section class="card graduation"><h2>结业材料与复审</h2><p id="practice-score">本份作业自评：${score}/24。建议20分以上且确定题全对，再交人工复审；门槛尚未试学标定。</p><p>完成一份男命、一份女命、同生比较、边界候选说明与版本对照。点击已读不会代替上述材料。</p><label class="field"><span>复审者与反馈（由你自行填写，不冒充已经审核）</span><textarea data-work="review" aria-label="复审反馈">${esc(d.answers?.review||'')}</textarea></label><button class="button" data-action="export-study">导出全部学习材料备份</button></section>`;
 }
 function savePracticeField(key,value,kind='answers'){const all=storage.read('practiceDrafts',{}),id=getPractice().s.id;all[id]??={answers:{},checks:{},rubric:[]};all[id][kind]??=kind==='rubric'?[]:{};all[id][kind][key]=value;all[id].updatedAt=new Date().toISOString();storage.write('practiceDrafts',all);if(kind==='rubric'&&$('#practice-score'))$('#practice-score').textContent=`本份作业自评：${all[id].rubric.reduce((a,b)=>a+Number(b||0),0)}/24。建议20分以上且确定题全对，再交人工复审；门槛尚未试学标定。`;}
 function gradePractice(){const {s,c}=getPractice(),expected={pillars:c.pillars.join(''),day:c.dayMaster,direction:c.luck.forward?'顺行':'逆行',firstLuck:c.luck.rows[0].pillar};let n=0;const lines=[];for(const [k,v]of Object.entries(expected)){const input=$(`[data-practice-check="${k}"]`)?.value||'';const ok=input.replace(/[\s、，,]/g,'')===v;if(ok)n++;lines.push(`${ok?'✓':'待订正'} ${k==='pillars'?'四柱':k==='day'?'日主':k==='direction'?'方向':'首运'}：${v}`);}const records=storage.read('practiceChecks',{});records[s.id]={correct:n,total:4,at:new Date().toISOString()};storage.write('practiceChecks',records);$('#practice-grade').textContent=`${n}/4。${n===4?'确定题全部一致，开放报告仍需复审。':'订正后请重新核对。'} `+lines.join('；');}
 function compareGenders(){const {s}=getPractice(),m=Z.calculate({...demo,...s,gender:'male'}),f=Z.calculate({...demo,...s,gender:'female'});dialog('同一出生资料 · 男女取法对照',`<p>${esc(s.date)} ${esc(s.time)} · 时间口径完全一致</p><table class="definition-table"><tr><th>项目</th><th>男命</th><th>女命</th></tr><tr><td>四柱</td><td>${m.pillars.join(' ')}</td><td>${f.pillars.join(' ')}</td></tr><tr><td>日主与月令</td><td colspan="2">${m.dayMaster}日 / ${m.pillars[1][1]}月，相同</td></tr><tr><td>十神 / 根气 / 原局关系</td><td colspan="2">相同，依同一日主与干支推算</td></tr><tr><td>大运</td><td>${m.luck.forward?'顺行':'逆行'} · 首运${m.luck.rows[0].pillar}</td><td>${f.luck.forward?'顺行':'逆行'} · 首运${f.luck.rows[0].pillar}</td></tr><tr><td>起运</td><td>${m.luck.years}年${m.luck.months}月${m.luck.days}日${m.luck.hours}时</td><td>${f.luck.years}年${f.luck.months}月${f.luck.days}日${f.luck.hours}时</td></tr><tr><td>传统伴侣星入口</td><td>财星</td><td>官杀</td></tr><tr><td>共同夫妻宫入口</td><td colspan="2">日支${m.pillars[2][1]}</td></tr></table><p>子息另须声明取法；历史六亲约定不能用来证实性取向、配偶品德、婚次或子女性别。</p>`);}
 function exportPractice(){const {s}=getPractice(),d=storage.read('practiceDrafts',{})[s.id]||{};download(s.name+'_作业.md',`# ${s.name} · 研读作业\n\n合成训练盘，无应验故事。\n\n${s.date} ${s.time} Asia/Shanghai；${s.gender==='male'?'男':'女'}；民用时；0点换日。\n\n${writingSteps.map(([k,t],i)=>`## ${i+1}. ${t}\n\n${d.answers?.[k]||'尚未填写'}\n\n自评：${d.rubric?.[i]||0}/2`).join('\n\n')}\n\n## 复审反馈\n\n${d.answers?.review||'尚未填写，未宣称已经审核。'}`,'text/markdown');}
 function exportStudy(){download('子平学习备份.json',{format:'ziping-study-v2',createdAt:new Date().toISOString(),completed:state.completed,notes:state.notes,lessonPass:passedLessons(),practiceDrafts:storage.read('practiceDrafts',{}),practiceChecks:storage.read('practiceChecks',{}),readerMarks:storage.read('readerMarks',{}),readerBookmarks:storage.read('readerBookmarks',{})});}
 async function extraAction(action){switch(action){case'retry-search':searchLibrary();break;case'retry-book':prepareReader(state.readerBook);break;case'reader-jump':{const data=window.ZIPING_BOOKS[state.readerBook],n=Number($('#reader-jump').value);if(Number.isInteger(n)&&n>=1&&n<=data.passages.length)readerRoute(state.readerBook,n-1);else toast('请输入本书范围内的整数段落号。');break;}case'bookmark-book':{const marks=storage.read('readerBookmarks',{});marks[state.readerBook]=state.readerAt;storage.write('readerBookmarks',marks);render();toast('当前页书签已保存。');break;}case'book-info':{const b=C.books.find(b=>b.id===state.readerBook);dialog('版本与来源',`<h3>${esc(b.title)}</h3><p>网络整理本 · 待逐字校勘 · ${b.paragraph_count}段全文</p><p>${esc(b.edition)}<br>${esc(b.rights_status||'本机研究用途，公开发布前核查授权。')}</p><p class="mono">原文件SHA256：${esc(b.sha256)}</p><a class="source-link" target="_blank" rel="noreferrer" href="${safeUrl(b.source_url)}">原始整理本来源 ↗</a>`);break;}case'grade-practice':gradePractice();break;case'compare-genders':compareGenders();break;case'export-practice':exportPractice();break;case'export-study':exportStudy();break;}}
 document.addEventListener('submit',e=>{if(e.target.id==='reader-search-form'){e.preventDefault();searchReader();}});
 document.addEventListener('click',async e=>{const el=e.target.closest('button,a');if(!el)return;
   if(el.dataset.action)extraAction(el.dataset.action);
   if(el.dataset.readerAt!==undefined)readerRoute(state.readerBook,Number(el.dataset.readerAt));
   if(el.dataset.resume){const mark=storage.read('readerMarks',{})[el.dataset.resume];readerRoute(el.dataset.resume,Number(mark?.at||0));}
   if(el.dataset.readerSource!==undefined){const p=window.ZIPING_BOOKS?.[state.readerBook]?.passages[Number(el.dataset.readerSource)];if(p)sourceDialog(p);}
   if(el.dataset.readPassage||el.dataset.originalId){if($('#source-dialog').open)$('#source-dialog').close();const pid=el.dataset.readPassage||el.dataset.originalId,bid=el.dataset.readBook||pid.split('-')[0];try{const b=await loadBook(bid),at=b.passages.findIndex(p=>p.id===pid);if(at<0){toast('此引用没有匹配到段落，请在书库按关键词查找。');return;}readerRoute(bid,at);}catch(e){toast(e.message);}}
   if(el.dataset.exam)gradeLesson(el.dataset.exam);
 });
 document.addEventListener('input',e=>{const el=e.target;if(el.dataset.work)savePracticeField(el.dataset.work,el.value);if(el.dataset.practiceCheck)savePracticeField(el.dataset.practiceCheck,el.value,'checks');});
 document.addEventListener('change',async e=>{const el=e.target;
   if(el.id==='reader-font'){storage.write('readerFont',Number(el.value));$('.reader-article')?.style.setProperty('--reader-font',el.value+'px');}
   if(el.id==='practice-sample'){state.practiceId=el.value;render();}
   if(el.id==='practice-mode'){state.practiceMode=el.value;render();}
   if(el.dataset.rubric!==undefined)savePracticeField(Number(el.dataset.rubric),Number(el.value),'rubric');
   if(el.id==='import-study'&&el.files[0]){try{if(el.files[0].size>5e6)throw Error('备份过大');const d=JSON.parse(await el.files[0].text());if(d.format!=='ziping-study-v2'||!Array.isArray(d.completed)||!d.notes||typeof d.notes!=='object')throw Error('请选择本网页导出的学习备份');const allowed=C.lessons.map(l=>l.id);state.completed=[...new Set([...state.completed,...d.completed.filter(x=>allowed.includes(x))])];state.notes={...state.notes,...Object.fromEntries(Object.entries(d.notes).filter(([k,v])=>(allowed.includes(k)||k==='strength-work-v3')&&typeof v==='string'))};storage.write('completed',state.completed);storage.write('notes',state.notes);for(const key of ['lessonPass','practiceDrafts','practiceChecks','readerMarks','readerBookmarks'])if(d[key]&&typeof d[key]==='object'&&!Array.isArray(d[key]))storage.write(key,{...storage.read(key,{}),...d[key]});render();toast('学习备份已合并；自评与历史通过记录不代表人工认证。');}catch(err){toast('导入失败：'+err.message);}}
 });

 const R=window.ZipingReading;
 function reportSections(c){const extra=R.subjectSections(c),byId=new Map(extra.map(s=>[s.id,s]));const base=baseReportSections(c).map(s=>byId.get(s.id)||s);const ids=new Set(base.map(s=>s.id));const add=extra.filter(s=>!ids.has(s.id));base.splice(2,0,...add.filter(s=>s.id==='strength'));const last=base.findIndex(s=>s.id==='limits');base.splice(last,0,...add.filter(s=>s.id!=='strength'));return base;}
 function sectionSays(c){
   const d=conclusionData(c),bf=d.baseFavor;
   const useTxt=[...new Set(bf.map(g=>GROUP_USE[groupOf(g)]).filter(Boolean))].join('、')||'不好定，随运走';
   const spouse=c.input.gender==='male'?'财星':'官杀';
   return {
     strength:d.weak?'一句话：按偏弱用——有印有根，不算虚，但扛不住长期消耗，别用消耗战的方式活。':d.strong?'一句话：按偏强用——力气有余，怕的是憋着没出口，得找地方使。':'一句话：中和，命是看运走的，别急着给自己定性。',
     relationships:`一句话：${spouse}${/合/.test(R.relationText(R.relationFacts(c.pillars).filter(r=>r.indices.includes(2))))?'在明面、日支又被合住，感情来得不慢，但容易拖着不定':'在明面，缘分来得直接'}；看星也看宫，宫里有拉扯就别急着定。`,
     work:`一句话：用神在${useTxt}，靠这一路吃饭比逆着来省力；具体做什么行当，盘里给不了，得看手上的本事。`,
     wealth:`一句话：${d.weak?'钱是能见到的，留不留看节制，先把固定收入做厚再谈扩张。':'财路跟着运走，运来就动，运过就收，别把行情当本事。'}`,
     health:`一句话：五行${d.climateEl==='火'?'偏寒':'偏燥'}，作息上要注意的那一头已经写明；病名不在这里谈。`,
     children:'一句话：子女只看结构倾向，人数、性别、生得早晚都算不出来，别硬断。',
     parents:'一句话：年柱是根基，月柱是父母兄弟；托不托得住看这两柱，具体的事要问本人。',
     siblings:'一句话：同辈能帮也能分，合作先把账写清，别用感情代替约定。',
     'timing-method':'一句话：应期是窗口不是日期，写清窗口，等它来或不来。',
   };
 }
 function reportCard(s,i,says){const say=says&&says[s.id];return `<article class="card report-card" id="report-${s.id}"><div class="report-section-heading"><span class="report-no">${String(i+1).padStart(2,'0')}</span><h2>${esc(s.title)}</h2></div>${say?`<p class="section-say">${esc(say)}</p>`:''}<div class="fact-box"><b>盘面事实与取法</b><br>${esc(s.fact)}</div>${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}${s.source?sourceButton(s.source,'查看相关原文与前后文（网络本待校勘）'):''}<p class="reflection">${esc(s.reflection)}</p></article>`;}
 function aiHowToHTML(){
 const sample={baseUrl:'https://api.kodechicken.top/v1',apiKey:'sk-你的密钥',models:{gpt:{label:'GPT',model:'gpt_6.2sol'}},defaultModel:'gpt',maxTokens:2400,perMinute:6,dailyLimit:200};
 const extra={models:{gpt:{label:'GPT',model:'gpt_6.2sol',baseUrl:'https://api.kodechicken.top/v1',apiKey:'sk-这一档专用的密钥'}}};
 return `<section class="card ai-howto" id="ai-howto"><details><summary>怎么把模型接进来（站长与进阶）</summary><div class="ai-howto-in">
 <p>页面上只留「模型」这一个开关；真正用哪家服务、哪把密钥、哪个模型名，全部写在服务端的一份配置里。三条路任选一条。</p>
 <div class="ai-howto-step"><b>一、本站托管（推荐：任何手机电脑打开都能直接用）</b>
 <p>在项目根目录建 <code>ai.config.json</code>（已在 .gitignore 里，不会传到 GitHub）：</p><pre>${esc(JSON.stringify(sample,null,2))}</pre>
 <p>保存后约 5 秒自动生效，不用重启服务。换服务商只改 <code>baseUrl</code> 与 <code>apiKey</code>；换模型只改 <code>model</code>；想在网页上多一个选项，就在 <code>models</code> 里再加一个键，前端不用改。某一档要走别的地址或别的密钥，就把两样写进它自己的条目，优先于全局那份：</p><pre>${esc(JSON.stringify(extra,null,2))}</pre></div>
 <div class="ai-howto-step"><b>二、直连官方（自备密钥，密钥只存在访问者自己的浏览器里）</b>
 <div class="reference-table-wrap"><table class="definition-table"><thead><tr><th>服务</th><th>Base URL</th><th>模型名</th></tr></thead><tbody><tr><td>本页默认中转站</td><td><code>https://api.kodechicken.top/v1</code></td><td><code>gpt_6.2sol</code></td></tr><tr><td>OpenAI 官方</td><td><code>https://api.openai.com/v1</code></td><td><code>gpt-4o-mini</code></td></tr></tbody></table></div>
 <p class="micro-note">注意：页面由本机服务提供时，浏览器的安全策略只允许同源请求，直连会被拦下——这种情况走第一条路，或按「AI部署说明.md」部署后再用。</p></div>
 <div class="ai-howto-step"><b>三、验一下有没有接上</b>
 <p>浏览器打开 <code>/api/ai/status</code>，看到 <code>"configured": true</code> 且 <code>options</code> 里有 <code>gpt</code> 就成了；再回到上面点「测试连接」。命令行等价写法：<code>curl http://127.0.0.1:4317/api/ai/status</code>。</p>
 <p class="micro-note">名额与限流：<code>perMinute</code> 每人每分钟次数、<code>dailyLimit</code> 每天次数；想只给自己人用，就设 <code>shareToken</code>，访问者要填口令才能提问。</p></div>
 </div></details></section>`;
}
function aiFactsHTML(c){
 let ys=null,sc=null;
 try{ys=window.ZipingDeep?window.ZipingDeep.yongshen(c):null;}catch(err){console.warn('AI 侧栏判读缺失',err);}
 try{sc=window.ZipingExtra?window.ZipingExtra.strengthScore(c):null;}catch(err){}
 const rows=[['四柱',c.pillars.join(' ')],['日主',`${c.dayMaster} · ${Z.polar(c.dayMaster)}${Z.element(c.dayMaster)}`],['旺衰',sc?`${sc.total} 分 · ${sc.grade}`:'—'],['喜用',ys?ys.favorGods:'—'],['忌神',ys?ys.avoidGods:'—'],['起运',`出生后 ${c.luck.years} 年 ${c.luck.months} 月，${c.luck.forward?'顺行':'逆行'}`]];
 return `<section class="card ai-facts"><div class="ai-facts-in"><h3>AI 能读到的</h3><dl>${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p class="micro-note">就发这些结构数据，带着盘名；不发浏览记录、设备信息，也不发你的提问历史。</p></div></section>`;
}
function aiHTML(){
 const c=state.chart&&!state.chart.unknownTime&&!state.chart.uncertain?state.chart:null;
 if(!c)return `<div class="ai-page">${head('AI 批盘','AI 读的是盘面结构，先有一张盘再提问。','AI · CONSULT')}<div class="card empty"><h3>还没有可提问的命盘</h3><p>AI 收到的只有四柱、藏干、旺衰分数、喜忌与大运这类结构数据。先把出生信息排成一张盘。</p><a class="button primary" href="#chart">去排盘 →</a></div>${aiHowToHTML()}</div>`;
 return `<div class="ai-page">${head('AI 批盘','对着这一张盘提问：先说结论，再说依据；与本站判读不一致时，以可复核的盘面事实为准。','AI · CONSULT','<a class="button" href="#analysis">← 回到详批</a>')}
  <div class="ai-layout"><aside class="ai-side">
   <section class="card ai-strip"><div class="ai-strip-in"><div class="ai-strip-main"><small>本次提问的盘</small><strong>${esc(c.input.name)}</strong><span>${c.pillars.join(' ')} · ${c.input.gender==='male'?'乾造':'坤造'}<br>${esc(c.input.place)} · ${esc(c.input.timezone)}</span></div><details class="ai-brief"><summary>看要发给模型的数据</summary><pre>${esc(window.ZipingAI?window.ZipingAI.brief(c):'')}</pre></details></div></section>
   ${aiFactsHTML(c)}
  </aside><div class="ai-main">
   ${window.ZipingAI?window.ZipingAI.panelHTML(c):''}
   ${aiHowToHTML()}
  </div></div></div>`;
}
function analysisHTML(){
  const c=state.chart;if(!c||c.unknownTime||c.uncertain)return head('八字详批','先有可核对的命盘，再展开条件分析。','READING · 结构详析')+`<div class="card empty"><h3>${c?.unknownTime?'时刻未知，暂不生成唯一详批':c?.uncertain?'时间范围跨过干支边界，暂不生成唯一详批':'请先建立命盘'}</h3><p>先处理时间与候选，再阅读身强身弱、人生议题、八步大运和流年。</p><a class="button primary" href="#chart">返回排盘 →</a></div>`;
  const sections=reportSections(c),lucks=R.eightLuck(c),strength=R.strength(c),vd=strengthVerdict(c),says=sectionSays(c);
  return head('八字详批','先读原局，再按八步大运与立春流年展开：每项都有事实、传统条件和待核事项。','READING · 八运逐年',btn('↓ 导出完整详批','export-report')+btn('▧ 打印报告','print')+'<a class="button ai-jump" href="#ai">✦ AI 批盘</a>')+`<div class="analysis-layout"><aside class="card report-toc"><h3>本盘阅读目录</h3><a href="#ai" class="toc-ai"><strong>✦ AI 批盘 · 单独一页问它</strong></a><a href="#analysis" data-scroll="report-conclusion"><strong>结论摘要 · 先看判断</strong></a><a href="#analysis" data-scroll="report-gates"><strong>过三关 · 验一验</strong></a>${sections.map((s,i)=>`<a href="#analysis" data-scroll="${s.id}">${String(i+1).padStart(2,'0')} ${esc(s.title.split('：')[0])}</a>`).join('')}<a href="#analysis" data-scroll="eight-luck"><strong>八步大运 · 逐年详读</strong></a>${lucks.map(l=>`<a href="#analysis" data-luck-report="${l.number}">第${l.number}运 ${l.pillar} · ${l.year}起</a>`).join('')}<small>固定计算与原创条件说明。未连接外部模型，未认证复杂格局或预测准确率。</small></aside><div class="report">${window.ZipingAI?window.ZipingAI.entryHTML():""}${conclusionHTML(c)}<section class="card report-banner"><div class="eyebrow">PERSONAL READING · V0.9.5</div><h2>${esc(c.input.name)} · ${c.input.gender==='male'?'男命 / 乾造':'女命 / 坤造'}详读</h2><p>${c.pillars.join('　')}<br>${esc(c.input.place)} · ${esc(c.input.timezone)} · ${clockName(c)}</p><div class="insight-grid"><div class="insight"><small>日主</small><strong>${c.dayMaster} · ${Z.polar(c.dayMaster)}${Z.element(c.dayMaster)}</strong></div><div class="insight"><small>普通扶抑工作判断</small><strong>${esc(vd.scoreSide)} · ${vd.score} 分</strong><em class="insight-sub">规则初筛：${esc(vd.ruleLabel)}${vd.conflict?' · 与分数相反':vd.undecided?' · 未定论':''}</em></div><div class="insight"><small>研读范围</small><strong>8步大运 · ${lucks.reduce((n,l)=>n+l.years.length,0)}个流年分段</strong></div></div><p class="micro-note">逐年条目含交运前后的部分立春年；同一年在两步运各显示其有效窗口。传统解释不是已核实人生事实。</p></section>${warningHTML(c)}${sections.map((s,i)=>reportCard(s,i,says)).join('')}${threeGatesHTML(c)}${eightLuckHTML(c,lucks)}<div class="analysis-cta"><div><h3>看到判断，也能复核为什么</h3><p>基础总表、旺衰四栏、婚姻事业财富健康六亲和应期专题均可单独学习。</p></div><a class="button primary" href="#learn/basics">打开基础与旺衰工具 →</a></div></div></div>`;
 }
 function noteParagraphs(n){return [['结构与根气',n.structure],['婚姻与关系',n.marriage],['事业与学习',n.career],['财运与财富层级',n.wealth],['健康',n.health],['子女与照顾责任',n.children],['父母与家庭支持',n.parents],['兄弟姐妹与同辈',n.siblings]].map(([t,p])=>`<div class="year-topic"><h4>${t}</h4><p>${esc(p)}</p></div>`).join('');}
 function eightLuckHTML(c,lucks){
  const ys=D.yongshen(c);
  return `<section class="card luck-report-intro" id="report-eight-luck"><div class="eyebrow">EIGHT DECADES · YEAR BY YEAR</div><h2>八步大运与逐年研读</h2><p>只分析起运后的前八步。每运十年，起止均按${esc(c.input.timezone)}展示，结束时刻不含在本段内。流年以立春为界，交运年分段显示，不按公历元旦切运。</p><div class="ys-strip"><span class="ys-chip strong">判：${esc(ys.level)}（${ys.total} 分）</span><span class="ys-chip">喜 ${esc(ys.favGroups.map(g=>D.GNAME[g]).join('、'))}</span><span class="ys-chip bad">忌 ${esc(ys.avoidGroups.map(g=>D.GNAME[g]).join('、'))}</span><span class="ys-chip">${esc(ys.elements)}</span></div><div class="actions"><button class="button" data-expand-lucks="open">展开八运</button><button class="button" data-expand-lucks="close">收起八运</button><button class="button" data-expand-years="open">展开全部流年正文</button><button class="button" data-expand-years="close">收起流年正文</button></div><form id="report-year-form" class="search-bar"><input id="report-year-query" aria-label="定位流年年份" type="number" min="${lucks[0].years[0].year}" max="${lucks.at(-1).years.at(-1).year}" placeholder="输入年份定位，如2026"><button class="button" type="submit">定位流年</button></form><p id="report-year-status" aria-live="polite" class="micro-note"></p></section>${lucks.map(l=>{
   const lr=D.luckOne(c,l,ys);
   return `<details class="card luck-report" id="luck-report-${l.number}" ${l.number===1?'open':''}><summary><span>第${l.number}步大运 <strong>${pairHTML(l.pillar,'report-pillar')}</strong></span><span>${l.year}起 · 约${l.age}周岁起</span><span class="luck-verdict ${lr.score>=2?'good':lr.score<=-2?'bad':lr.score<0?'warn':''}">${lr.verdict}</span></summary><div class="luck-report-body"><div class="fact-box"><strong>有效区间</strong><br>${esc(l.window)}<br><strong>运干／运支</strong><br>${esc(l.detail.god)}／${esc(l.detail.hidden[0].god)}${l.relations.length?`　<strong>与原局</strong><br>${esc(R.relationText(l.relations))}`:''}</div><div class="deep-lines">${lr.lines.map(x=>`<p>${esc(x)}</p>`).join('')}</div><h3>本运所含流年 · ${l.years.length}个时间分段</h3><p class="micro-note">点开任意一年，看这一年的十神、与原局和运的关系、喜忌判定、具体落点与反证条件。</p><div class="year-list">${l.years.map(y=>{const yr=D.yearOne(c,l,y,ys);return `<details class="annual-report" data-year="${y.year}" id="annual-${l.number}-${y.year}"><summary><span><strong>${y.year} ${y.pillar}</strong> · ${y.detail.god}</span><span>${y.partial?'交运分段年':'完整立春年'} · ${yr.tone}</span></summary><div class="annual-report-body"><div class="year-window">本运内有效窗口：${esc(y.window)}<br>整年立春边界：${esc(R.fullDate(y.yearStart,c.input.timezone))} 至 ${esc(R.fullDate(y.yearEnd,c.input.timezone))}前</div><div class="deep-lines year">${yr.lines.map(x=>`<p>${esc(x)}</p>`).join('')}</div><p class="reflection">候选解释需原局、整运、该年及现实资料共同核对。本条不保证发生某事；请记录符合、不符、其他事件与未知。</p></div></details>`;}).join('')}</div></div></details>`;}).join('')}`;
 }
 function basicsHTML(){
  const c=state.chart&&!state.chart.unknownTime&&!state.chart.uncertain?state.chart:null,focus=state.basicsDay||'辛',gods=Z.GAN.split('');
  const hidden=Z.ZHI.split('').map((b,i)=>[b,Z.HIDDEN[i],Z.seasonal(b),R.branchDetail('甲'+b,focus).hidden.map(h=>h.stem+h.god).join('、')]);
  const table=(headers,rows)=>`<div class="reference-table-wrap"><table class="definition-table knowledge-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const pairTables=[['天干五合',R.rules.stemCombine,'相合不等于成化，化气方向另查条件。'],['天干四冲',R.rules.stemClash,'所采流派列表；一般相克范围更大。'],['地支六合',R.rules.combine,'合与破可能依不同列表同时标注。'],['地支六冲',R.rules.clash,'先写位置和根气，不直接断事件。'],['地支六害',R.rules.harm,'结构关系，不等于现实伤害。'],['地支六破',R.rules.break,'本课明示口径，存在流派分歧。']];
  return head('基础总表与旺衰练习','先查完整规则，再用当前命盘填写证据；所有关系口径在此明示。','FOUNDATIONS · 查表与推理','<a class="button" href="#learn/L49">从基础扩充课程学起 →</a><a class="button" href="#learn/L56">身强身弱详讲 →</a>')+`<div class="academy-tabs"><a class="button" href="#learn/L61">婚姻与应期</a><a class="button" href="#learn/L63">事业与职业</a><a class="button" href="#learn/L66">财运与层级</a><a class="button" href="#learn/L68">健康理论辨读</a><a class="button" href="#learn/L70">子女父母手足</a></div><section class="card knowledge-section"><h2>十天干 · 阴阳五行 · 相对十神</h2><label class="field"><span>选择日主，查看所有表中的相对十神</span><select id="basics-day" aria-label="基础表日主">${gods.map(g=>`<option ${g===focus?'selected':''}>${g}</option>`).join('')}</select></label>${table(['天干','阴阳','五行','相对'+focus+'日'],gods.map(g=>[g,Z.polar(g),Z.element(g),Z.god(focus,g)]))}<p>五行生：木→火→土→金→水→木。五行克：木→土→水→火→金→木。</p><p class="micro-note">同我比劫、我生食伤、我克财、克我官杀、生我印；再用同异阴阳区分正偏。</p></section><section class="card knowledge-section"><h2>十二支藏干、季节与十神</h2>${table(['支','固定藏干（本气在前）','季节','相对'+focus+'日'],hidden)}<p class="micro-note">藏干不按字数等权评分；辰未戌丑湿燥与司令分日另有细分取法。</p></section><div class="knowledge-grid">${pairTables.map(([t,ps,note])=>`<section class="card knowledge-section"><h2>${t}</h2><div class="relation-chips">${ps.map(p=>`<span>${p}</span>`).join('')}</div><p>${note}</p></section>`).join('')}<section class="card knowledge-section"><h2>三合与三会</h2>${R.rules.triples.map(([g,t])=>`<p><b>${g}</b> · ${t}</p>`).join('')}<p class="micro-note">三支齐见与成化分开；半合、拱合不自动升级为完整三合。</p></section><section class="card knowledge-section"><h2>相刑与自刑口径</h2><p>三刑组：寅巳申、丑戌未，本页按三支齐见记录。</p><p>子卯相刑。辰辰、午午、酉酉、亥亥列自刑候选。</p><p class="micro-note">两支是否足以三刑、自刑是否有实际作用，各家有异说；不把标签直接断为灾病。</p></section></div><section class="card knowledge-section" id="basics-strength"><h2>身强身弱 · 当前盘四栏练习</h2>${c?`<div class="fact-box">${esc(c.input.name)} · ${c.pillars.join(' ')} · ${c.input.gender==='male'?'男命':'女命'}</div><p>先写自己的得令、得地、得助和克泄耗；再展开计算事实与工作判断。</p><textarea class="lesson-note" data-note="strength-work-v3" aria-label="旺衰四栏作业" placeholder="得令：\n得地：\n得助：\n克泄耗：\n工作判断与反证：">${esc(state.notes['strength-work-v3']||'')}</textarea><details class="worked-reference"><summary>核对当前盘四栏与初筛判断</summary><h3>加权试算：${strengthVerdict(c).score} 分 · ${esc(strengthVerdict(c).scoreSide)}　｜　规则初筛：${esc(R.strength(c).label)}</h3>${verdictNote(strengthVerdict(c))}<p>${esc(R.strength(c).reason)}</p>${R.strength(c).evidence.map(p=>`<p>${esc(p)}</p>`).join('')}<p>${esc(R.strength(c).limits.join(' '))}</p></details><p><a class="button" href="#analysis">去详批看原局、八运和逐年变化 →</a></p>`:'<p>当前时刻未定或有边界候选，请先回排盘处理输入；仍可学习上方全部基础表。</p><a class="button" href="#chart">返回排盘</a>'}</section>`;
 }
 document.addEventListener('click',e=>{const el=e.target.closest('button,a');if(!el)return;
  if(el.dataset.expandLucks){document.querySelectorAll('.luck-report').forEach(d=>d.open=el.dataset.expandLucks==='open');}
  if(el.dataset.expandYears){document.querySelectorAll('.luck-report').forEach(d=>d.open=true);document.querySelectorAll('.annual-report').forEach(d=>d.open=el.dataset.expandYears==='open');}
  if(el.dataset.luckReport){e.preventDefault();const node=$('#luck-report-'+el.dataset.luckReport);if(node){node.open=true;node.scrollIntoView({behavior:'smooth',block:'start'});}}
 });
 document.addEventListener('change',e=>{if(e.target.id==='basics-day'){state.basicsDay=e.target.value;const y=scrollY;render();scrollTo(0,y);}});
 document.addEventListener('submit',e=>{if(e.target.id!=='report-year-form')return;e.preventDefault();const y=Number($('#report-year-query').value),nodes=[...document.querySelectorAll('.annual-report')].filter(n=>Number(n.dataset.year)===y);if(!nodes.length){$('#report-year-status').textContent='该年份不在本盘前八步大运内，请核对范围。';return;}nodes.forEach(n=>{n.open=true;n.closest('.luck-report').open=true;});$('#report-year-status').textContent='找到'+nodes.length+'个窗口'+(nodes.length>1?'，该年跨交运，分别位于前后两运。':'。');nodes[0].scrollIntoView({behavior:'smooth',block:'start'});});

 async function openSource(id){try{const known=C.quotes.find(p=>p.id===id);if(known){sourceDialog(known);return;}const b=await loadBook(id.split('-')[0]),p=b.passages.find(p=>p.id===id);if(p)sourceDialog(p);else toast('引用没有匹配到段落，请到书库按关键词查找。');}catch(e){toast('原文暂未打开：'+e.message);}}
 function printFullReport(){const nodes=[...document.querySelectorAll('.luck-report,.annual-report')],opened=nodes.map(d=>d.open);nodes.forEach(d=>d.open=true);const restore=()=>nodes.forEach((d,i)=>d.open=opened[i]);window.addEventListener('afterprint',restore,{once:true});window.print();}

 window.addEventListener('hashchange',route);calc(state.input);route();try{window.ZipingAI&&window.ZipingAI.bind(state.chart);}catch(err){console.warn('AI 面板未初始化',err);}
})();
