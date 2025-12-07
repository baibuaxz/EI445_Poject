// --- CONFIGURATION ---
const API_URL = "https://script.google.com/macros/s/AKfycbwoqZz-CPgv27QHbxd7KDQikGjQ-VNPUkjN9WSsPPD83agqJEykhzqXGDFl2ThAEYIAPw/exec";
const BUDGET_LIMIT = 1500; 

document.addEventListener("DOMContentLoaded", async () => {
    Chart.defaults.font.family = "'Prompt', sans-serif";
    Chart.defaults.color = '#888888';

    const hasDashboard = document.getElementById('display-amount');
    const hasUsageChart = document.getElementById('usageChart');
    const hasWarningChart = document.getElementById('warningChart');
    const hasPieChart = document.getElementById('pieChart');

    if (!hasDashboard && !hasUsageChart && !hasWarningChart && !hasPieChart) return;

    try {
        const data = await fetchData();
        
        if (hasDashboard) renderDashboard(data);
        if (hasUsageChart) renderUsagePage(data);
        if (hasWarningChart) renderWarningPage(data);
        if (hasPieChart) renderBreakdownPage(data);

    } catch (error) {
        console.error("Error loading data:", error);
        if(hasDashboard) document.getElementById('display-amount').innerText = "Error";
    }
});

// [แก้ไข 1] เพิ่ม ?t=... เพื่อป้องกัน Browser จำค่าเดิม (Cache Busting)
async function fetchData() {
    const noCacheUrl = API_URL + "?t=" + new Date().getTime();
    const response = await fetch(noCacheUrl);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
}

// [แก้ไข 2] ฟังก์ชันสุ่มแถวแนวนอน (Random Row Start)
function getRandomWindow(dataArray, windowSize) {
    if (!dataArray || dataArray.length <= windowSize) return dataArray;
    
    // คำนวณหาแถวเริ่มต้นแบบสุ่ม
    const maxStartIndex = dataArray.length - windowSize;
    const startIndex = Math.floor(Math.random() * maxStartIndex);
    
    // Log บอกใน Console ว่าสุ่มได้แถวไหน (เช็คได้โดยกด F12)
    console.log(`🎲 สุ่มได้แถวที่: ${startIndex + 1} ถึง ${startIndex + windowSize}`);
    
    // ตัดข้อมูลจากแถวนั้นมาตามจำนวนที่ต้องการ
    return dataArray.slice(startIndex, startIndex + windowSize);
}

// --- 1. DASHBOARD (แก้ใหม่: คำนวณเงินตามช่วงเวลาที่สุ่มได้) ---
function renderDashboard(data) {
    const usageLog = data.usage;
    
    // ถ้าไม่มีข้อมูล ให้จบการทำงาน
    if (!usageLog || usageLog.length === 0) return;

    // 1. สุ่ม "จุดเวลาปัจจุบัน" (Simulate Current Time)
    // สุ่ม index ตั้งแต่ 10% ของข้อมูล ถึง 100% ของข้อมูล
    // เพื่อจำลองว่าเราเปิดแอปดูตอนต้นเดือน กลางเดือน หรือปลายเดือน
    const minIndex = Math.floor(usageLog.length * 0.1); 
    const maxIndex = usageLog.length - 1;
    const randomIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;

    // 2. คำนวณ "ยอดเงินสะสม" ตั้งแต่ต้นเดือน จนถึงจุดที่สุ่มได้
    let calculatedBill = 0;
    for (let i = 0; i <= randomIndex; i++) {
        // บวกค่าไฟสะสมทีละแถว
        calculatedBill += parseFloat(usageLog[i].cost_baht || 0);
    }

    // 3. แสดงผลยอดเงินที่คำนวณได้
    animateValue("display-amount", 0, calculatedBill, 1000);

    // 4. อัปเดต Progress Bar
    const percent = (calculatedBill / BUDGET_LIMIT) * 100;
    const fillElem = document.getElementById('progress-fill');
    const textElem = document.getElementById('progress-text');
    
    if (fillElem) {
        fillElem.style.width = `${Math.min(percent, 100)}%`;
        fillElem.style.backgroundColor = percent > 80 ? '#FF5252' : '#333333'; // แดงถ้าเกิน 80%
    }
    if (textElem) {
        textElem.innerText = `${Math.floor(calculatedBill)} ฿ จาก ${BUDGET_LIMIT} ฿`;
    }

    // 5. อัปเดตเวลาล่าสุด (ตามจุดที่สุ่มได้)
    const currentLog = usageLog[randomIndex];
    const dateObj = new Date(currentLog.timestamp);
    const dateStr = dateObj.toLocaleDateString('th-TH', { 
        day: 'numeric', month: 'short', year: '2-digit', 
        hour: '2-digit', minute:'2-digit' 
    });
    
    const updateElem = document.getElementById('last-update');
    if (updateElem) updateElem.innerText = `อัปเดตล่าสุด: ${dateStr}`;
}

// --- 2. USAGE PAGE (สุ่มกราฟ) ---
function renderUsagePage(data) {
    const usageLog = data.usage;
    if (!usageLog || usageLog.length === 0) return;

    // สุ่มตัดมา 10 แถว
    const randomLogs = getRandomWindow(usageLog, 10);
    
    const labels = randomLogs.map(log => {
        const d = new Date(log.timestamp);
        return d.getHours() + ":" + (d.getMinutes()<10?'0':'') + d.getMinutes();
    });
    const dataPoints = randomLogs.map(log => parseFloat(log.kwh_usage));

    const ctx = document.getElementById('usageChart');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'การใช้ไฟ (kWh)',
                data: dataPoints,
                borderColor: '#333333',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#333'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { display: false, beginAtZero: true }
            }
        }
    });

    // Insight ข้อมูลล่าสุด (เอาตัวสุดท้ายของช่วงที่สุ่มมา)
    const lastLog = randomLogs[randomLogs.length - 1];
    
    setText('insight-room', lastLog.room_number);
    setText('insight-power', lastLog.power_watts + " W");
    setText('insight-cost', parseFloat(lastLog.cost_baht).toFixed(2) + " ฿");
}

// --- 3. WARNING PAGE (แก้ใหม่: ใช้ข้อมูลทั้งหมด + เส้นงบประมาณ + กราฟสวยงาม) ---
function renderWarningPage(data) {
    const usageLog = data.usage;
    if (!usageLog || usageLog.length === 0) return;

    // 1. เตรียมข้อมูล (ใช้ข้อมูลทั้งหมด ไม่มีการสุ่ม)
    let cumulativeCost = 0;
    const costData = [];
    const budgetData = [];
    const labels = [];

    usageLog.forEach(log => {
        // คำนวณค่าไฟสะสม
        cumulativeCost += parseFloat(log.cost_baht);
        costData.push(cumulativeCost);
        
        // สร้างเส้นงบประมาณ (เส้นตรงแนวนอนคงที่)
        budgetData.push(BUDGET_LIMIT);

        // สร้าง Label วันที่ (เช่น 5/12 14:00)
        const d = new Date(log.timestamp);
        const dateStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:00`;
        labels.push(dateStr);
    });

    // 2. สร้าง Gradient สีแดงสวยๆ
    const ctx = document.getElementById('warningChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(255, 82, 82, 0.6)'); // สีแดงเข้มด้านบน
    gradient.addColorStop(1, 'rgba(255, 82, 82, 0.0)'); // สีจางหายด้านล่าง

    // 3. วาดกราฟ
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ค่าไฟสะสมจริง',
                    data: costData,
                    borderColor: '#FF5252', // สีแดง
                    backgroundColor: gradient, // ถมสีไล่เฉด
                    borderWidth: 2,
                    tension: 0.4, // เส้นโค้ง
                    pointRadius: 0, // ซ่อนจุดเพื่อให้กราฟดูสะอาดตา (เพราะข้อมูลเยอะ)
                    pointHoverRadius: 6, // โชว์จุดเมื่อเอาเมาส์ชี้
                    fill: true,
                    order: 1
                },
                {
                    label: `งบประมาณ (${BUDGET_LIMIT} บ.)`,
                    data: budgetData,
                    borderColor: '#333333', // สีดำ
                    borderWidth: 1.5,
                    borderDash: [5, 5], // เส้นประ
                    pointRadius: 0,
                    fill: false,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true, // โชว์ชื่อเส้นกราฟ
                    labels: { usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + Math.floor(context.raw) + ' บาท';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 6, // จำกัดจำนวนวันที่โชว์ ไม่ให้รก
                        maxRotation: 0
                    }
                },
                y: {
                    display: true, // โชว์แกน Y (จำนวนเงิน)
                    beginAtZero: true,
                    grid: { color: '#f5f5f5' }
                }
            }
        }
    });

    window.userProfile = data.profile;
}

// --- 4. BREAKDOWN PAGE ---
function renderBreakdownPage(data) {
    const usageLog = data.usage;
    if (!usageLog || usageLog.length === 0) return;

    // หน้านี้ใช้ข้อมูลทั้งหมด (ไม่สุ่ม) เพื่อดูภาพรวม
    let dayUsage = 0;
    let nightUsage = 0;

    usageLog.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        const kwh = parseFloat(log.kwh_usage);
        
        if (hour >= 9 && hour < 22) {
            dayUsage += kwh;
        } else {
            nightUsage += kwh;
        }
    });

    const total = dayUsage + nightUsage;
    const dayPercent = total > 0 ? ((dayUsage / total) * 100).toFixed(0) : 0;
    const nightPercent = total > 0 ? ((nightUsage / total) * 100).toFixed(0) : 0;

    setText('legend-day', `กลางวัน ${dayPercent}% (Off-Peak)`);
    setText('legend-night', `กลางคืน ${nightPercent}% (Peak)`);

    const ctx = document.getElementById('pieChart');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['กลางวัน', 'กลางคืน'],
            datasets: [{
                data: [dayUsage, nightUsage],
                backgroundColor: ['#E0E0E0', '#333333'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { display: false } }
        }
    });
}

// --- HELPER FUNCTIONS ---
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- INTERACTION ---
function showPlanList() {
    const startStep = document.getElementById('step-start');
    const selectionStep = document.getElementById('step-selection');
    if(startStep) startStep.style.display = 'none';
    if(selectionStep) {
        selectionStep.classList.remove('hidden');
        selectionStep.classList.add('fade-in');
    }
}

function showPlanDetail(planType) {
    const resultSection = document.getElementById('step-result');
    const title = document.getElementById('result-title');
    const desc = document.getElementById('result-desc');
    const amount = document.getElementById('result-amount');

    const plans = {
        'lite': {
            title: 'แผน Lite (เริ่มต้น)',
            desc: 'เน้นการปิดไฟและถอดปลั๊กเมื่อไม่ใช้งาน ไม่กระทบชีวิตประจำวันมากนัก',
            amount: '50 - 80 บาท'
        },
        'balance': {
            title: 'แผน Balance (แนะนำ)',
            desc: 'ปรับอุณหภูมิแอร์เป็น 26°C และหลีกเลี่ยงการใช้ไฟช่วง Peak (13:00-15:00)',
            amount: '150 - 200 บาท'
        },
        'max': {
            title: 'แผน Max (ประหยัดสูงสุด)',
            desc: 'งดใช้เครื่องทำน้ำอุ่น เครื่องอบผ้า และเปิดแอร์เฉพาะห้องนอนตอนกลางคืนเท่านั้น',
            amount: '300+ บาท'
        }
    };

    if (plans[planType]) {
        if(title) title.innerText = plans[planType].title;
        if(desc) desc.innerText = plans[planType].desc;
        if(amount) amount.innerText = plans[planType].amount;
        
        if(resultSection) {
            resultSection.classList.remove('hidden');
            resultSection.classList.add('fade-in');
            if (window.innerWidth < 768) {
                resultSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }
    }
}