import time
import json

gantt_entries = []
import threading
import time
import random
import psutil
import json
import os
import sys
import joblib

NUM_PROCESSES = 5
AGING_INTERVAL = 1  # seconds

# --- Gantt chart tracking ---
GANTT_LOG = []
SIM_START_TIME = None

class ProcessState:
    WAITING = "WAITING"
    RUNNING = "RUNNING"
    FINISHED = "FINISHED"

def now():
    # Return time since simulation start (float, seconds)
    return time.time() - SIM_START_TIME if SIM_START_TIME else 0

def write_gantt_json():
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
    os.makedirs(web_dir, exist_ok=True)
    with open(os.path.join(web_dir, "process_gantt.json"), "w") as f:
        json.dump(GANTT_LOG, f, indent=2)

def ml_predict_priority(features):
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "priority_model.pkl")
    if not os.path.exists(model_path):
        return random.randint(1, 5)
    if not hasattr(ml_predict_priority, "model"):
        ml_predict_priority.model = joblib.load(model_path)
    return int(ml_predict_priority.model.predict([features])[0])

class SimProcess:
    def __init__(self, pid):
        self.id = pid
        self.age = 0
        self.sys_load = get_system_load()
        self.mem_usage = get_memory_usage()
        self.cpu_util = get_cpu_utilization()
        try:
            self.ml_priority = ml_predict_priority([
                self.cpu_util, self.mem_usage, self.sys_load, self.age
            ])
        except Exception:
            self.ml_priority = random.randint(1, 5)
        self.priority = self.ml_priority  # will be updated by aging
        self.state = ProcessState.WAITING
        self._thread = None
        self._should_run = threading.Event()
        self._should_run.clear()
        self._finished = False
        self._gantt_running_start = None  # Track RUNNING interval start

def get_system_load():
    return os.getloadavg()[0]

def get_memory_usage():
    return psutil.Process(os.getpid()).memory_info().rss // 1024

def get_cpu_utilization():
    return psutil.Process(os.getpid()).cpu_percent(interval=0.1)

def write_process_table_json(process_table):
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
    os.makedirs(web_dir, exist_ok=True)
    with open(os.path.join(web_dir, "process_table.json"), "w") as f:
        json.dump([
            {
                "id": p.id,
                "priority": p.priority,
                "age": p.age,
                "state": p.state,
                "sys_load": p.sys_load,
                "mem_usage": p.mem_usage,
                "cpu_util": p.cpu_util
            }
            for p in process_table
        ], f, indent=2)

def write_run_stats():
    proc = psutil.Process(os.getpid())
    cpu_time = sum(proc.cpu_times()[:2])
    mem_usage = proc.memory_info().rss / (1024 * 1024)
    stats = {
        "cpu_time": round(cpu_time, 3),
        "mem_usage": round(mem_usage, 2)
    }
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
    os.makedirs(web_dir, exist_ok=True)
    with open(os.path.join(web_dir, "run_stats.json"), "w") as f:
        json.dump(stats, f, indent=2)

def write_gantt_json():
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
    os.makedirs(web_dir, exist_ok=True)
    with open(os.path.join(web_dir, "process_gantt.json"), "w") as f:
        json.dump(GANTT_LOG, f, indent=2)

def process_func(p: 'SimProcess', resource_lock: threading.Lock, process_table):
    while not p._finished:
        p._should_run.wait()
        if p._finished:
            break
        with resource_lock:
            if p.state != ProcessState.RUNNING:
                p.state = ProcessState.RUNNING
                p.sys_load = get_system_load()
                p.mem_usage = get_memory_usage()
                p.cpu_util = get_cpu_utilization()
                # Use relative time for Gantt
                p._gantt_running_start = now()
                write_process_table_json(process_table)
                print(f"✅ Process {p.id} acquired resource!")
            # --- Gantt logging start ---
            gantt_start = time.perf_counter()
            work_time = 2.0
            step = 0.2
            elapsed = 0.0
            while elapsed < work_time:
                if not p._should_run.is_set():
                    # --- Gantt logging end for preemption ---
                    gantt_end = time.perf_counter()
                    gantt_entries.append({
                        "id": p.id,
                        "start": gantt_start,
                        "end": gantt_end
                    })
                    p.state = ProcessState.WAITING
                    p.sys_load = get_system_load()
                    p.mem_usage = get_memory_usage()
                    p.cpu_util = get_cpu_utilization()
                    write_process_table_json(process_table)
                    print(f"⏸️ Process {p.id} preempted and moved to WAITING.")
                    break
                time.sleep(step)
                elapsed += step
            else:
                # --- Gantt logging end for finish ---
                gantt_end = time.perf_counter()
                gantt_entries.append({
                    "id": p.id,
                    "start": gantt_start,
                    "end": gantt_end
                })
                p.state = ProcessState.FINISHED
                p.sys_load = get_system_load()
                p.mem_usage = get_memory_usage()
                p.cpu_util = get_cpu_utilization()
                write_process_table_json(process_table)
                print(f"🏁 Process {p.id} finished and released resource.")
                p._finished = True
        if not p._finished:
            p._should_run.clear()

def apply_aging(process_table):
    for p in process_table:
        if p.state == ProcessState.WAITING:
            p.age += 1
            p.priority = p.ml_priority + p.age
    write_process_table_json(process_table)

def schedule_next_process(process_table, resource_lock):
    # If no process is RUNNING, pick highest-priority WAITING process to run
    running = [p for p in process_table if p.state == ProcessState.RUNNING]
    if running:
        return  # Already running
    waiting = [p for p in process_table if p.state == ProcessState.WAITING]
    if not waiting:
        return
    # Pick highest-priority, break ties by lowest id
    next_proc = max(waiting, key=lambda p: (p.priority, -p.id))
    next_proc._should_run.set()
    next_proc.state = ProcessState.RUNNING
    write_process_table_json(process_table)
    print(f"▶️ Scheduling process {next_proc.id} (priority {next_proc.priority})")

def check_preemption(process_table, resource_lock):
    running = [p for p in process_table if p.state == ProcessState.RUNNING]
    waiting = [p for p in process_table if p.state == ProcessState.WAITING]
    if not running or not waiting:
        return
    running_proc = running[0]
    # Find highest-priority waiting process
    best_waiting = max(waiting, key=lambda p: (p.priority, -p.id))
    if best_waiting.priority > running_proc.priority:
        print(f"⏩ Preempting process {running_proc.id} (priority {running_proc.priority}) for process {best_waiting.id} (priority {best_waiting.priority})")
        # Preempt running process
        running_proc._should_run.clear()
        # Schedule the higher-priority process
        best_waiting._should_run.set()
        best_waiting.state = ProcessState.RUNNING
        write_process_table_json(process_table)

def print_process_table(process_table):
    print("\n🔵 Process Table:")
    print("ID\tPriority\tAge\tState")
    for p in process_table:
        print(f"{p.id}\t{p.priority}\t\t{p.age}\t{p.state}")

def get_user_input():
    if len(sys.argv) >= 3:
        try:
            num = int(sys.argv[1])
            interval = float(sys.argv[2])
            return num, interval
        except Exception:
            print("Invalid command line arguments.")
            sys.exit(1)
    else:
        print("Error: Provide number of processes and aging interval as command-line arguments.")
        print("Example: python3 pyth/simulate.py 5 1")
        sys.exit(1)

def main():
    global NUM_PROCESSES, AGING_INTERVAL, SIM_START_TIME
    NUM_PROCESSES, AGING_INTERVAL = get_user_input()
    process_table = [SimProcess(i) for i in range(NUM_PROCESSES)]
    resource_lock = threading.Lock()

    # Clean up old files
    for fname in ["web/process_table.json", "web/run_stats.json", "web/process_gantt.json"]:
        try:
            os.remove(fname)
        except FileNotFoundError:
            pass

    SIM_START_TIME = time.time()

    # Start threads for all processes
    for p in process_table:
        t = threading.Thread(target=process_func, args=(p, resource_lock, process_table), daemon=True)
        p._thread = t
        t.start()

    write_process_table_json(process_table)
    write_gantt_json()

    # Main simulation loop
    while any(p.state != ProcessState.FINISHED for p in process_table):
        apply_aging(process_table)
        check_preemption(process_table, resource_lock)
        schedule_next_process(process_table, resource_lock)
        print_process_table(process_table)
        write_gantt_json()
        time.sleep(AGING_INTERVAL)

    # Signal all threads to finish
    for p in process_table:
        p._finished = True
        p._should_run.set()
    for p in process_table:
        if p._thread:
            p._thread.join()

    write_process_table_json(process_table)
    write_run_stats()
    # --- Write Gantt entries at end ---
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web")
    os.makedirs(web_dir, exist_ok=True)
    with open(os.path.join(web_dir, "process_gantt.json"), "w") as f:
        json.dump(gantt_entries, f, indent=2)
    print_process_table(process_table)

if __name__ == "__main__":
    main()
