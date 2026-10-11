"use strict";
(function () {
  const records = window.procurementRecords || [];
  const yearSelect = document.getElementById("procurementYear");
  const typeSelect = document.getElementById("procurementCategory");
  const modeSelect = document.getElementById("procurementDigitMode");
  if (!yearSelect || !typeSelect || !modeSelect) return;
  const fmt = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });
  let chart = null;
  function probability(d, mode) {
    if (mode === "first") return Math.log10(1 + 1 / d);
    let p = 0;
    for (let k = 1; k <= 9; k++) p += Math.log10(1 + 1 / (10*k+d));
    return p;
  }
  // 正整數金額：以字串擷取有效數字，避免科學記號與浮點運算干擾。
  function digit(value, mode) {
    if (!Number.isFinite(value) || value <= 0) return null;
    const chars = Math.trunc(value).toString().replace(/^0+/, "");
    if (mode === "second" && chars.length < 2) return null;
    return Number(chars.charAt(mode === "first" ? 0 : 1));
  }
  // regularized upper incomplete gamma Q(a,x)，用於卡方分布右尾機率。
  function logGamma(z) {
    const c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.6150291621406,12.507343278686905,-0.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
    if(z<0.5) return Math.log(Math.PI)-Math.log(Math.sin(Math.PI*z))-logGamma(1-z);
    z-=1;let x=c[0];for(let i=1;i<c.length;i++)x+=c[i]/(z+i);
    const t=z+7.5;return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);
  }
  function gammaQ(a,x) {
    if(x<=0)return 1;
    const e=Math.exp(a*Math.log(x)-x-logGamma(a));
    if(x<a+1){let s=1/a,t=s;for(let i=1;i<=1000;i++){t*=x/(a+i);s+=t;if(Math.abs(t)<Math.abs(s)*1e-13)break;}return Math.max(0,Math.min(1,1-s*e));}
    let b=x+1-a,c=1e30,d=1/b,h=d;
    for(let i=1;i<=1000;i++){let an=-i*(i-a);b+=2;d=an*d+b;if(Math.abs(d)<1e-30)d=1e-30;c=b+an/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const delta=d*c;h*=delta;if(Math.abs(delta-1)<1e-13)break;}
    return Math.max(0,Math.min(1,e*h));
  }
  function render() {
    const year=yearSelect.value, type=typeSelect.value, mode=modeSelect.value;
    const label=mode==="first"?"第一位數":"第二位數";
    const subset=records.filter(r=>(year==="全部"||String(r.year)===year)&&(type==="全部"||r.category===type));
    const values=subset.map(r=>Number(r.amount)).filter(v=>digit(v,mode)!==null);
    const n=values.length, digits=mode==="first"?[1,2,3,4,5,6,7,8,9]:[0,1,2,3,4,5,6,7,8,9];
    const counts=digits.map(d=>values.filter(v=>digit(v,mode)===d).length);
    const expected=digits.map(d=>probability(d,mode));
    const actual=counts.map(c=>n?c/n:0);
    const chi=n?counts.reduce((s,c,i)=>s+Math.pow(c-n*expected[i],2)/(n*expected[i]),0):null;
    const p=chi===null?null:gammaQ((digits.length-1)/2,chi/2);
    const smallExpected=expected.some(v=>n*v<5);
    document.getElementById("procurementCount").textContent=fmt.format(n)+" 筆";
    document.getElementById("procurementMin").textContent=n?"NT$ "+fmt.format(Math.min(...values)):"—";
    document.getElementById("procurementMax").textContent=n?"NT$ "+fmt.format(Math.max(...values)):"—";
    document.getElementById("procurementPValue").textContent=p===null?"—":(p<0.0001?"< 0.0001":p.toFixed(4));
    document.getElementById("procurementChartTitle").textContent=label+"分布與班佛定律比較";
    document.getElementById("procurementTable").innerHTML='<table><thead><tr><th>'+label+'</th><th>筆數</th><th>實際比例</th><th>理論比例</th><th>差距（百分點）</th></tr></thead><tbody>'+digits.map((d,i)=>'<tr><td>'+d+'</td><td>'+counts[i]+'</td><td>'+(actual[i]*100).toFixed(2)+'%</td><td>'+(expected[i]*100).toFixed(2)+'%</td><td>'+((actual[i]-expected[i])*100).toFixed(2)+'</td></tr>').join('')+'</tbody></table>';
    const scope=year==="全部"?"四年合併":year+" 年";
    const info=[];
    info.push(scope+"／"+type+"共有 "+subset.length+" 筆公開紀錄，本次可分析 "+n+" 筆正數金額。");
    if(!n)info.push("沒有可分析的正數金額。");
    else {
      info.push("卡方統計量 χ² = "+chi.toFixed(2)+"（自由度 "+(digits.length-1)+"），p 值 "+(p<0.0001?"< 0.0001":p.toFixed(4))+"。");
      if(smallExpected)info.push("部分數字的理論期望筆數小於 5，卡方近似可能不可靠，請勿依 p 值下結論。");
      else info.push(p<0.05?"在 5% 顯著水準下，觀察分布與班佛理論有統計差異；這不代表舞弊。":"在 5% 顯著水準下，未觀察到足以拒絕班佛理論分布的統計證據；這不代表資料已被證明符合班佛定律。");
      if(n<100)info.push("本組樣本數較少，解讀須特別謹慎。");
    }
    info.push("分析保留原始公開紀錄，未另外排除契約變更、擴充或同案相關紀錄；本結果僅供教學與探索。");
    document.getElementById("procurementInterpretation").textContent=info.join(" ");
    document.getElementById("procurementYearSummary").innerHTML='<table><thead><tr><th>年度</th><th>公開紀錄</th><th>正數金額</th><th>工程類</th><th>財物類</th><th>勞務類</th></tr></thead><tbody>'+[111,112,113,114].map(y=>{const a=records.filter(r=>r.year===y);return '<tr><td>'+y+'</td><td>'+a.length+'</td><td>'+a.filter(r=>Number(r.amount)>0).length+'</td><td>'+a.filter(r=>r.category==="工程類").length+'</td><td>'+a.filter(r=>r.category==="財物類").length+'</td><td>'+a.filter(r=>r.category==="勞務類").length+'</td></tr>';}).join('')+'</tbody></table>';
    if(chart)chart.destroy();
    if(typeof Chart==="undefined") {document.getElementById("procurementInterpretation").textContent+=" 圖表函式庫未載入，請確認網路連線。";return;}
    chart=new Chart(document.getElementById("procurementCanvas"),{data:{labels:digits.map(String),datasets:[{type:"bar",label:"實際比例",data:actual.map(v=>v*100),backgroundColor:"rgba(177,195,164,.82)",borderColor:"#91aa87",borderWidth:1,borderRadius:5},{type:"line",label:"班佛理論比例",data:expected.map(v=>v*100),borderColor:"#78947b",backgroundColor:"#78947b",borderWidth:3,pointRadius:4,tension:.2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#59665b"}},tooltip:{callbacks:{label:c=>c.dataset.label+"："+c.parsed.y.toFixed(2)+"%"}}},scales:{x:{ticks:{color:"#59665b"},grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>v+"%",color:"#59665b"},grid:{color:"rgba(148,163,184,.15)"}}}}});
  }
  yearSelect.addEventListener("change",render);typeSelect.addEventListener("change",render);modeSelect.addEventListener("change",render);render();
})();
