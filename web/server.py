from flask import Flask, request, jsonify, send_from_directory
import subprocess
import threading
import os
import sys

app = Flask(__name__, static_folder='.', static_url_path='')

SIM_PROCESS = None

def run_simulation(num_processes, aging_interval):
    global SIM_PROCESS
    # Kill previous simulation if running
    if SIM_PROCESS and SIM_PROCESS.poll() is None:
        SIM_PROCESS.terminate()
    # Start new simulation
    sim_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../pyth/simulate.py"))
    SIM_PROCESS = subprocess.Popen(
        [sys.executable, sim_path, str(num_processes), str(aging_interval)],
        cwd=os.path.dirname(sim_path)
    )

@app.route('/start_simulation', methods=['POST'])
def start_simulation():
    data = request.get_json()
    num_processes = int(data.get('num_processes', 5))
    aging_interval = float(data.get('aging_interval', 1))
    threading.Thread(target=run_simulation, args=(num_processes, aging_interval), daemon=True).start()
    return jsonify({"status": "started"})

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('.', path)

@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

if __name__ == "__main__":
    app.run(port=8080)
