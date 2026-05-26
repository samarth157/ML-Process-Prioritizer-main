// Live animated visualization for process states: WAITING → RUNNING → FINISHED

let processMap = {};
let prevProcs = {};
let dashboard, queues;

function stateIcon(state) {
    if (state === "WAITING") return "🕓";
    if (state === "RUNNING") return "🚀";
    if (state === "FINISHED") return "✅";
    return "";
}

function hslForPriorityAge(priority, age, state) {
    
    if (state === "WAITING") {
        const sat = 70 + Math.min(priority * 6, 25);
        const light = 60 - Math.min(age * 2, 20);
        return `hsl(45,${sat}%,${light}%)`;
    }
    if (state === "RUNNING") {
        const sat = 70 + Math.min(priority * 6, 25);
        const light = 45 - Math.min(age * 1.5, 15);
        return `hsl(145,${sat}%,${light}%)`;
    }
    return "";
}

function createProcessCard(proc) {
    const card = document.createElement('div');
    card.className = `process-card ${proc.state}`;
    card.dataset.id = proc.id;
    card.dataset.priority = proc.priority;
    card.dataset.state = proc.state;
    card.innerHTML = `
        <div class="proc-id">${stateIcon(proc.state)} #${proc.id}</div>
        <div class="proc-prio">P: <span class="prio-val">${proc.priority}</span></div>
        <div class="proc-age">Age: <span class="age-val">${proc.age}</span></div>
        <div class="progress-bar"></div>
    `;
    card.title = `Sys Load: ${proc.sys_load?.toFixed(2)}\nMem: ${proc.mem_usage}\nCPU: ${proc.cpu_util?.toFixed(2)}%`;
    card.style.background = hslForPriorityAge(proc.priority, proc.age, proc.state);
    return card;
}

function updateProcessCard(card, proc, prevState) {
    card.className = `process-card ${proc.state}`;
    card.dataset.priority = proc.priority;
    card.dataset.state = proc.state;
    card.querySelector('.prio-val').textContent = proc.priority;
    card.querySelector('.age-val').textContent = proc.age;
    card.title = `Sys Load: ${proc.sys_load?.toFixed(2)}\nMem: ${proc.mem_usage}\nCPU: ${proc.cpu_util?.toFixed(2)}%`;
    card.style.background = hslForPriorityAge(proc.priority, proc.age, proc.state);
    card.querySelector('.proc-id').innerHTML = `${stateIcon(proc.state)} #${proc.id}`;
    
    if (prevState && proc.priority > prevState.priority) {
        card.querySelector('.prio-val').classList.add('prio-glow');
        setTimeout(() => card.querySelector('.prio-val').classList.remove('prio-glow'), 600);
    }
    
    card.style.filter = `brightness(${1 - Math.min(proc.age, 10) * 0.04})`;
    
    const bar = card.querySelector('.progress-bar');
    if (proc.state === 'RUNNING') {
        bar.style.display = 'block';
        bar.style.width = '0%';
        setTimeout(() => { bar.style.width = '100%'; }, 10);
    } else {
        bar.style.display = 'none';
        bar.style.width = '0%';
    }
}

function moveCardToPool(card, state) {
    const pool = document.getElementById(state.toLowerCase() + '-pool');
    if (pool && card.parentNode !== pool) {
        pool.appendChild(card);
        card.classList.add('move-anim');
        setTimeout(() => card.classList.remove('move-anim'), 400);
    }
}

export function initVisualization() {
    
    dashboard = document.createElement('div');
    dashboard.id = 'proc-dashboard';
    dashboard.innerHTML = `
      <span id="count-waiting">🕓 0</span>
      <span id="count-running">🚀 0</span>
      <span id="count-finished">✅ 0</span>
    `;
    dashboard.style.cssText = "display:flex;gap:32px;justify-content:center;font-size:1.2em;margin:18px 0;";
    document.body.insertBefore(dashboard, document.querySelector('.ptable-container'));

    
    queues = document.createElement('div');
    queues.id = 'queues';
    queues.innerHTML = `
      <div id="waiting-pool" class="queue"><div class="queue-label">🕓 Waiting</div></div>
      <div id="running-pool" class="queue"><div class="queue-label">🚀 Running</div></div>
      <div id="finished-pool" class="queue"><div class="queue-label">✅ Finished</div></div>
    `;
    document.body.insertBefore(queues, document.querySelector('.ptable-container'));

    
    if (!document.getElementById('viz-style')) {
        const style = document.createElement('style');
        style.id = 'viz-style';
        style.textContent = `
#queues {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    margin: 32px auto 18px auto;
    max-width: 900px;
}
.queue {
    flex: 1;
    min-height: 120px;
    background: #f8fafc;
    border-radius: 12px;
    margin: 0 6px;
    padding: 18px 8px 12px 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    position: relative;
    transition: background 0.3s;
}
.queue-label {
    position: absolute;
    top: 4px;
    left: 16px;
    font-weight: 600;
    color: #888;
    font-size: 1.1em;
    letter-spacing: 1px;
}
.process-card {
    width: 90px;
    height: 90px;
    margin: 10px auto 0 auto;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.09);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.08em;
    color: #fff;
    position: relative;
    transition: background 0.4s, filter 0.4s, transform 0.4s, opacity 0.4s;
    opacity: 1;
    background: #bbb;
    cursor: pointer;
    animation: fadeInScale 0.5s cubic-bezier(.4,2,.6,1) backwards;
}
@keyframes fadeInScale {
    0% { opacity: 0; transform: scale(0.7);}
    100% { opacity: 1; transform: scale(1);}
}
.process-card.WAITING { background: hsl(45, 90%, 55%); }
.process-card.RUNNING { background: hsl(145, 70%, 45%); }
.process-card.FINISHED { background: hsl(220, 15%, 60%); opacity: 0.6; }
.process-card.move-anim { animation: moveCard 0.4s cubic-bezier(.4,2,.6,1); }
@keyframes moveCard {
    0% { transform: scale(1.08) translateY(-10px);}
    100% { transform: scale(1) translateY(0);}
}
.process-card .proc-id { font-size: 1.2em; margin-bottom: 2px; }
.process-card .proc-prio { font-size: 1.05em; }
.process-card .proc-age { font-size: 0.98em; margin-top: 2px; }
.process-card .prio-val { transition: box-shadow 0.3s; }
.process-card .prio-glow { box-shadow: 0 0 8px 2px #fffbe6, 0 0 16px 4px #ffe066; }
.process-card .progress-bar {
    position: absolute;
    bottom: 8px; left: 10px; right: 10px;
    height: 7px;
    border-radius: 6px;
    background: linear-gradient(90deg, #fffbe6 0%, #ffe066 100%);
    width: 0%;
    transition: width 1.8s linear;
    display: none;
}
@media (max-width: 900px) {
    #queues { flex-direction: column; gap: 10px; }
    .queue { min-height: 80px; }
    .process-card { width: 70px; height: 70px; font-size: 0.98em; }
}
        `;
        document.head.appendChild(style);
    }
}

async function renderGanttChart() {
    const container = document.getElementById('gantt-chart');
    if (!container) return;
    container.innerHTML = '<div class="gantt-title">Process Timeline (Gantt Chart)</div>';
    let resp;
    try {
        resp = await fetch('process_gantt.json?' + Date.now());
        if (!resp.ok) {
            container.innerHTML += '<div style="color:#888;font-size:0.98em;">No Gantt data yet.</div>';
            return;
        }
    } catch {
        container.innerHTML += '<div style="color:#888;font-size:0.98em;">No Gantt data yet.</div>';
        return;
    }
    const gantt = await resp.json();
    if (!gantt.length) {
        container.innerHTML += '<div style="color:#888;font-size:0.98em;">No Gantt data yet.</div>';
        return;
    }
    // Group intervals by process id
    const byProc = {};
    let minTime = Infinity, maxTime = -Infinity;
    gantt.forEach(entry => {
        if (!byProc[entry.id]) byProc[entry.id] = [];
        byProc[entry.id].push(entry);
        if (entry.start < minTime) minTime = entry.start;
        if (entry.end > maxTime) maxTime = entry.end;
    });
    const totalTime = maxTime - minTime || 1;
    // Sort process ids
    const procIds = Object.keys(byProc).map(Number).sort((a, b) => a - b);
    // Chart dimensions
    const chartWidth = 700;
    const rowHeight = 28;
    const barHeight = 18;
    // Build chart
    let html = `<div class="gantt-rows" style="width:${chartWidth}px">`;
    procIds.forEach(pid => {
        html += `<div class="gantt-row" style="height:${rowHeight}px">`;
        html += `<span class="gantt-label">P${pid+1}</span>`;
        html += `<div class="gantt-bars">`;
        byProc[pid].forEach(interval => {
            const left = ((interval.start - minTime) / totalTime) * 100;
            const width = ((interval.end - interval.start) / totalTime) * 100;
            html += `<div class="gantt-bar" title="Start: ${interval.start.toFixed(2)}s, End: ${interval.end.toFixed(2)}s"
                style="left:${left}%;width:${width}%;height:${barHeight}px"></div>`;
        });
        html += `</div></div>`;
    });
    html += `</div>`;
    container.innerHTML += html;
}

export async function updateVisualization() {
    try {
        const resp = await fetch('process_table.json?' + Date.now());
        if (!resp.ok) return;
        const procs = await resp.json();
        const seen = {};
        let countWaiting = 0, countRunning = 0, countFinished = 0;
        procs.forEach(proc => {
            let card = processMap[proc.id];
            if (!card) {
                card = createProcessCard(proc);
                processMap[proc.id] = card;
                moveCardToPool(card, proc.state);
            } else {
                
                if (card.className.indexOf(proc.state) === -1) {
                    moveCardToPool(card, proc.state);
                }
                updateProcessCard(card, proc, prevProcs[proc.id]);
            }
            updateProcessCard(card, proc, prevProcs[proc.id]);
            seen[proc.id] = true;
            if (proc.state === "WAITING") countWaiting++;
            else if (proc.state === "RUNNING") countRunning++;
            else if (proc.state === "FINISHED") countFinished++;
        });
        
        Object.keys(processMap).forEach(id => {
            if (!seen[id]) {
                const card = processMap[id];
                card.parentNode && card.parentNode.removeChild(card);
                delete processMap[id];
            }
        });
        
        document.getElementById('count-waiting').textContent = `🕓 ${countWaiting}`;
        document.getElementById('count-running').textContent = `🚀 ${countRunning}`;
        document.getElementById('count-finished').textContent = `✅ ${countFinished}`;
        
        prevProcs = {};
        procs.forEach(proc => prevProcs[proc.id] = {...proc});
    } catch (e) {
        // ignore
    }
    // --- Render Gantt chart ---
    renderGanttChart();
}
