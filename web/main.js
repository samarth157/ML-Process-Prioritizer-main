import { initVisualization, updateVisualization } from './visualize.js';

const statusDiv = document.getElementById('status');
function formatMem(val) {
    if (val > 1000000) return (val/1000000).toFixed(2) + " GB";
    if (val > 1000) return (val/1000).toFixed(2) + " MB";
    return val + " KB";
}
async function fetchTable() {
    statusDiv.textContent = "Loading...";
    try {
        const resp = await fetch('process_table.json?' + Date.now());
        if (!resp.ok) {
            statusDiv.textContent = "Waiting for process_table.json... (Run the simulation and ensure the file is in the web directory)";
            document.querySelector('#ptable tbody').innerHTML = '';
            return;
        }
        const data = await resp.json();
        const tbody = document.querySelector('#ptable tbody');
        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.priority}</td>
                <td>${row.age}</td>
                <td><span class="badge ${row.state}">${row.state}</span></td>
                <td>${row.sys_load !== undefined ? row.sys_load.toFixed(2) : '-'}</td>
                <td>${row.mem_usage !== undefined ? formatMem(row.mem_usage) : '-'}</td>
                <td>${row.cpu_util !== undefined ? row.cpu_util.toFixed(2) + "%" : '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        statusDiv.textContent = "";
    } catch (e) {
        statusDiv.textContent = "Error loading process_table.json";
        document.querySelector('#ptable tbody').innerHTML = '';
    }
}
async function fetchStats() {
    try {
        const resp = await fetch('run_stats.json?' + Date.now());
        if (!resp.ok) return;
        const stats = await resp.json();
        document.getElementById('cpu-time').textContent =
            stats.cpu_time !== undefined ? stats.cpu_time.toFixed(3) + " s" : "--";
        document.getElementById('mem-usage').textContent =
            stats.mem_usage !== undefined ? stats.mem_usage.toFixed(2) + " MB" : "--";
    } catch (e) {
        // ignore
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initVisualization();

    setInterval(async () => {
        await fetchTable();
        await fetchStats();
        updateVisualization();
    }, 1000);

    fetchTable();
    fetchStats();

    document.getElementById('sim-form').onsubmit = async function(e) {
        e.preventDefault(); // Prevents URL change and page reload
        const num = document.getElementById('num-processes').value;
        const interval = document.getElementById('aging-interval').value;
        statusDiv.textContent = "Starting simulation...";
        await fetch('/start_simulation', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                num_processes: num,
                aging_interval: interval
            })
        });
        statusDiv.textContent = "Simulation started!";
    };
});
