/* 离线地名库：用于把出生地点解析为经度与时区。坐标取城市中心近似值，非测绘坐标。 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ZipingPlaces=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 /* 字段：名称|上级|东经|北纬|IANA时区|精度级别
    1=直辖市/省会（坐标较稳定） 2=地级市 3=省级近似（仅用于兜底） 4=海外城市 */
 const RAW=`
北京|北京市|116.4074|39.9042|Asia/Shanghai|1
上海|上海市|121.4737|31.2304|Asia/Shanghai|1
天津|天津市|117.2000|39.1333|Asia/Shanghai|1
重庆|重庆市|106.5516|29.5630|Asia/Shanghai|1
石家庄|河北省|114.5149|38.0428|Asia/Shanghai|1
唐山|河北省|118.1802|39.6305|Asia/Shanghai|2
秦皇岛|河北省|119.6005|39.9354|Asia/Shanghai|2
邯郸|河北省|114.5391|36.6255|Asia/Shanghai|2
邢台|河北省|114.5048|37.0708|Asia/Shanghai|2
保定|河北省|115.4646|38.8739|Asia/Shanghai|2
张家口|河北省|114.8876|40.7686|Asia/Shanghai|2
承德|河北省|117.9634|40.9515|Asia/Shanghai|2
沧州|河北省|116.8388|38.3045|Asia/Shanghai|2
廊坊|河北省|116.6838|39.5380|Asia/Shanghai|2
衡水|河北省|115.6707|37.7392|Asia/Shanghai|2
太原|山西省|112.5489|37.8706|Asia/Shanghai|1
大同|山西省|113.3004|40.0768|Asia/Shanghai|2
阳泉|山西省|113.5805|37.8605|Asia/Shanghai|2
长治|山西省|113.1163|36.1954|Asia/Shanghai|2
晋城|山西省|112.8513|35.4976|Asia/Shanghai|2
朔州|山西省|112.4329|39.3315|Asia/Shanghai|2
晋中|山西省|112.7527|37.6870|Asia/Shanghai|2
运城|山西省|111.0038|35.0263|Asia/Shanghai|2
忻州|山西省|112.7339|38.4167|Asia/Shanghai|2
临汾|山西省|111.5190|36.0880|Asia/Shanghai|2
吕梁|山西省|111.1444|37.5192|Asia/Shanghai|2
呼和浩特|内蒙古自治区|111.7519|40.8414|Asia/Shanghai|1
包头|内蒙古自治区|109.8403|40.6574|Asia/Shanghai|2
乌海|内蒙古自治区|106.7942|39.6554|Asia/Shanghai|2
赤峰|内蒙古自治区|118.8877|42.2586|Asia/Shanghai|2
通辽|内蒙古自治区|122.2434|43.6535|Asia/Shanghai|2
鄂尔多斯|内蒙古自治区|109.7813|39.6086|Asia/Shanghai|2
呼伦贝尔|内蒙古自治区|119.7657|49.2116|Asia/Shanghai|2
巴彦淖尔|内蒙古自治区|107.3877|40.7435|Asia/Shanghai|2
乌兰察布|内蒙古自治区|113.1326|40.9944|Asia/Shanghai|2
沈阳|辽宁省|123.4315|41.8057|Asia/Shanghai|1
大连|辽宁省|121.6147|38.9140|Asia/Shanghai|2
鞍山|辽宁省|122.9946|41.1098|Asia/Shanghai|2
抚顺|辽宁省|123.9571|41.8807|Asia/Shanghai|2
本溪|辽宁省|123.7659|41.2944|Asia/Shanghai|2
丹东|辽宁省|124.3541|40.0005|Asia/Shanghai|2
锦州|辽宁省|121.1270|41.0952|Asia/Shanghai|2
营口|辽宁省|122.2350|40.6674|Asia/Shanghai|2
阜新|辽宁省|121.6704|42.0216|Asia/Shanghai|2
辽阳|辽宁省|123.2369|41.2734|Asia/Shanghai|2
盘锦|辽宁省|122.0707|41.1199|Asia/Shanghai|2
铁岭|辽宁省|123.8443|42.2906|Asia/Shanghai|2
朝阳|辽宁省|120.4512|41.5767|Asia/Shanghai|2
葫芦岛|辽宁省|120.8369|40.7110|Asia/Shanghai|2
长春|吉林省|125.3235|43.8171|Asia/Shanghai|1
吉林|吉林省|126.5495|43.8378|Asia/Shanghai|2
四平|吉林省|124.3506|43.1664|Asia/Shanghai|2
辽源|吉林省|125.1435|42.8876|Asia/Shanghai|2
通化|吉林省|125.9390|41.7285|Asia/Shanghai|2
白山|吉林省|126.4227|41.9422|Asia/Shanghai|2
松原|吉林省|124.8250|45.1417|Asia/Shanghai|2
白城|吉林省|122.8390|45.6195|Asia/Shanghai|2
延吉|吉林省|129.5086|42.8913|Asia/Shanghai|2
哈尔滨|黑龙江省|126.6424|45.7560|Asia/Shanghai|1
齐齐哈尔|黑龙江省|123.9180|47.3543|Asia/Shanghai|2
鸡西|黑龙江省|130.9690|45.2955|Asia/Shanghai|2
鹤岗|黑龙江省|130.2975|47.3497|Asia/Shanghai|2
双鸭山|黑龙江省|131.1590|46.6465|Asia/Shanghai|2
大庆|黑龙江省|125.1038|46.5895|Asia/Shanghai|2
伊春|黑龙江省|128.8414|47.7276|Asia/Shanghai|2
佳木斯|黑龙江省|130.3189|46.7997|Asia/Shanghai|2
七台河|黑龙江省|131.0033|45.7714|Asia/Shanghai|2
牡丹江|黑龙江省|129.6332|44.5512|Asia/Shanghai|2
黑河|黑龙江省|127.5286|50.2451|Asia/Shanghai|2
绥化|黑龙江省|126.9689|46.6539|Asia/Shanghai|2
南京|江苏省|118.7969|32.0603|Asia/Shanghai|1
无锡|江苏省|120.3119|31.4912|Asia/Shanghai|2
徐州|江苏省|117.2841|34.2058|Asia/Shanghai|2
常州|江苏省|119.9741|31.8112|Asia/Shanghai|2
苏州|江苏省|120.5853|31.2989|Asia/Shanghai|2
南通|江苏省|120.8943|31.9802|Asia/Shanghai|2
连云港|江苏省|119.2216|34.6000|Asia/Shanghai|2
淮安|江苏省|119.0153|33.6104|Asia/Shanghai|2
盐城|江苏省|120.1633|33.3478|Asia/Shanghai|2
扬州|江苏省|119.4129|32.3943|Asia/Shanghai|2
镇江|江苏省|119.4253|32.1877|Asia/Shanghai|2
泰州|江苏省|119.9229|32.4569|Asia/Shanghai|2
宿迁|江苏省|118.2753|33.9631|Asia/Shanghai|2
昆山|江苏省|120.9807|31.3856|Asia/Shanghai|2
常熟|江苏省|120.7525|31.6538|Asia/Shanghai|2
张家港|江苏省|120.5550|31.8755|Asia/Shanghai|2
江阴|江苏省|120.2860|31.9211|Asia/Shanghai|2
宜兴|江苏省|119.8235|31.3404|Asia/Shanghai|2
杭州|浙江省|120.1551|30.2741|Asia/Shanghai|1
宁波|浙江省|121.5498|29.8683|Asia/Shanghai|2
温州|浙江省|120.6994|27.9944|Asia/Shanghai|2
嘉兴|浙江省|120.7555|30.7461|Asia/Shanghai|2
湖州|浙江省|120.0865|30.8927|Asia/Shanghai|2
绍兴|浙江省|120.5802|30.0303|Asia/Shanghai|2
金华|浙江省|119.6474|29.0791|Asia/Shanghai|2
衢州|浙江省|118.8744|28.9417|Asia/Shanghai|2
舟山|浙江省|122.2072|29.9853|Asia/Shanghai|2
台州|浙江省|121.4208|28.6564|Asia/Shanghai|2
丽水|浙江省|119.9229|28.4518|Asia/Shanghai|2
义乌|浙江省|120.0751|29.3068|Asia/Shanghai|2
慈溪|浙江省|121.2664|30.1697|Asia/Shanghai|2
余姚|浙江省|121.1544|30.0372|Asia/Shanghai|2
诸暨|浙江省|120.2460|29.7136|Asia/Shanghai|2
乐清|浙江省|120.9617|28.1129|Asia/Shanghai|2
瑞安|浙江省|120.6551|27.7786|Asia/Shanghai|2
温岭|浙江省|121.3854|28.3713|Asia/Shanghai|2
合肥|安徽省|117.2272|31.8206|Asia/Shanghai|1
芜湖|安徽省|118.4329|31.3526|Asia/Shanghai|2
蚌埠|安徽省|117.3894|32.9166|Asia/Shanghai|2
淮南|安徽省|117.0183|32.6255|Asia/Shanghai|2
马鞍山|安徽省|118.5069|31.6704|Asia/Shanghai|2
淮北|安徽省|116.7987|33.9543|Asia/Shanghai|2
铜陵|安徽省|117.8121|30.9454|Asia/Shanghai|2
安庆|安徽省|117.0637|30.5435|Asia/Shanghai|2
黄山|安徽省|118.3376|29.7147|Asia/Shanghai|2
滁州|安徽省|118.3171|32.3016|Asia/Shanghai|2
阜阳|安徽省|115.8142|32.8901|Asia/Shanghai|2
宿州|安徽省|116.9642|33.6464|Asia/Shanghai|2
六安|安徽省|116.5227|31.7350|Asia/Shanghai|2
亳州|安徽省|115.7787|33.8446|Asia/Shanghai|2
池州|安徽省|117.4914|30.6648|Asia/Shanghai|2
宣城|安徽省|118.7587|30.9403|Asia/Shanghai|2
福州|福建省|119.2965|26.0745|Asia/Shanghai|1
厦门|福建省|118.0894|24.4798|Asia/Shanghai|2
莆田|福建省|119.0077|25.4541|Asia/Shanghai|2
三明|福建省|117.6389|26.2634|Asia/Shanghai|2
泉州|福建省|118.6757|24.8741|Asia/Shanghai|2
漳州|福建省|117.6471|24.5130|Asia/Shanghai|2
南平|福建省|118.1777|26.6419|Asia/Shanghai|2
龙岩|福建省|117.0174|25.0751|Asia/Shanghai|2
宁德|福建省|119.5479|26.6592|Asia/Shanghai|2
晋江|福建省|118.5522|24.7816|Asia/Shanghai|2
石狮|福建省|118.6481|24.7320|Asia/Shanghai|2
福清|福建省|119.3842|25.7205|Asia/Shanghai|2
南安|福建省|118.3861|24.9602|Asia/Shanghai|2
南昌|江西省|115.8579|28.6820|Asia/Shanghai|1
景德镇|江西省|117.1784|29.2688|Asia/Shanghai|2
萍乡|江西省|113.8546|27.6229|Asia/Shanghai|2
九江|江西省|115.9530|29.7051|Asia/Shanghai|2
新余|江西省|114.9173|27.8185|Asia/Shanghai|2
鹰潭|江西省|117.0692|28.2601|Asia/Shanghai|2
赣州|江西省|114.9350|25.8307|Asia/Shanghai|2
吉安|江西省|114.9924|27.1138|Asia/Shanghai|2
宜春|江西省|114.4168|27.8043|Asia/Shanghai|2
抚州|江西省|116.3582|27.9490|Asia/Shanghai|2
上饶|江西省|117.9435|28.4549|Asia/Shanghai|2
济南|山东省|117.1209|36.6513|Asia/Shanghai|1
青岛|山东省|120.3826|36.0671|Asia/Shanghai|2
淄博|山东省|118.0548|36.8135|Asia/Shanghai|2
枣庄|山东省|117.3237|34.8107|Asia/Shanghai|2
东营|山东省|118.6748|37.4341|Asia/Shanghai|2
烟台|山东省|121.4479|37.4638|Asia/Shanghai|2
潍坊|山东省|119.1071|36.7093|Asia/Shanghai|2
济宁|山东省|116.5871|35.4149|Asia/Shanghai|2
泰安|山东省|117.0870|36.2003|Asia/Shanghai|2
威海|山东省|122.1204|37.5131|Asia/Shanghai|2
日照|山东省|119.5269|35.4164|Asia/Shanghai|2
临沂|山东省|118.3564|35.1047|Asia/Shanghai|2
德州|山东省|116.3575|37.4355|Asia/Shanghai|2
聊城|山东省|115.9854|36.4568|Asia/Shanghai|2
滨州|山东省|117.9707|37.3821|Asia/Shanghai|2
菏泽|山东省|115.4807|35.2336|Asia/Shanghai|2
郑州|河南省|113.6253|34.7466|Asia/Shanghai|1
开封|河南省|114.3076|34.7972|Asia/Shanghai|2
洛阳|河南省|112.4540|34.6197|Asia/Shanghai|2
平顶山|河南省|113.1926|33.7664|Asia/Shanghai|2
安阳|河南省|114.3931|36.0997|Asia/Shanghai|2
新乡|河南省|113.8831|35.3030|Asia/Shanghai|2
焦作|河南省|113.2418|35.2159|Asia/Shanghai|2
许昌|河南省|113.8520|34.0357|Asia/Shanghai|2
漯河|河南省|114.0264|33.5759|Asia/Shanghai|2
南阳|河南省|112.5283|32.9908|Asia/Shanghai|2
商丘|河南省|115.6505|34.4471|Asia/Shanghai|2
信阳|河南省|114.0917|32.1470|Asia/Shanghai|2
周口|河南省|114.6497|33.6204|Asia/Shanghai|2
驻马店|河南省|114.0223|33.0115|Asia/Shanghai|2
武汉|湖北省|114.3055|30.5928|Asia/Shanghai|1
黄石|湖北省|115.0389|30.1997|Asia/Shanghai|2
十堰|湖北省|110.7987|32.6291|Asia/Shanghai|2
宜昌|湖北省|111.2865|30.6919|Asia/Shanghai|2
襄阳|湖北省|112.1224|32.0090|Asia/Shanghai|2
鄂州|湖北省|114.8948|30.3916|Asia/Shanghai|2
荆门|湖北省|112.1993|31.0354|Asia/Shanghai|2
孝感|湖北省|113.9168|30.9245|Asia/Shanghai|2
荆州|湖北省|112.2390|30.3350|Asia/Shanghai|2
黄冈|湖北省|114.8724|30.4535|Asia/Shanghai|2
咸宁|湖北省|114.3220|29.8413|Asia/Shanghai|2
随州|湖北省|113.3826|31.6905|Asia/Shanghai|2
长沙|湖南省|112.9388|28.2282|Asia/Shanghai|1
株洲|湖南省|113.1340|27.8274|Asia/Shanghai|2
湘潭|湖南省|112.9440|27.8297|Asia/Shanghai|2
衡阳|湖南省|112.5719|26.8934|Asia/Shanghai|2
邵阳|湖南省|111.4677|27.2389|Asia/Shanghai|2
岳阳|湖南省|113.1289|29.3571|Asia/Shanghai|2
常德|湖南省|111.6988|29.0316|Asia/Shanghai|2
张家界|湖南省|110.4792|29.1170|Asia/Shanghai|2
益阳|湖南省|112.3550|28.5540|Asia/Shanghai|2
郴州|湖南省|113.0143|25.7701|Asia/Shanghai|2
永州|湖南省|111.6080|26.4204|Asia/Shanghai|2
怀化|湖南省|109.9980|27.5549|Asia/Shanghai|2
娄底|湖南省|112.0084|27.7280|Asia/Shanghai|2
广州|广东省|113.2644|23.1291|Asia/Shanghai|1
深圳|广东省|114.0579|22.5431|Asia/Shanghai|2
珠海|广东省|113.5767|22.2707|Asia/Shanghai|2
汕头|广东省|116.6810|23.3540|Asia/Shanghai|2
佛山|广东省|113.1220|23.0288|Asia/Shanghai|2
东莞|广东省|113.7518|23.0478|Asia/Shanghai|2
中山|广东省|113.3926|22.5176|Asia/Shanghai|2
惠州|广东省|114.4162|23.1115|Asia/Shanghai|2
江门|广东省|113.0819|22.5789|Asia/Shanghai|2
湛江|广东省|110.3594|21.2707|Asia/Shanghai|2
茂名|广东省|110.9255|21.6629|Asia/Shanghai|2
肇庆|广东省|112.4653|23.0472|Asia/Shanghai|2
梅州|广东省|116.1227|24.2886|Asia/Shanghai|2
汕尾|广东省|115.3754|22.7862|Asia/Shanghai|2
河源|广东省|114.7004|23.7442|Asia/Shanghai|2
阳江|广东省|111.9822|21.8579|Asia/Shanghai|2
清远|广东省|113.0560|23.6817|Asia/Shanghai|2
韶关|广东省|113.5972|24.8104|Asia/Shanghai|2
潮州|广东省|116.6226|23.6567|Asia/Shanghai|2
揭阳|广东省|116.3722|23.5497|Asia/Shanghai|2
云浮|广东省|112.0444|22.9151|Asia/Shanghai|2
南宁|广西壮族自治区|108.3665|22.8170|Asia/Shanghai|1
柳州|广西壮族自治区|109.4156|24.3264|Asia/Shanghai|2
桂林|广西壮族自治区|110.2900|25.2740|Asia/Shanghai|2
梧州|广西壮族自治区|111.2792|23.4767|Asia/Shanghai|2
北海|广西壮族自治区|109.1193|21.4814|Asia/Shanghai|2
防城港|广西壮族自治区|108.3547|21.6869|Asia/Shanghai|2
钦州|广西壮族自治区|108.6542|21.9797|Asia/Shanghai|2
贵港|广西壮族自治区|109.5980|23.1115|Asia/Shanghai|2
玉林|广西壮族自治区|110.1812|22.6540|Asia/Shanghai|2
百色|广西壮族自治区|106.6180|23.9022|Asia/Shanghai|2
贺州|广西壮族自治区|111.5668|24.4035|Asia/Shanghai|2
河池|广西壮族自治区|108.0853|24.6929|Asia/Shanghai|2
来宾|广西壮族自治区|109.2211|23.7503|Asia/Shanghai|2
崇左|广西壮族自治区|107.3646|22.3765|Asia/Shanghai|2
海口|海南省|110.1999|20.0442|Asia/Shanghai|1
三亚|海南省|109.5119|18.2528|Asia/Shanghai|2
儋州|海南省|109.5808|19.5209|Asia/Shanghai|2
成都|四川省|104.0665|30.5723|Asia/Shanghai|1
自贡|四川省|104.7786|29.3392|Asia/Shanghai|2
攀枝花|四川省|101.7186|26.5823|Asia/Shanghai|2
泸州|四川省|105.4433|28.8891|Asia/Shanghai|2
德阳|四川省|104.3979|31.1269|Asia/Shanghai|2
绵阳|四川省|104.6791|31.4675|Asia/Shanghai|2
广元|四川省|105.8433|32.4354|Asia/Shanghai|2
遂宁|四川省|105.5928|30.5328|Asia/Shanghai|2
内江|四川省|105.0580|29.5801|Asia/Shanghai|2
乐山|四川省|103.7659|29.5521|Asia/Shanghai|2
南充|四川省|106.1107|30.8373|Asia/Shanghai|2
眉山|四川省|103.8485|30.0751|Asia/Shanghai|2
宜宾|四川省|104.6308|28.7602|Asia/Shanghai|2
广安|四川省|106.6330|30.4565|Asia/Shanghai|2
达州|四川省|107.4678|31.2095|Asia/Shanghai|2
雅安|四川省|103.0010|30.0100|Asia/Shanghai|2
巴中|四川省|106.7538|31.8670|Asia/Shanghai|2
资阳|四川省|104.6419|30.1222|Asia/Shanghai|2
贵阳|贵州省|106.6302|26.6477|Asia/Shanghai|1
六盘水|贵州省|104.8467|26.5845|Asia/Shanghai|2
遵义|贵州省|106.9270|27.7256|Asia/Shanghai|2
安顺|贵州省|105.9476|26.2455|Asia/Shanghai|2
毕节|贵州省|105.2850|27.3017|Asia/Shanghai|2
铜仁|贵州省|109.1912|27.7183|Asia/Shanghai|2
昆明|云南省|102.8329|24.8801|Asia/Shanghai|1
曲靖|云南省|103.7965|25.4899|Asia/Shanghai|2
玉溪|云南省|102.5432|24.3505|Asia/Shanghai|2
保山|云南省|99.1680|25.1120|Asia/Shanghai|2
昭通|云南省|103.7168|27.3380|Asia/Shanghai|2
丽江|云南省|100.2299|26.8721|Asia/Shanghai|2
普洱|云南省|100.9661|22.8255|Asia/Shanghai|2
临沧|云南省|100.0870|23.8843|Asia/Shanghai|2
大理|云南省|100.2676|25.6065|Asia/Shanghai|2
景洪|云南省|100.7978|22.0089|Asia/Shanghai|2
拉萨|西藏自治区|91.1409|29.6456|Asia/Shanghai|1
日喀则|西藏自治区|88.8851|29.2675|Asia/Shanghai|2
昌都|西藏自治区|97.1720|31.1406|Asia/Shanghai|2
林芝|西藏自治区|94.3615|29.6489|Asia/Shanghai|2
西安|陕西省|108.9398|34.3416|Asia/Shanghai|1
铜川|陕西省|108.9451|34.8968|Asia/Shanghai|2
宝鸡|陕西省|107.2379|34.3614|Asia/Shanghai|2
咸阳|陕西省|108.7051|34.3296|Asia/Shanghai|2
渭南|陕西省|109.5097|34.4996|Asia/Shanghai|2
延安|陕西省|109.4898|36.5965|Asia/Shanghai|2
汉中|陕西省|107.0231|33.0675|Asia/Shanghai|2
榆林|陕西省|109.7344|38.2853|Asia/Shanghai|2
安康|陕西省|109.0290|32.6903|Asia/Shanghai|2
商洛|陕西省|109.9402|33.8689|Asia/Shanghai|2
兰州|甘肃省|103.8343|36.0611|Asia/Shanghai|1
嘉峪关|甘肃省|98.2891|39.7729|Asia/Shanghai|2
金昌|甘肃省|102.1879|38.5142|Asia/Shanghai|2
白银|甘肃省|104.1381|36.5448|Asia/Shanghai|2
天水|甘肃省|105.7249|34.5809|Asia/Shanghai|2
武威|甘肃省|102.6380|37.9282|Asia/Shanghai|2
张掖|甘肃省|100.4498|38.9257|Asia/Shanghai|2
平凉|甘肃省|106.6648|35.5428|Asia/Shanghai|2
酒泉|甘肃省|98.4941|39.7325|Asia/Shanghai|2
庆阳|甘肃省|107.6383|35.7342|Asia/Shanghai|2
定西|甘肃省|104.6263|35.5798|Asia/Shanghai|2
陇南|甘肃省|104.9215|33.4007|Asia/Shanghai|2
西宁|青海省|101.7782|36.6171|Asia/Shanghai|1
海东|青海省|102.1043|36.5029|Asia/Shanghai|2
银川|宁夏回族自治区|106.2309|38.4872|Asia/Shanghai|1
石嘴山|宁夏回族自治区|106.3830|39.0134|Asia/Shanghai|2
吴忠|宁夏回族自治区|106.1988|37.9976|Asia/Shanghai|2
固原|宁夏回族自治区|106.2426|36.0158|Asia/Shanghai|2
中卫|宁夏回族自治区|105.1896|37.5149|Asia/Shanghai|2
乌鲁木齐|新疆维吾尔自治区|87.6168|43.8256|Asia/Shanghai|1
克拉玛依|新疆维吾尔自治区|84.8892|45.5799|Asia/Shanghai|2
吐鲁番|新疆维吾尔自治区|89.1898|42.9513|Asia/Shanghai|2
哈密|新疆维吾尔自治区|93.5135|42.8271|Asia/Shanghai|2
昌吉|新疆维吾尔自治区|87.3041|44.0111|Asia/Shanghai|2
阿克苏|新疆维吾尔自治区|80.2604|41.1688|Asia/Shanghai|2
喀什|新疆维吾尔自治区|75.9898|39.4704|Asia/Shanghai|2
伊宁|新疆维吾尔自治区|81.3277|43.9169|Asia/Shanghai|2
石河子|新疆维吾尔自治区|86.0411|44.3059|Asia/Shanghai|2
香港|香港特别行政区|114.1694|22.3193|Asia/Hong_Kong|1
九龙|香港特别行政区|114.1770|22.3120|Asia/Hong_Kong|2
澳门|澳门特别行政区|113.5491|22.1987|Asia/Macau|1
台北|台湾省|121.5654|25.0330|Asia/Taipei|1
新北|台湾省|121.4657|25.0120|Asia/Taipei|2
桃园|台湾省|121.3009|24.9936|Asia/Taipei|2
台中|台湾省|120.6736|24.1477|Asia/Taipei|2
台南|台湾省|120.2270|22.9999|Asia/Taipei|2
高雄|台湾省|120.3014|22.6273|Asia/Taipei|2
新竹|台湾省|120.9675|24.8138|Asia/Taipei|2
花莲|台湾省|121.6015|23.9910|Asia/Taipei|2
金门|台湾省|118.3171|24.4321|Asia/Taipei|2
新加坡|海外|103.8198|1.3521|Asia/Singapore|4
吉隆坡|海外|101.6869|3.1390|Asia/Kuala_Lumpur|4
槟城|海外|100.3327|5.4141|Asia/Kuala_Lumpur|4
雅加达|海外|106.8456|-6.2088|Asia/Jakarta|4
泗水|海外|112.7521|-7.2575|Asia/Jakarta|4
马尼拉|海外|120.9842|14.5995|Asia/Manila|4
曼谷|海外|100.5018|13.7563|Asia/Bangkok|4
河内|海外|105.8342|21.0278|Asia/Ho_Chi_Minh|4
胡志明市|海外|106.6297|10.8231|Asia/Ho_Chi_Minh|4
东京|海外|139.6917|35.6895|Asia/Tokyo|4
大阪|海外|135.5023|34.6937|Asia/Tokyo|4
名古屋|海外|136.9066|35.1815|Asia/Tokyo|4
福冈|海外|130.4017|33.5904|Asia/Tokyo|4
札幌|海外|141.3545|43.0621|Asia/Tokyo|4
首尔|海外|126.9780|37.5665|Asia/Seoul|4
釜山|海外|129.0756|35.1796|Asia/Seoul|4
悉尼|海外|151.2093|-33.8688|Australia/Sydney|4
墨尔本|海外|144.9631|-37.8136|Australia/Melbourne|4
布里斯班|海外|153.0251|-27.4698|Australia/Brisbane|4
珀斯|海外|115.8605|-31.9505|Australia/Perth|4
奥克兰|海外|174.7633|-36.8485|Pacific/Auckland|4
伦敦|海外|-0.1276|51.5072|Europe/London|4
曼彻斯特|海外|-2.2426|53.4808|Europe/London|4
巴黎|海外|2.3522|48.8566|Europe/Paris|4
柏林|海外|13.4050|52.5200|Europe/Berlin|4
慕尼黑|海外|11.5820|48.1351|Europe/Berlin|4
阿姆斯特丹|海外|4.9041|52.3676|Europe/Amsterdam|4
罗马|海外|12.4964|41.9028|Europe/Rome|4
马德里|海外|-3.7038|40.4168|Europe/Madrid|4
苏黎世|海外|8.5417|47.3769|Europe/Zurich|4
莫斯科|海外|37.6173|55.7558|Europe/Moscow|4
迪拜|海外|55.2708|25.2048|Asia/Dubai|4
纽约|海外|-74.0060|40.7128|America/New_York|4
波士顿|海外|-71.0589|42.3601|America/New_York|4
华盛顿|海外|-77.0369|38.9072|America/New_York|4
芝加哥|海外|-87.6298|41.8781|America/Chicago|4
休斯敦|海外|-95.3698|29.7604|America/Chicago|4
丹佛|海外|-104.9903|39.7392|America/Denver|4
洛杉矶|海外|-118.2437|34.0522|America/Los_Angeles|4
旧金山|海外|-122.4194|37.7749|America/Los_Angeles|4
西雅图|海外|-122.3321|47.6062|America/Los_Angeles|4
檀香山|海外|-157.8583|21.3069|Pacific/Honolulu|4
多伦多|海外|-79.3832|43.6532|America/Toronto|4
温哥华|海外|-123.1207|49.2827|America/Vancouver|4
蒙特利尔|海外|-73.5673|45.5017|America/Toronto|4
圣保罗|海外|-46.6333|-23.5505|America/Sao_Paulo|4
布宜诺斯艾利斯|海外|-58.3816|-34.6037|America/Argentina/Buenos_Aires|4
开罗|海外|31.2357|30.0444|Africa/Cairo|4
约翰内斯堡|海外|28.0473|-26.2041|Africa/Johannesburg|4
`;
 /* 省级兜底：输入只到省份时，用省会近似 */
 const PROVINCE={
  '河北':'石家庄','山西':'太原','内蒙古':'呼和浩特','辽宁':'沈阳','吉林':'长春','黑龙江':'哈尔滨','江苏':'南京','浙江':'杭州','安徽':'合肥','福建':'福州','江西':'南昌','山东':'济南','河南':'郑州','湖北':'武汉','湖南':'长沙','广东':'广州','广西':'南宁','海南':'海口','四川':'成都','贵州':'贵阳','云南':'昆明','西藏':'拉萨','陕西':'西安','甘肃':'兰州','青海':'西宁','宁夏':'银川','新疆':'乌鲁木齐','台湾':'台北','香港':'香港','澳门':'澳门'
 };
 /* 同义称呼 */
 const ALIAS={'乌鲁木齐市':'乌鲁木齐','乌市':'乌鲁木齐','呼和浩特市':'呼和浩特','呼市':'呼和浩特','哈尔滨市':'哈尔滨','哈市':'哈尔滨','深圳特区':'深圳','羊城':'广州','申城':'上海','蓉城':'成都','山城':'重庆','春城':'昆明','冰城':'哈尔滨','金城':'兰州','鹏城':'深圳','星城':'长沙','洪城':'南昌','泉城':'济南','岛城':'青岛','鹿城':'温州','魔都':'上海','帝都':'北京','渝':'重庆','沪':'上海','京':'北京','津':'天津'};
 const ALL=RAW.trim().split('\n').map(line=>{
   const [name,admin,lon,lat,tz,level]=(line.includes('|')?line:'').split('|');
   if(!name)return null;
   return {name,admin,lon:Number(lon),lat:Number(lat),tz,level:Number(level)};
 }).filter(Boolean);
 const FULL={};ALL.forEach(p=>{FULL[p.name]=p;});
 const LEVEL_TEXT={1:'直辖市/省会坐标',2:'地级市坐标',3:'省级近似坐标',4:'海外城市坐标'};
 function norm(s){
   return String(s||'')
     .replace(/[\uff01-\uff5e]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0))
     .replace(/[\s　·・,，。;；:：()（）\[\]【】]/g,'')
     .replace(/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|省|市|区|县|盟|旗)$/g,'')
     .toLowerCase();
 }
 function strip(s){
   return String(s||'')
     .replace(/[\uff01-\uff5e]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0))
     .replace(/[\s　·・,，。;；:：()（）\[\]【】]/g,'')
     .replace(/(省|市|自治区|特别行政区|地区|盟|县|区|镇|乡|街道|路|号)/g,'')
     .toLowerCase();
 }
 function resolve(query){
   const raw=String(query||'').trim();
   if(!raw)return {found:false,reason:'empty'};
   const q=strip(raw);
   if(!q)return {found:false,reason:'empty'};
   // 1) 同义称呼
   for(const k of Object.keys(ALIAS)){if(q===strip(k)){const p=FULL[ALIAS[k]];return {...p,found:true,level:Math.min(p.level,2),matchedBy:'同义称呼：'+k,levelText:LEVEL_TEXT[p.level]};}}
   // 2) 城市名完全匹配
   for(const p of ALL){if(strip(p.name)===q)return {...p,found:true,matchedBy:'城市名直接匹配',levelText:LEVEL_TEXT[p.level]};}
   // 3) 只写到省份：按省级近似处理
   for(const p of ALL){if(strip(p.admin)===q)return {...p,level:3,found:true,matchedBy:'仅识别到上级行政区：'+p.admin,levelText:'省级近似（建议补填精确经度）'};}
   // 4) 城市名最长包含匹配（地址串里含哪个市名，就用哪个市）
   let best=null,bestLen=0;
   for(const p of ALL){
     const k=strip(p.name);if(!k||k.length<2)continue;
     if(q.includes(k)||k.includes(q)){
       const score=q.includes(k)?k.length*100:(k.length-q.length)*2+1;
       if(score>bestLen){bestLen=score;best=p;}
     }
   }
   if(best)return {...best,found:true,matchedBy:'地址含「'+best.name+'」，按字面匹配',levelText:LEVEL_TEXT[best.level]};
   // 5) 上级行政区包含匹配
   for(const p of ALL){
     const k=strip(p.admin);if(!k||k.length<2)continue;
     if(q.includes(k))return {...p,level:3,found:true,matchedBy:'地址含「'+p.admin+'」，无市名可辨',levelText:'省级近似（建议补填精确经度）'};
   }
   // 4) 省级兜底
   for(const k of Object.keys(PROVINCE)){if(q.includes(strip(k))){const p=FULL[PROVINCE[k]];return {...p,found:true,level:3,matchedBy:'仅识别到省份：'+k,levelText:'省级近似（建议补填精确经度）'};}}
   return {found:false,reason:'nomatch'};
 }
 function search(q,limit=8){
   const n=strip(q);if(!n)return [];
   return ALL.filter(p=>strip(p.name).includes(n)||n.includes(strip(p.name))||strip(p.admin).includes(n))
     .sort((a,b)=>a.level-b.level).slice(0,limit);
 }
 return {list:ALL,resolve,search,LEVEL_TEXT,PROVINCE};
});
