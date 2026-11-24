'use strict';

// ── 탭: 버튼의 data-panel 값 = section의 id ──
const tabButtons = [...document.querySelectorAll('.tab-btn')];
const charts = {};

function showPanel(panelId) {
  tabButtons.forEach((btn) => {
    const selected = btn.dataset.panel === panelId;
    btn.setAttribute('aria-pressed', String(selected));
    document.getElementById(btn.dataset.panel).hidden = !selected;
  });
  // 숨겨졌던 그래프는 보인 뒤 크기를 다시 맞춘다
  requestAnimationFrame(() => charts[panelId]?.resize());
}

// <button>이라 Tab으로 이동하고 Enter·Space로 click이 발생한다
tabButtons.forEach((btn) => btn.addEventListener('click', () => showPanel(btn.dataset.panel)));

// ── CSV 읽기(Papa Parse) ──
const NUMBER = /^(?:\d+\.?\d*|\.\d+)$/;

async function loadCsv(path, columns) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} 요청 실패 (${response.status})`);
  const result = Papa.parse(await response.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  if (result.errors.length) throw new Error(`${path} ${result.errors[0].row + 2}행: ${result.errors[0].message}`);
  const fields = result.meta.fields;
  const missing = columns.filter((c) => !fields.includes(c));
  if (missing.length) throw new Error(`${path}에 ${missing.join(', ')} 열이 없습니다.`);
  if (new Set(fields).size !== fields.length) throw new Error(`${path}에 중복된 열이 있습니다.`);
  if (!result.data.length) throw new Error(`${path}에 데이터 행이 없습니다.`);
  return result.data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, (v ?? '').trim()])));
}

// 빈 값은 0이 아니라 null(미공개)로 둔다. 숫자가 아닌 값은 오류로 처리한다.
function toNumber(value, where, allowEmpty = false) {
  if (value === '' && allowEmpty) return null;
  if (!NUMBER.test(value)) throw new Error(`${where}: "${value}"은(는) 올바른 수치가 아닙니다.`);
  return Number(value);
}

function salesChart(rows) {
  const data = rows.map((r, i) => {
    const where = `popmart_sales.csv ${i + 2}행`;
    if (!/^\d{4}$/.test(r.year)) throw new Error(`${where}: 연도가 올바르지 않습니다.`);
    return {
      year: r.year,
      china: toNumber(r.china_mainland, where),
      overseas: toNumber(r.overseas_total, where),
      eastAsia: toNumber(r.east_asia_hmt, where, true),
    };
  }).sort((a, b) => a.year - b.year); // 시간순 정렬

  const series = [
    ['중국 내륙', 'china', '#d9667a'],
    ['홍콩·마카오·대만 및 해외 합계', 'overseas', '#5b5f97'],
    ['동아시아·홍콩·마카오·대만 (한국·일본 포함)', 'eastAsia', '#e8a23c'],
  ];
  charts['panel-sales'] = new Chart(document.getElementById('chart-sales'), {
    type: 'line',
    data: {
      labels: data.map((d) => d.year),
      datasets: series.map(([label, key, color]) => ({
        label, data: data.map((d) => d[key]), borderColor: color, backgroundColor: color, tension: 0.2, pointRadius: 5,
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false, spanGaps: false,
      plugins: {
        title: { display: true, text: '지역별 연간 매출 (억 위안)' },
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y == null ? '미공개' : c.parsed.y.toFixed(2) + '억 위안'}` } },
      },
      scales: {
        x: { title: { display: true, text: '회계연도' } },
        y: { beginAtZero: true, title: { display: true, text: '매출 (억 위안)' } },
      },
    },
  });
  return data.length;
}

function audienceChart(rows) {
  const data = rows.map((r, i) => {
    const where = `popmart_audience.csv ${i + 2}행`;
    if (!r.metric || !r.group || !r.year) throw new Error(`${where}에 빈 값이 있습니다.`);
    const percent = toNumber(r.percent, where);
    if (percent > 100) throw new Error(`${where}: 비율은 100 이하여야 합니다.`);
    return { ...r, percent };
  });
  const isCore = (d) => d.group === '핵심 사용자';
  charts['panel-audience'] = new Chart(document.getElementById('chart-audience'), {
    type: 'bar',
    data: {
      labels: data.map((d) => `${d.metric} (${d.year})`),
      datasets: [{ label: '비율 (%)', data: data.map((d) => d.percent), backgroundColor: data.map((d) => (isCore(d) ? '#d9667a' : '#6fb3c8')) }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: '고객층 지표 (%) · 분홍: 핵심 사용자(2020) · 파랑: 중국 내륙 회원(2025)' },
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${data[c.dataIndex].group}: ${c.parsed.x}%` } },
      },
      scales: {
        x: { beginAtZero: true, max: 100, title: { display: true, text: '비율 (%)' } },
        y: { ticks: { autoSkip: false } },
      },
    },
  });
  return data.length;
}

async function init() {
  const status = document.getElementById('status');
  try {
    if (typeof Papa === 'undefined') throw new Error('Papa Parse를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');
    if (typeof Chart === 'undefined') throw new Error('Chart.js를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.');
    const [sales, audience] = await Promise.all([
      loadCsv('data/popmart_sales.csv', ['year', 'china_mainland', 'overseas_total', 'east_asia_hmt']),
      loadCsv('data/popmart_audience.csv', ['metric', 'percent', 'group', 'year']),
    ]);
    const nSales = salesChart(sales);
    const nAudience = audienceChart(audience);
    status.textContent = `매출 ${nSales}개 연도와 고객층 지표 ${nAudience}개를 불러왔습니다.`;
    status.classList.add('ok');
  } catch (error) {
    status.textContent = `데이터를 표시할 수 없습니다: ${error.message}`;
  }
}

showPanel('panel-sales'); // 첫 접속에는 첫 탭만 보인다
init();
