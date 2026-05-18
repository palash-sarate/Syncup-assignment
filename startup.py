import os
import sys
import time
import socket
import subprocess
import threading
from urllib.request import Request, urlopen

# ANSI Color Codes for premium console logging
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.BLUE, prefix="[SYSTEM]"):
    print(f"{color}{prefix} {message}{Colors.END}")

def check_command_exists(command):
    try:
        # Use shell=True on Windows because commands like npm are batch scripts
        use_shell = (sys.platform == 'win32')
        subprocess.run([command, "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True, shell=use_shell)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def check_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1.0)
        return s.connect_ex(('127.0.0.1', port)) == 0

def check_keycloak_ready():
    url = "http://localhost:8080/realms/coaching-realm"
    try:
        req = Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(req, timeout=2.0) as response:
            return response.status == 200
    except Exception:
        return False

def start_docker_desktop():
    if sys.platform == 'win32':
        log("Docker Desktop is not running. Attempting to start it...", Colors.YELLOW)
        paths = [
            r"C:\Program Files\Docker\Docker\Docker Desktop.exe",
            os.path.expandvars(r"%USERPROFILE%\AppData\Local\Programs\Docker\Docker Desktop.exe")
        ]
        started = False
        for path in paths:
            if os.path.exists(path):
                subprocess.Popen([path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                started = True
                break
        if not started:
            log("Could not locate Docker Desktop executable. Please open Docker Desktop manually.", Colors.RED)
            return False
        
        # Poll for Docker daemon
        log("Waiting for Docker Daemon to launch...", Colors.YELLOW)
        for i in range(15):
            time.sleep(3)
            try:
                res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                log("Docker Daemon is ready!", Colors.GREEN)
                return True
            except subprocess.CalledProcessError:
                log(f"Still waiting ({i+1}/15)...", Colors.YELLOW)
        return False
    else:
        log("Please start your Docker Daemon/Service manually.", Colors.RED)
        return False

def verify_docker_daemon():
    try:
        subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return start_docker_desktop()

def install_npm_deps(folder_name):
    folder_path = os.path.join(os.getcwd(), folder_name)
    node_modules_path = os.path.join(folder_path, "node_modules")
    
    if not os.path.exists(node_modules_path):
        log(f"Installing npm dependencies in {folder_name}...", Colors.CYAN)
        # Use shell=True and --legacy-peer-deps for windows shell pathing compatibility and Next RC compatibility
        subprocess.run(["npm", "install", "--legacy-peer-deps"], cwd=folder_path, shell=True, check=True)
        log(f"Dependencies installed in {folder_name} successfully!", Colors.GREEN)
    else:
        log(f"node_modules already present in {folder_name}.", Colors.GREEN)

def run_logs_stream(process, prefix, color):
    for line in iter(process.stdout.readline, ''):
        if line:
            print(f"{color}{prefix}{Colors.END} {line.strip()}")

def main():
    log("===================================================", Colors.HEADER)
    log("  Starting SyncUp Realtime Coaching Feed Platform   ", Colors.HEADER, Colors.BOLD)
    log("===================================================", Colors.HEADER)

    # 1. Prerequisites Check
    log("Checking prerequisites...", Colors.CYAN)
    if not check_command_exists("node"):
        log("Node.js is not installed or not in PATH! Please install Node.js.", Colors.RED)
        sys.exit(1)
    if not check_command_exists("npm"):
        log("npm is not installed! Please install npm.", Colors.RED)
        sys.exit(1)
    if not check_command_exists("docker") or not check_command_exists("docker-compose"):
        log("Docker or docker-compose is not installed! Please install Docker.", Colors.RED)
        sys.exit(1)

    log("Prerequisites verified successfully!", Colors.GREEN)

    # 2. Check Docker Service
    if not verify_docker_daemon():
        log("Docker Daemon is not running. Please launch Docker and try again.", Colors.RED)
        sys.exit(1)

    # 3. Spin up Containers
    log("Spinning up Docker containers (MongoDB, Redis, Keycloak)...", Colors.CYAN)
    subprocess.run(["docker-compose", "up", "-d"], check=True)
    log("Docker Compose launched successfully!", Colors.GREEN)

    # 4. Wait for Infrastructure Ports
    log("Waiting for database, cache, and authentication services to start...", Colors.CYAN)
    
    # Check Mongo (27017) and Redis (6379)
    for port, name in [(27017, "MongoDB"), (6379, "Redis")]:
        log(f"Waiting for {name} on port {port}...", Colors.YELLOW)
        while not check_port_open(port):
            time.sleep(1)
        log(f"{name} is active!", Colors.GREEN)

    # Check Keycloak (8080) & Realtime imports
    log("Waiting for Keycloak on port 8080...", Colors.YELLOW)
    while not check_port_open(8080):
        time.sleep(1)
    log("Keycloak port open! Waiting for Realm import verification...", Colors.YELLOW)
    
    attempts = 0
    while not check_keycloak_ready():
        attempts += 1
        if attempts > 30:
            log("Keycloak startup timed out! Please check Keycloak container logs.", Colors.RED)
            sys.exit(1)
        time.sleep(2)
    log("Keycloak realm 'coaching-realm' loaded and active!", Colors.GREEN)

    # 5. Install Node Dependencies
    try:
        install_npm_deps("backend")
        install_npm_deps("client-app")
        install_npm_deps("coach-app")
    except subprocess.CalledProcessError as e:
        log(f"npm install failed: {e}", Colors.RED)
        sys.exit(1)
    # 5.5 Run Seeding Script
    log("Running database and Keycloak seeding script...", Colors.CYAN)
    try:
        subprocess.run(["node", "scripts/seed.js"], cwd=os.path.join(os.getcwd(), "backend"), shell=True, check=True)
        log("Database and Keycloak populated successfully!", Colors.GREEN)
    except subprocess.CalledProcessError as e:
        log(f"Seeding failed: {e}", Colors.RED)
        sys.exit(1)

    # 6. Launch Servers Concurrently
    log("Launching Express Backend, Client Portal, and Coach Portal...", Colors.HEADER)
    
    backend_proc = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd=os.path.join(os.getcwd(), "backend"),
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT,
        text=True, 
        shell=True
    )
    
    client_proc = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd=os.path.join(os.getcwd(), "client-app"),
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT,
        text=True, 
        shell=True
    )

    coach_proc = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd=os.path.join(os.getcwd(), "coach-app"),
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT,
        text=True, 
        shell=True
    )

    # Threads for prefix stream logging
    t1 = threading.Thread(target=run_logs_stream, args=(backend_proc, "[Backend]", Colors.YELLOW), daemon=True)
    t2 = threading.Thread(target=run_logs_stream, args=(client_proc, "[ClientApp]", Colors.CYAN), daemon=True)
    t3 = threading.Thread(target=run_logs_stream, args=(coach_proc, "[CoachApp]", Colors.HEADER), daemon=True)
    
    t1.start()
    t2.start()
    t3.start()

    log("Express Server starting on http://localhost:5000", Colors.GREEN)
    log("Client Dashboard starting on http://localhost:3000", Colors.GREEN)
    log("Coach Dashboard starting on http://localhost:3001", Colors.GREEN)
    log("Press Ctrl+C to terminate all servers.", Colors.HEADER)

    try:
        while True:
            # Check if any process terminated unexpectedly
            if backend_proc.poll() is not None:
                log("Backend process stopped unexpectedly!", Colors.RED)
                break
            if client_proc.poll() is not None:
                log("Client app process stopped unexpectedly!", Colors.RED)
                break
            if coach_proc.poll() is not None:
                log("Coach app process stopped unexpectedly!", Colors.RED)
                break
            time.sleep(1)
    except KeyboardInterrupt:
        log("\nShutting down dev environments...", Colors.YELLOW)
    finally:
        # Terminate processes gracefully
        backend_proc.terminate()
        client_proc.terminate()
        coach_proc.terminate()
        try:
            backend_proc.wait(timeout=3)
            client_proc.wait(timeout=3)
            coach_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            backend_proc.kill()
            client_proc.kill()
            coach_proc.kill()
        log("Development servers stopped successfully.", Colors.GREEN)
        log("Note: Docker containers remain running. Execute 'docker-compose down' to clean up containers.", Colors.CYAN)

if __name__ == "__main__":
    main()
