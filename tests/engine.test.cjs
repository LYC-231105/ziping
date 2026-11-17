'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Z=require('../engine.js'),{Solar,LunarUtil}=require('../vendor/lunar.js');
let passed=0;const groups={};const failures=[];
function test(group,name,fn){groups[group]??={passed:0,failed:0};try{fn();passed++;groups[group].passed++;}catch(e){groups[group].failed++;failures.push({group,name,error:e.message});}}
const base={name:'test',date:'2005-12-23',time:'08:37',timezone:'Asia/Shanghai',gender:'male',longitude:120.1551,clock:'civil',dayBoundary:0,ziStem:'next'};
const calc=(patch={})=>Z.calculate({...base,...patch});
const prep=path.join(__dirname,'fixtures');
test('基础','示范四柱',()=>assert.deepEqual(calc().pillars,['乙酉','戊子','辛巳','壬辰']));
test('基础','示范十神与藏干',()=>{const c=calc();assert.deepEqual(c.details.map(x=>x.god),['偏财','正印','比肩','伤官']);assert.equal(c.details[2].hidden.map(h=>h.stem).join(''),'丙庚戊');assert.equal(Object.values(c.counts).reduce((a,b)=>a+b),8);});
for(const d of Z.GAN)for(const t of Z.GAN)test('十神100映射',d+t,()=>assert.equal(Z.god(d,t),LunarUtil.SHI_SHEN[d+t]));
for(const [date,time,dayBoundary,ziStem,day,hour]of [
 ['1988-02-15','22:59',0,'next','庚子','丁亥'],['1988-02-15','23:00',0,'next','庚子','戊子'],['1988-02-15','23:30',23,'next','辛丑','戊子'],['1988-02-15','23:30',0,'same','庚子','丙子'],['1988-02-16','00:00',0,'next','辛丑','戊子']])test('晚子时',`${date} ${time} ${dayBoundary} ${ziStem}`,()=>{const c=calc({date,time,dayBoundary,ziStem});assert.equal(c.pillars[2],day);assert.equal(c.pillars[3],hour);});
test('输入核验','非法公历日期',()=>assert.throws(()=>calc({date:'2023-02-29'})));
test('输入核验','空时间',()=>assert.throws(()=>calc({time:''})));
test('输入核验','太阳时缺经度',()=>assert.throws(()=>calc({clock:'true',longitude:''})));
test('输入核验','非法时区',()=>assert.throws(()=>calc({timezone:'China/Unknown'})));
test('输入核验','农历日期往返',()=>{const c=calc(),n=calc({calendar:'lunar',date:'2005-11-23'});assert.deepEqual(n.pillars,c.pillars);});
test('输入核验','农历闰月往返',()=>{const expected=calc({date:'2023-03-25',time:'12:00'});assert.deepEqual(calc({calendar:'lunar',date:'2023-02-04',leap:true,time:'12:00'}).pillars,expected.pillars);});
test('输入核验','不存在的闰月',()=>assert.throws(()=>calc({calendar:'lunar',date:'2023-03-04',leap:true})));
test('时区','纽约DST缺口',()=>assert.throws(()=>calc({date:'2024-03-10',time:'02:30',timezone:'America/New_York'}),/不存在/));
test('时区','纽约DST重复未选',()=>assert.throws(()=>calc({date:'2024-11-03',time:'01:30',timezone:'America/New_York'}),/出现两次/));
test('时区','纽约DST两候选差一小时',()=>{const i={date:'2024-11-03',time:'01:30',timezone:'America/New_York'};assert.equal(calc({...i,ambiguity:'later'}).utc-calc({...i,ambiguity:'earlier'}).utc,3600000);});
test('时区','上海1991夏令时',()=>assert.equal(calc({date:'1991-07-01',time:'12:00'}).offsetMinutes,540));
test('时区','檀香山1961记录',()=>{const c=calc({date:'1961-08-04',time:'19:24',timezone:'Pacific/Honolulu'});assert.equal(new Date(c.utc).toISOString(),'1961-08-05T05:24:00.000Z');assert.equal(c.offsetMinutes,-600);});
for(const zone of ['Pacific/Honolulu','America/New_York','Asia/Tokyo','Europe/London','Asia/Singapore','Australia/Sydney'])test('海外交节统一UTC',zone,()=>{const utc=Date.UTC(2024,1,4,8,30),a=Z.zonedParts(utc,zone);const [date,time]=Z.formatWall(Z.wallStamp(a)).split(' ');const c=calc({date,time,timezone:zone});const bj=calc({date:'2024-02-04',time:'16:30'});assert.equal(c.utc,utc);assert.deepEqual(c.pillars.slice(0,2),bj.pillars.slice(0,2));});
test('太阳时','平太阳时代数核对',()=>assert.equal(calc({date:'2024-06-01',time:'12:00',clock:'mean',longitude:116.4}).clock,'2024-06-01 11:45:36'));
test('太阳时','相同物理瞬间太阳时不受时区选项影响',()=>{const a=calc({date:'2024-06-01',time:'12:00',clock:'true',longitude:116.4}),b=calc({date:'2024-06-01',time:'00:00',timezone:'America/New_York',clock:'true',longitude:116.4});assert.equal(a.utc,b.utc);assert.equal(a.clock,b.clock);assert.deepEqual(a.pillars,b.pillars);});
test('太阳时','均时差典型季节符号与范围',()=>{assert.ok(Z.eot(Date.UTC(2024,1,11,12))<-13);assert.ok(Z.eot(Date.UTC(2024,10,3,12))>15);for(let m=0;m<12;m++)assert.ok(Math.abs(Z.eot(Date.UTC(2024,m,15,12)))<18);});
test('太阳时','西经跨日',()=>{const c=calc({date:'2024-06-01',time:'00:30',timezone:'UTC',clock:'mean',longitude:-120});assert.equal(c.clock,'2024-05-31 16:30:00');});
for(const gender of ['male','female'])for(const [y,m,d,h,mi]of [[2005,12,23,8,37],[1988,2,15,23,30],[2024,2,4,16,30],[2023,1,31,12,0],[2099,12,30,18,0]]){
 const inputDate=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,time=`${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`;
 test('交运库对照',inputDate+' '+time+' '+gender,()=>{const c=calc({date:inputDate,time,gender}),ec=Solar.fromYmdHms(y,m,d,h,mi,0).getLunar().getEightChar(),l=ec.getYun(gender==='male'?1:0,2),s=l.getStartSolar();assert.equal(c.luck.forward,l.isForward());assert.deepEqual([c.luck.years,c.luck.months,c.luck.days,c.luck.hours],[l.getStartYear(),l.getStartMonth(),l.getStartDay(),l.getStartHour()]);assert.equal(Z.formatWall(c.luck.startUTC+8*3600000),s.toYmdHms());assert.deepEqual(c.luck.rows.map(r=>r.pillar),l.getDaYun(10).slice(1).map(d=>d.getGanZhi()));});
}
test('未知时间','保留多候选不生成唯一时柱',()=>{const c=calc({unknownTime:true});assert.equal(c.unknownTime,true);assert.ok(c.candidates.length>=12);assert.equal(c.luck,undefined);assert.equal(c.pillars,undefined);});
test('未知时间','立春日保留年柱歧义',()=>{const c=calc({date:'2024-02-04',unknownTime:true});assert.equal(c.partial[0],null);assert.equal(c.partial[1],null);});
test('时间误差传播','跨时辰边界保留候选',()=>{const c=calc({time:'22:59',timeUncertainty:5});assert.equal(c.uncertain,true);assert.ok(c.timeAlternatives.length>=2);});
test('时间误差传播','稳定小范围不虚构歧义',()=>{const c=calc({timeUncertainty:1});assert.equal(c.uncertain,false);assert.equal(c.timeAlternatives.length,1);});
test('时间误差传播','不接受任意扩大误差',()=>assert.throws(()=>calc({timeUncertainty:150})));
test('关系','三合与六冲区分',()=>{const r=Z.relations(['甲申','丙子','戊辰','壬午']);assert.ok(r.some(r=>r.type==='三支齐见'&&r.pair==='申子辰'));assert.ok(r.some(r=>r.type==='地支六冲'&&r.pair==='子午'));assert.ok(!r.some(r=>r.type==='天干五合'));});
for(let day=1;day<=60;day++)test('藏干与十二长生',`2000-01-01加${day}日`,()=>{const s=Solar.fromYmd(2000,1,1).next(day),ec=Solar.fromYmdHms(s.getYear(),s.getMonth(),s.getDay(),10,0,0).getLunar().getEightChar();const c=calc({date:s.toYmd(),time:'10:00',timezone:'Etc/GMT-8'});assert.deepEqual(c.life,[ec.getYearDiShi(),ec.getMonthDiShi(),ec.getDayDiShi(),ec.getTimeDiShi()]);for(const p of c.details)assert.deepEqual(p.hidden.map(h=>h.stem),LunarUtil.ZHI_HIDE_GAN[p.branch]);});
for(const input of [{date:'1991-07-01',time:'12:00',timezone:'Asia/Shanghai'},{date:'2024-07-01',time:'12:00',timezone:'America/New_York'},{date:'1961-08-04',time:'19:24',timezone:'Pacific/Honolulu'}])test('海外与夏令时交运',input.date+' '+input.timezone,()=>{const c=calc(input),a=Z.zonedParts(c.utc,'Etc/GMT-8'),ec=Solar.fromYmdHms(...a).getLunar().getEightChar(),y=ec.getYun(1,2);assert.deepEqual([c.luck.years,c.luck.months,c.luck.days,c.luck.hours],[y.getStartYear(),y.getStartMonth(),y.getStartDay(),y.getStartHour()]);assert.equal(Z.formatWall(c.luck.startUTC+8*3600000),y.getStartSolar().toYmdHms());});
// Genuine regression fixtures generated by sxtwl during preparation. These do not prove prediction validity.
if(fs.existsSync(path.join(prep,'sxtwl_1500参考盘.json'))){
 const fixtures=JSON.parse(fs.readFileSync(path.join(prep,'sxtwl_1500参考盘.json'),'utf8')).rows;
 for(const r of fixtures){const a=r.input,[date,time]=Z.formatWall(Date.UTC(a[0],a[1]-1,a[2],a[3],a[4],a[5])).split(' ');test('sxtwl参考四柱',date+' '+time,()=>assert.deepEqual(calc({date,time,timezone:'Etc/GMT-8'}).pillars,r.expected.pillars));}
 const boundaries=JSON.parse(fs.readFileSync(path.join(prep,'节令边界待集成测试.json'),'utf8'));
 for(const r of boundaries){const [date,time]=r.input_utc8.split(' ');test('十二节边界',r.name+' '+r.input_utc8,()=>assert.equal(calc({date,time,timezone:'Etc/GMT-8'}).pillars[1][1],r.expected_month_zhi));}
}
const result={created_at:new Date().toISOString(),passed,failed:failures.length,groups,failures,node:process.version,tz:process.versions.tz,scope:'本版计算程序的回归与集成检查；不验证命理预测有效性。部分对照与主引擎共享算法谱系，不是完全独立天文真值。'};
fs.writeFileSync(path.join(__dirname,'计算测试结果.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));process.exitCode=failures.length?1:0;
