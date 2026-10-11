
function analyze() {

  let values = [];

  // 取得使用者選擇的欄位
  const columnSelect = document.getElementById("columnSelect");

  // 如果有上傳資料，而且選擇了欄位
  if (uploadedData.length > 0 && columnSelect.value !== "") {

    const columnIndex = Number(columnSelect.value);

    // 從第二列開始讀取，跳過標題列
    values = uploadedData.slice(1).map(row => row[columnIndex]);

  } else {

    // 沒有選擇上傳欄位，就使用手動輸入的數字
    const input = document.getElementById("numbers").value;
    values = input.split(/[\s,，]+/);

  }

  // 3. 建立數字 1～9 的計數器
  const counts = Array(10).fill(0);
  let total = 0;

  // 4. 逐筆分析數字
  values.forEach(value => {
    const num = Number(value);

    // 排除空白、非數字、0
  if (
  value === null ||
  value === undefined ||
  String(value).trim() === "" ||
  !Number.isFinite(num) ||
  num === 0
  ) return;

    // 取得第一個有效數字
    const firstDigit = Number(
      Math.abs(num)
        .toExponential()
        .charAt(0)
    );

    if (firstDigit >= 1 && firstDigit <= 9) {
      counts[firstDigit]++;
      total++;
    }
  });

  // 5. 顯示分析結果
  let html = `<p>有效資料：${total} 筆</p>`;

  if (total === 0) {
  // 顯示無效資料提醒
  document.getElementById("result").innerHTML =
    "<p>請輸入至少一筆有效數字。</p>";

  // 清除舊圖表
  if (window.benfordChart) {
    window.benfordChart.destroy();
    window.benfordChart = null;
  }

  document.getElementById("chart").innerHTML = "";

  // 重設樣本數量與數量級跨度
  document.getElementById("sampleCheck").textContent = "尚未檢查";
  document.getElementById("magnitudeCheck").textContent = "尚未檢查";

  // 重設診斷報告
  document.getElementById("diagnosisResult").textContent =
    "尚未進行分析，請先輸入資料並執行分析。";

  return;
}

  // 適用性檢查：樣本數量
const sampleCheck = document.getElementById("sampleCheck");

if (total >= 1000) {
  sampleCheck.innerHTML = `
    <strong style="color:#5b9873;">✓ ${total} 筆</strong>
    <br>
    <small>達到建議的 1,000 筆以上</small>
  `;
} else {
  sampleCheck.innerHTML = `
    <strong style="color:#c58b48;">⚠ ${total} 筆</strong>
    <br>
    <small>建議至少 1,000 筆，以提高分析可靠性</small>
  `;
}

// 適用性檢查：數量級跨度
const magnitudeCheck = document.getElementById("magnitudeCheck");

// 將有效數字轉為絕對值
const validNumbers = values
  .map(value => Number(value))
  .filter(num => Number.isFinite(num) && num !== 0)
  .map(num => Math.abs(num));

// 計算最小與最大數值
const minValue = Math.min(...validNumbers);
const maxValue = Math.max(...validNumbers);

// 計算涵蓋多少個數量級
const minMagnitude = Math.floor(Math.log10(minValue));
const maxMagnitude = Math.floor(Math.log10(maxValue));

const magnitudeCount = maxMagnitude - minMagnitude + 1;

// 顯示結果
if (magnitudeCount >= 3) {
  magnitudeCheck.innerHTML = `
    <strong style="color:#5b9873;">✓ ${magnitudeCount} 個數量級</strong>
    <br>
    <small>資料涵蓋多個數量級，較適合班佛定律分析</small>
  `;
} else {
  magnitudeCheck.innerHTML = `
    <strong style="color:#c58b48;">⚠ ${magnitudeCount} 個數量級</strong>
    <br>
    <small>資料跨度較小，分析結果需謹慎解讀</small>
  `;
}

  html += "<table border='1' cellpadding='10'>";
  html += "<tr><th>首位數</th><th>次數</th><th>實際比例</th><th>班佛理論比例</th></tr>";

  for (let digit = 1; digit <= 9; digit++) {
    const actual = counts[digit] / total * 100;

    const expected =
      Math.log10(1 + 1 / digit) * 100;

    html += `
      <tr>
        <td>${digit}</td>
        <td>${counts[digit]}</td>
        <td>${actual.toFixed(2)}%</td>
        <td>${expected.toFixed(2)}%</td>
      </tr>
    `;
  }

  html += "</table>";



  document.getElementById("result").innerHTML = html;
  
 // 建立互動式班佛定律圖表
const labels = [];
const actualData = [];
const expectedData = [];
const upperData = [];

for (let digit = 1; digit <= 9; digit++) {
  const p = Math.log10(1 + 1 / digit);
  const actual = counts[digit] / total;

  // 95% 信賴區間上限（常態近似）
  const upper = Math.min(
    1,
    p + 1.96 * Math.sqrt(p * (1 - p) / total)
  );

  labels.push(String(digit));
  actualData.push(actual * 100);
  expectedData.push(p * 100);
  upperData.push(upper * 100);
}

// 04 診斷報告：分析首位數偏離情況
const diagnosisResult = document.getElementById("diagnosisResult");

const abnormalDigits = [];

for (let digit = 1; digit <= 9; digit++) {

  const actual = counts[digit] / total;
  const expected = Math.log10(1 + 1 / digit);

  // 計算理論比例的 95% 信賴區間
  const margin = 1.96 * Math.sqrt(
    expected * (1 - expected) / total
  );

  const lower = Math.max(0, expected - margin);
  const upper = Math.min(1, expected + margin);

  // 實際比例超出區間，列為值得注意的數字
  if (actual < lower || actual > upper) {
    abnormalDigits.push(digit);
  }
}

// 產生診斷報告
let diagnosisHTML = `<p><strong>有效資料：</strong>${total} 筆</p>`;

if (abnormalDigits.length === 0) {

  diagnosisHTML += `
    <p style="color:#5b9873;">
      ✓ 各首位數的實際比例均落在個別的 95% 信賴區間內。
    </p>
    <p>
      目前沒有發現明顯偏離的首位數，
      但仍需確認資料是否符合班佛定律的適用條件。
    </p>
  `;

} else {

  diagnosisHTML += `
    <p style="color:#c58b48;">
      ⚠ 發現 ${abnormalDigits.length} 個值得進一步觀察的首位數。
    </p>

    <p>
      <strong>值得注意的數字：</strong>
      ${abnormalDigits.join("、")}
    </p>

    <p>
      這些數字的實際比例超出個別的 95% 信賴區間，
      建議進一步檢查資料來源、數值分布與資料特性。
    </p>
  `;

}

diagnosisHTML += `
  <p>
    <strong>分析提醒：</strong>
    班佛定律的分布差異只能作為初步異常線索，
    不能單憑此結果認定資料遭到造假或竄改。
  </p>
`;

diagnosisResult.innerHTML = diagnosisHTML;

// 移除舊圖表，避免重複建立
if (window.benfordChart) {
  window.benfordChart.destroy();
}

// 建立圖表容器
document.getElementById("chart").innerHTML = `
  <h2>第一定律（首位數分布）</h2>
  <canvas id="benfordCanvas"></canvas>
`;

// 繪製圖表
const ctx = document.getElementById("benfordCanvas");

window.benfordChart = new Chart(ctx, {
  data: {
    labels: labels,
    datasets: [
      {
        type: "line",
        label: "95% 信賴區間（上限）",
        data: upperData,
        borderColor: "#c6ad8f",
        borderDash: [6, 6],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2
      },
      {
        type: "line",
        label: "理論值",
        data: expectedData,
        borderColor: "#78947b",
        backgroundColor: "#78947b",
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.2
      },
      {
        type: "bar",
        label: "實際值",
        data: actualData,
        backgroundColor: "rgba(177, 195, 164, 0.75)",
        borderColor: "#91aa87",
        borderWidth: 1,
        borderRadius: 5
      }
    ]
  },

  options: {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: "#59665b"
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.dataset.label + "：" +
              context.parsed.y.toFixed(2) + "%";
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#59665b"
        },
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#59665b",
          callback: function(value) {
            return value + "%";
          }
        },
        grid: {
          color: "rgba(148, 163, 184, 0.15)"
        }
      }
    }
  }
});

}

// 取得上傳區域與檔案輸入元件
const uploadArea = document.getElementById("uploadArea");
const dataFile = document.getElementById("dataFile");
const fileName = document.getElementById("fileName");

// 允許的檔案格式
const allowedExtensions = [".csv", ".xlsx", ".xls", ".tsv", ".txt"];

// 儲存讀取後的表格資料
let uploadedData = [];

// 處理選擇或拖入的檔案
async function handleFile(file) {
  if (!file) return;

  const name = file.name.toLowerCase();

  const isAllowed = allowedExtensions.some(ext => name.endsWith(ext));

  if (!isAllowed) {
    uploadedData = [];
    fileName.textContent = "不支援此檔案格式，請重新選擇。";
    return;
  }

  try {
    // 讀取檔案內容
let workbook;

if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {

  // 文字檔使用 UTF-8 解碼
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(buffer);

  // 將文字內容交給 SheetJS 解析
  workbook = XLSX.read(text, { type: "string" });

} else {

  // Excel 檔案維持原本讀取方式
  const buffer = await file.arrayBuffer();
  workbook = XLSX.read(buffer, { type: "array" });

}

    // 先讀取第一個工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 轉換成二維陣列
    uploadedData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: ""
    });

    // 取得欄位選擇區域
const columnSection = document.getElementById("columnSection");
const columnSelect = document.getElementById("columnSelect");

// 清空舊的欄位選項
columnSelect.innerHTML = '<option value="">請選擇欄位</option>';

// 使用第一列作為欄位名稱
const headers = uploadedData[0] || [];

// 建立欄位選項
headers.forEach((header, index) => {
  const option = document.createElement("option");

  option.value = index;
  option.textContent = header || "欄位 " + (index + 1);

  columnSelect.appendChild(option);
});

// 顯示欄位選擇區域
columnSection.style.display = "block";

    fileName.textContent =
      "已成功讀取：" + file.name +
      "（共 " + uploadedData.length + " 列資料）";

    console.log("讀取的資料：", uploadedData);

    // 顯示資料預覽
const previewSection = document.getElementById("previewSection");
const dataPreview = document.getElementById("dataPreview");

const previewRows = uploadedData.slice(0, 6);

const previewTable = document.createElement("table");

previewRows.forEach((row, rowIndex) => {
  const tr = document.createElement("tr");

  row.forEach(cell => {
    const td = document.createElement(rowIndex === 0 ? "th" : "td");
    td.textContent = cell;
    tr.appendChild(td);
  });

  previewTable.appendChild(tr);
});

dataPreview.replaceChildren(previewTable);
previewSection.style.display = "block";

  } catch (error) {
    uploadedData = [];
    fileName.textContent = "檔案讀取失敗，請確認格式是否正確。";
    console.error(error);
  }
}

// 點擊選擇檔案
dataFile.addEventListener("change", function () {
  handleFile(this.files[0]);
});

// 拖曳檔案進入區域
uploadArea.addEventListener("dragover", function (event) {
  event.preventDefault();
  uploadArea.classList.add("dragover");
});

// 拖曳檔案離開區域
uploadArea.addEventListener("dragleave", function () {
  uploadArea.classList.remove("dragover");
});

// 放開滑鼠，上傳檔案
uploadArea.addEventListener("drop", function (event) {
  event.preventDefault();

  uploadArea.classList.remove("dragover");

  const file = event.dataTransfer.files[0];

  handleFile(file);
});

// 適用性檢查：非編碼型資料
const dataTypeSelect = document.getElementById("dataTypeSelect");
const encodingCheck = document.getElementById("encodingCheck");

dataTypeSelect.addEventListener("change", function () {

  const selectedType = dataTypeSelect.value;

  if (selectedType === "natural") {
    encodingCheck.innerHTML = `
      <strong style="color:#5b9873;">✓ 初步符合</strong>
      <br>
      <small>屬於非編碼型數值，仍需確認資料的其他特性</small>
    `;

  } else if (selectedType === "code") {
    encodingCheck.innerHTML = `
      <strong style="color:#c65f5f;">✕ 不適合</strong>
      <br>
      <small>編碼型資料通常不適用班佛定律</small>
    `;

  } else {
    encodingCheck.innerHTML = `
      <strong style="color:#c58b48;">？尚未確認</strong>
      <br>
      <small>需要先確認資料的實際用途與性質</small>
    `;
  }

});

// 適用性檢查：非固定範圍
const rangeTypeSelect = document.getElementById("rangeTypeSelect");
const rangeCheck = document.getElementById("rangeCheck");

rangeTypeSelect.addEventListener("change", function () {

  const selectedRange = rangeTypeSelect.value;

  if (selectedRange === "unrestricted") {

    rangeCheck.innerHTML = `
      <strong style="color:#5b9873;">✓ 初步符合</strong>
      <br>
      <small>資料沒有明確的固定上下限</small>
    `;

  } else if (selectedRange === "restricted") {

    rangeCheck.innerHTML = `
      <strong style="color:#c65f5f;">✕ 不適合</strong>
      <br>
      <small>固定上下限可能影響首位數分布</small>
    `;

  } else {

    rangeCheck.innerHTML = `
      <strong style="color:#c58b48;">？尚未確認</strong>
      <br>
      <small>需要確認資料是否受到範圍限制</small>
    `;

  }

});

function clearNumbers() {
  // 清空手動輸入的數字
  document.getElementById("numbers").value = "";

  // 清除統計表格
  document.getElementById("result").innerHTML = "尚未進行分析";

  // 清除圖表
  if (window.benfordChart) {
    window.benfordChart.destroy();
    window.benfordChart = null;
  }

  document.getElementById("chart").innerHTML = "";

  // 重設樣本數量與數量級跨度
  document.getElementById("sampleCheck").textContent = "尚未檢查";
  document.getElementById("magnitudeCheck").textContent = "尚未檢查";

  // 重設診斷報告
  document.getElementById("diagnosisResult").textContent =
    "尚未進行分析，請先輸入資料並執行分析。";
    // 重設資料類型
document.getElementById("dataTypeSelect").value = "";
document.getElementById("encodingCheck").textContent = "尚未確認";

// 重設資料範圍
document.getElementById("rangeTypeSelect").value = "";
document.getElementById("rangeCheck").textContent = "尚未確認";
// 清除已上傳的資料
uploadedData = [];

// 清除檔案選擇紀錄
document.getElementById("dataFile").value = "";

// 重設檔案名稱提示
document.getElementById("fileName").textContent = "";

// 清除欄位選擇
document.getElementById("columnSelect").innerHTML =
  '<option value="">請選擇欄位</option>';

// 隱藏欄位選擇區域
document.getElementById("columnSection").style.display = "none";

// 清除資料預覽
document.getElementById("dataPreview").innerHTML = "";

// 隱藏資料預覽區域
document.getElementById("previewSection").style.display = "none";
}

// 載入世界銀行 2024 年人口資料
async function loadExampleData() {
  try {
    const response = await fetch(
      "./World_Bank_Population_2024_Countries.csv"
    );

    if (!response.ok) {
      throw new Error("無法讀取範例資料");
    }

    const csvText = await response.text();

    // 使用網站已載入的 XLSX 函式庫解析 CSV
    const workbook = XLSX.read(csvText, { type: "string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1
    });

    const headers = rows[0];
    const populationIndex = headers.indexOf("Population 2024");

    if (populationIndex === -1) {
      throw new Error("找不到人口資料欄位");
    }

    const numbers = rows.slice(1)
      .map(row => Number(row[populationIndex]))
      .filter(num => Number.isFinite(num) && num > 0);

    // 避免先前上傳的檔案覆蓋手動輸入資料
    // 清除之前上傳的檔案資料
uploadedData = [];

document.getElementById("columnSelect").value = "";

// 清除檔案選擇紀錄
document.getElementById("dataFile").value = "";

// 清除舊的檔案名稱
document.getElementById("fileName").textContent = "";

// 隱藏欄位選擇與資料預覽
document.getElementById("columnSection").style.display = "none";
document.getElementById("previewSection").style.display = "none";

    // 將人口數字填入輸入框
    document.getElementById("numbers").value =
      numbers.join("\n");

    alert(`已載入 ${numbers.length} 筆世界人口資料！`);

  } catch (error) {
    alert("載入失敗：" + error.message);
  }
}