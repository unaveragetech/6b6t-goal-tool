import sys
import os
import threading
import time
import random
import string
from queue import Queue
from functools import partial
from datetime import datetime
import subprocess
import tempfile
import webbrowser
import platform
import uuid

# Auto-installer for required packages
def install_packages():
    required = {'psutil'}
    try:
        import pkg_resources
        installed = {pkg.key for pkg in pkg_resources.working_set}
        missing = required - installed
        if missing:
            print(f"Installing missing packages: {missing}")
            python = sys.executable
            subprocess.check_call([python, '-m', 'pip', 'install', *missing], stdout=subprocess.DEVNULL)
    except ImportError:
        print("Installing initial required packages...")
        python = sys.executable
        subprocess.check_call([python, '-m', 'pip', 'install', 'psutil'], stdout=subprocess.DEVNULL)

try:
    import psutil
except ImportError:
    install_packages()
    import psutil

class GoofyGooberSystem:
    def __init__(self):
        # System configuration
        self.recursion_limit = 100000
        self.min_threads = 6
        self.max_threads = 40
        self.target_cpu_usage = 60
        self.print_limit = 3000
        self.thread_refresh_interval = 50
        self.yeah_probability = 0.2  # 20% chance of YEAH!!!
        
        # File writing configuration
        self.file_operations_enabled = True
        self.file_cleanup_delay = 2  # seconds
        
        # Shared resources
        self.thread_lock = threading.Lock()
        self.message_queue = Queue()
        self.control_queue = Queue()
        self.file_queue = Queue()
        
        # Performance tracking
        self.metrics = {
            'total_messages': 0,
            'thread_creations': 0,
            'errors': 0,
            'files_created': 0,
            'yeah_count': 0,
            'start_time': datetime.now()
        }
        
        # Thread management
        self.active_threads = {}
        self.thread_counter = 0
        self.shutdown_flag = False
        self.goofy_messages = [
            "I'm a goofy Goober",
            "We're all goofy Goobers",
            "Goofy Goofy Goober",
            "Rock on Goofy Goober",
            "Goober power!",
            "You're a Goofy one"
        ]

    def worker(self, thread_id, iteration=0):
        try:
            if self.shutdown_flag:
                return
                
            # Dynamic workload adjustment
            if iteration % self.thread_refresh_interval == 0:
                self.adjust_thread_count()
                
            # Generate goofy content
            if random.random() < self.yeah_probability:
                content = "YEAH!!!"
                with self.thread_lock:
                    self.metrics['yeah_count'] += 1
            else:
                content = random.choice(self.goofy_messages)
                
            # Add thread info
            full_content = f"{content} | Thread {thread_id} | Iter {iteration}\n"
            full_content += f"System Load: {self.get_system_load():.1f}%\n"
            full_content += f"Timestamp: {datetime.now().isoformat()}\n"
            
            # Queue message for display
            with self.thread_lock:
                self.metrics['total_messages'] += 1
                self.message_queue.put(content)
                
            # Queue file operation if enabled
            if self.file_operations_enabled:
                self.file_queue.put(('write', full_content))
                
            # Continue recursion or restart thread
            if iteration >= self.print_limit:
                with self.thread_lock:
                    self.metrics['thread_creations'] += 1
                self.control_queue.put(('restart', thread_id))
                return
                
            time.sleep(0.05)  # Prevent CPU overload
            self.worker(thread_id, iteration + 1)
            
        except Exception as e:
            with self.thread_lock:
                self.metrics['errors'] += 1
            self.control_queue.put(('error', thread_id, str(e)))

    def file_manager(self):
        """Handles all file operations in a dedicated thread"""
        while not self.shutdown_flag:
            try:
                command, *args = self.file_queue.get(timeout=0.1)
                
                if command == 'write':
                    content = args[0]
                    self._create_ephemeral_file(content)
                    
                self.file_queue.task_done()
            except:
                continue

    def _create_ephemeral_file(self, content):
        """Creates, displays, and deletes temporary files"""
        try:
            # Create random directory name
            rand_dir = os.path.join(tempfile.gettempdir(), 
                                  ''.join(random.choices(string.ascii_lowercase, k=6)))
            os.makedirs(rand_dir, exist_ok=True)
            
            # Create file with random name
            filename = f"goober_{uuid.uuid4().hex[:6]}.txt"
            filepath = os.path.join(rand_dir, filename)
            
            # Write content
            with open(filepath, 'w') as f:
                f.write(content)
            
            with self.thread_lock:
                self.metrics['files_created'] += 1
            
            # Open in default text editor (platform specific)
            self._open_file_explorer(filepath)
            
            # Schedule deletion
            threading.Timer(self.file_cleanup_delay, self._delete_file, args=(filepath, rand_dir)).start()
            
        except Exception as e:
            with self.thread_lock:
                self.metrics['errors'] += 1
            print(f"File operation failed: {e}")

    def _open_file_explorer(self, filepath):
        """Opens file explorer/navigator appropriate for the OS"""
        try:
            if platform.system() == "Windows":
                os.startfile(os.path.dirname(filepath))
            elif platform.system() == "Darwin":
                subprocess.Popen(["open", os.path.dirname(filepath)])
            else:
                subprocess.Popen(["xdg-open", os.path.dirname(filepath)])
        except:
            pass

    def _delete_file(self, filepath, dirpath):
        """Deletes the file and directory if empty"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
            if os.path.exists(dirpath) and not os.listdir(dirpath):
                os.rmdir(dirpath)
        except:
            pass

    def get_system_load(self):
        return psutil.cpu_percent(interval=0.1)

    def adjust_thread_count(self):
        current_load = self.get_system_load()
        current_threads = len(self.active_threads)
        
        with self.thread_lock:
            if current_load < self.target_cpu_usage and current_threads < self.max_threads:
                # Add more threads
                for _ in range(min(1, self.max_threads - current_threads)):
                    self.start_thread()
            elif current_load > self.target_cpu_usage and current_threads > self.min_threads:
                # Remove some threads
                for _ in range(min(1, current_threads - self.min_threads)):
                    if self.active_threads:
                        thread_id = next(iter(self.active_threads))
                        self.control_queue.put(('terminate', thread_id))

    def start_thread(self):
        with self.thread_lock:
            thread_id = self.thread_counter
            self.thread_counter += 1
            t = threading.Thread(target=partial(self.worker, thread_id))
            t.daemon = True
            t.start()
            self.active_threads[thread_id] = t
            return thread_id

    def message_dispatcher(self):
        while not self.shutdown_flag:
            try:
                message = self.message_queue.get(timeout=0.1)
                print(message)
                self.message_queue.task_done()
            except:
                continue

    def control_handler(self):
        while not self.shutdown_flag:
            try:
                command, *args = self.control_queue.get(timeout=0.1)
                
                if command == 'restart':
                    thread_id = args[0]
                    with self.thread_lock:
                        if thread_id in self.active_threads:
                            del self.active_threads[thread_id]
                    self.start_thread()
                    
                elif command == 'error':
                    thread_id, error = args
                    with self.thread_lock:
                        if thread_id in self.active_threads:
                            del self.active_threads[thread_id]
                    print(f"Thread {thread_id} failed: {error}")
                    self.start_thread()
                    
                elif command == 'terminate':
                    thread_id = args[0]
                    with self.thread_lock:
                        if thread_id in self.active_threads:
                            del self.active_threads[thread_id]
                            
                self.control_queue.task_done()
            except:
                continue

    def metrics_reporter(self):
        while not self.shutdown_flag:
            time.sleep(5)
            with self.thread_lock:
                duration = datetime.now() - self.metrics['start_time']
                print("\n=== Goofy Metrics ===")
                print(f"Uptime: {duration}")
                print(f"Active Threads: {len(self.active_threads)}")
                print(f"Total Messages: {self.metrics['total_messages']}")
                print(f"YEAH!!! Count: {self.metrics['yeah_count']}")
                print(f"Thread Creations: {self.metrics['thread_creations']}")
                print(f"Files Created: {self.metrics['files_created']}")
                print(f"Errors: {self.metrics['errors']}")
                print(f"Current CPU: {self.get_system_load():.1f}%")
                print("====================\n")

    def start(self):
        sys.setrecursionlimit(self.recursion_limit)
        
        # Start control threads
        threading.Thread(target=self.message_dispatcher, daemon=True).start()
        threading.Thread(target=self.control_handler, daemon=True).start()
        threading.Thread(target=self.metrics_reporter, daemon=True).start()
        threading.Thread(target=self.file_manager, daemon=True).start()
        
        # Initial threads
        for _ in range(self.min_threads):
            self.start_thread()
            
        print("""
        ╔════════════════════════════╗
        ║                            ║
        ║   GOOFY GOOBER SYSTEM      ║
        ║          ACTIVATED         ║
        ║                            ║
        ╚════════════════════════════╝
        """)
        print("All systems go! Spreading goofiness...")
        print("Press Ctrl+C to stop being a Goofy Goober\n")

    def stop(self):
        self.shutdown_flag = True
        with self.thread_lock:
            print(f"\nShutting down {len(self.active_threads)} Goofy Threads...")
            print("""
            ╔════════════════════════════╗
            ║                            ║
            ║   SYSTEM GOOFINESS         ║
            ║        TERMINATED          ║
            ║                            ║
            ╚════════════════════════════╝
            """)
            self.active_threads.clear()

if __name__ == "__main__":
    system = GoofyGooberSystem()
    try:
        system.start()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        system.stop()