"use strict";
(function () {
  const records = window.procurementRecords || [];
  const select = document.getElementById("procurementCategory");
  if (!select) return;
  const benford = (d, mode) => {
    if (mode === "first") return Math.log10(1 + 1 / d);
    let result = 0;
    for (let k = 1; k <= 9; k++) result += Math.log10(1 + 1 / (10*k+d));
    return result;
  };
  const digitModeSelect = document.getElementById("procurementDigitMode");
  const fmt = new Intl.NumberFormat("zh-TW", {maximumFractionDigits:0});
  let chart = null;
  function render() {
    const type = select.value;
    const mode = digitModeSelect.value;
    const digitLabel = mode === "first" ? "第一位數" : "第二位數";
    const selected = records.filter(r => type === "全部" || r.category === type);
    const values = selected.map(r => Number(r.amount)).filter(v => Number.isFinite(v) && v > 0 && (mode === "first" || Math.abs(v).toString().replace(/e[+-]?\d+$/i, "").replace(".", "").replace(/^0+/, "").length >= 2));
    const n = values.length;
    const counts = Array(10).fill(0);
    for (const v of values) {
      const digit = Number(v.toExponential(14).split("e")[0].replace(".", "").charAt(mode === "first" ? 0 : 1));
      if (Number.isInteger(digit) && digit >= 0 && digit <= 9 && (mode === "second" || digit >= 1)) counts[digit]++;
    }
    document.getElementById("procurementCount").textContent = fmt.format(n) + " 筆";
    document.getElementById("procurementMin").textContent = n ? "NT$ " + fmt.format(Math.min(...values)) : "—";
    document.getElementById("procurementMax").textContent = n ? "NT$ " + fmt.format(Math.max(...values)) : "—";
    const digits = mode === "first" ? Array.from({length:9}, (_,i)=>i+1) : Array.from({length:10}, (_,i)=>i);
    const expected = digits.map(d => benford(d, mode));
    const actual = digits.map(d => n ? counts[d]/n : 0);
    document.getElementById("procurementChartTitle").textContent = digitLabel + "分布與班佛定律比較";
    document.getElementById("procurementTable").innerHTML = '<table><thead><tr><th>${digitLabel}</th><th>筆數</th><th>實際比例</th><th>理論比例</th><th>差距（百分點）</th></tr></thead><tbody>' + digits.map((d,i)=>`<tr><td>${d}</td><td>${counts[d]}</td><td>${(actual[i]*100).toFixed(2)}%</td><td>${(expected[i]*100).toFixed(2)}%</td><td>${((actual[i]-expected[i])*100).toFixed(2)}</td></tr>`).join('') + '</tbody></table>';
    const interpretation = document.getElementById("procurementInterpretation");
    interpretation.textContent = n < 1000 ? `目前「${type}」只有 ${n} 筆，未達網站建議的 1,000 筆樣本門檻；加上資料蒐集不完整，分布差異只能用於探索性展示，不能推論整體採購或認定舞弊。` : `目前「${type}」有 ${n} 筆；仍需檢查資料完整性、抽樣方式與金額限制，才能評估班佛定律適用性。`;
    if (chart) chart.destroy();
    if (typeof Chart === 'undefined') { interpretation.textContent += ' 圖表函式庫未載入，請確認網路連線。'; return; }
    chart = new Chart(document.getElementById("procurementCanvas"), {
      data: {labels:digits.map(String),datasets:[
        {type:'bar',label:'實際比例',data:actual.map(v=>v*100),backgroundColor:'rgba(177,195,164,.82)',borderColor:'#91aa87',borderWidth:1,borderRadius:5},
        {type:'line',label:'班佛理論比例',data:expected.map(v=>v*100),borderColor:'#78947b',backgroundColor:'#78947b',borderWidth:3,pointRadius:4,tension:.2}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#59665b'}},tooltip:{callbacks:{label:c=>c.dataset.label+'：'+c.parsed.y.toFixed(2)+'%'}}},scales:{x:{ticks:{color:'#59665b'},grid:{display:false}},y:{beginAtZero:true,ticks:{callback:v=>v+'%',color:'#59665b'},grid:{color:'rgba(148,163,184,.15)'}}}}
    });
  }
  select.addEventListener('change',render);
  digitModeSelect.addEventListener('change',render);
  render();
})();
