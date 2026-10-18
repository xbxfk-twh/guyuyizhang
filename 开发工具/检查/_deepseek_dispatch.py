#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""开发工具/检查/_deepseek_dispatch.py

DeepSeek 独立任务入口：GUI（tkinter）或 CLI，调用同目录 _deepseek_worker.py。

- GUI：多行任务输入 / 开始 / 停止 / 状态 / 日志；后台线程 subprocess 不阻塞界面；禁双开。
- CLI：--task <utf8文本文件>；--dry-run 只验证流程不调用 API；--self-test 验证目录/命令/STEP_LIMIT 识别，无需 API。
- 任务原文复制到 ROOT/回归测试/_out/任务记录/ 下；子进程 stdout 逐行写入任务 log；result.json 记录 status/returncode/run 目录。
- 若输出含 STEP_LIMIT <path>，自动追加 --resume <path> 再运行，最多 3 轮；FINISHED 仅表示模型停止，需人工验收。

注意：本入口不查询额度、不热切换会话模型、不上传目录、不打包。
"""

import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORKER = Path(__file__).resolve().parent / "_deepseek_worker.py"
OUT_ROOT = ROOT / "回归测试" / "_out" / "任务记录"
CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0
SECRET_RE = re.compile(r"sk-[A-Za-z0-9]{8,}")
STEP_LIMIT_RE = re.compile(r"STEP_LIMIT\s+(\S+)")
MAX_ROUNDS = 3


def _now_stamp():
    return time.strftime("%Y%m%d_%H%M%S")


def _sanitize(text):
    return SECRET_RE.sub("[REDACTED]", text)


def prepare_run_dir(task_text):
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    run_dir = OUT_ROOT / ("run_" + _now_stamp())
    n = 1
    while run_dir.exists():
        run_dir = OUT_ROOT / ("run_%s_%d" % (_now_stamp(), n))
        n += 1
    run_dir.mkdir(parents=True)
    task_path = run_dir / "task.txt"
    task_path.write_text(_sanitize(task_text), encoding="utf-8")
    return run_dir, task_path


def build_cmd(task_path, resume_path=None):
    cmd = [sys.executable, str(WORKER), str(task_path),
           "--model", "deepseek-v4-pro", "--steps", "65"]
    if resume_path:
        cmd += ["--resume", str(resume_path)]
    return cmd


def run_task(task_text, log_cb=None, dry_run=False):
    run_dir, task_path = prepare_run_dir(task_text)
    log_path = run_dir / "run.log"
    result_path = run_dir / "result.json"
    rounds = []
    resume = None
    final_status = "PENDING"
    last_rc = None

    def emit(line):
        line = _sanitize(line.rstrip("\n"))
        with log_path.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
        if log_cb:
            log_cb(line)

    emit("[dispatch] run dir: %s" % run_dir)
    emit("[dispatch] worker: %s" % WORKER)
    if dry_run:
        cmd = build_cmd(task_path, resume)
        emit("[dry-run] cmd: %s" % " ".join(cmd))
        result = {"status": "DRY_RUN", "returncode": None,
                  "run_dir": str(run_dir), "rounds": []}
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2),
                               encoding="utf-8")
        return result

    if not WORKER.exists():
        emit("[error] worker not found: %s" % WORKER)
        result = {"status": "ERROR", "returncode": None,
                  "run_dir": str(run_dir), "rounds": []}
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2),
                               encoding="utf-8")
        return result

    for rnd in range(1, MAX_ROUNDS + 1):
        cmd = build_cmd(task_path, resume)
        emit("[round %d] cmd: %s" % (rnd, " ".join(cmd)))
        proc = subprocess.Popen(
            cmd, cwd=str(ROOT), stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, encoding="utf-8",
            errors="replace", bufsize=1, creationflags=CREATE_NO_WINDOW,
        )
        step_limit_path = None
        finished = False
        for line in proc.stdout:
            emit(line)
            m = STEP_LIMIT_RE.search(line)
            if m:
                step_limit_path = m.group(1)
            if "FINISHED" in line:
                finished = True
        rc = proc.wait()
        last_rc = rc
        rounds.append({"round": rnd, "returncode": rc,
                       "step_limit": step_limit_path, "finished": finished})
        if finished:
            final_status = "FINISHED_NEEDS_REVIEW"
            break
        if step_limit_path and rnd < MAX_ROUNDS:
            resume = step_limit_path
            emit("[dispatch] STEP_LIMIT -> resume: %s" % resume)
            continue
        if step_limit_path:
            final_status = "STEP_LIMIT_MAX_ROUNDS"
        else:
            final_status = "EXITED" if rc == 0 else "FAILED"
        break

    result = {"status": final_status, "returncode": last_rc,
              "run_dir": str(run_dir), "rounds": rounds}
    result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    emit("[dispatch] status: %s returncode: %s" % (final_status, last_rc))
    return result


def self_test():
    ok = True
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    run_dir, task_path = prepare_run_dir("self-test task")
    if not task_path.read_text(encoding="utf-8") == "self-test task":
        print("FAIL: task copy"); ok = False
    cmd = build_cmd(task_path, "C:/tmp/step.json")
    for need in ("--model", "deepseek-v4-pro", "--steps", "65", "--resume"):
        if need not in cmd:
            print("FAIL: cmd missing %s" % need); ok = False
    if not STEP_LIMIT_RE.search("noise STEP_LIMIT C:/tmp/x.json tail"):
        print("FAIL: step limit regex"); ok = False
    shutil.rmtree(run_dir, ignore_errors=True)
    print("SELF-TEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


class App:
    def __init__(self, root):
        import tkinter as tk
        from tkinter import scrolledtext, messagebox
        self.tk = tk
        self.messagebox = messagebox
        self.root = root
        self.running = False
        self.stop_flag = False
        self.proc = None
        root.title("DeepSeek Dispatch")
        root.geometry("780x560")
        root.protocol("WM_DELETE_WINDOW", self.on_close)
        tk.Label(root, text="任务描述 (utf-8)").pack(anchor="w")
        self.text = scrolledtext.ScrolledText(root, height=10)
        self.text.pack(fill="both", expand=False)
        bar = tk.Frame(root); bar.pack(fill="x")
        self.start_btn = tk.Button(bar, text="开始", command=self.on_start)
        self.start_btn.pack(side="left")
        self.stop_btn = tk.Button(bar, text="停止", command=self.on_stop,
                                  state="disabled")
        self.stop_btn.pack(side="left")
        self.status = tk.Label(bar, text="空闲")
        self.status.pack(side="right")
        tk.Label(root, text="日志").pack(anchor="w")
        self.log = scrolledtext.ScrolledText(root, height=18, state="disabled")
        self.log.pack(fill="both", expand=True)

    def _log(self, line):
        self.root.after(0, self._log_main, line)

    def _log_main(self, line):
        self.log.configure(state="normal")
        self.log.insert("end", line + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _set_status(self, text):
        self.root.after(0, lambda: self.status.configure(text=text))

    def on_start(self):
        if self.running:
            self.messagebox.showinfo("提示", "已有任务在运行，禁止双开。")
            return
        task = self.text.get("1.0", "end").strip()
        if not task:
            self.messagebox.showwarning("提示", "请填写任务描述。")
            return
        self.running = True
        self.stop_flag = False
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self._set_status("运行中…")
        t = threading.Thread(target=self._worker, args=(task,), daemon=True)
        t.start()

    def _worker(self, task):
        try:
            res = run_task(task, log_cb=self._log)
            status = res.get("status", "?")
            self._set_status(status)
            if self.stop_flag:
                self._log("[dispatch] 已中断；工作区可能部分修改，需续接。")
        except Exception as exc:
            self._log("[error] %s" % _sanitize(str(exc)))
            self._set_status("异常")
        finally:
            self.running = False
            self.proc = None
            self.root.after(0, self._reset_buttons)

    def _reset_buttons(self):
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")

    def on_stop(self):
        if not self.running:
            return
        self.stop_flag = True
        self._set_status("中断中…")
        p = self.proc
        if p and p.poll() is None:
            try:
                p.terminate()
            except Exception:
                pass
        self._log("[dispatch] 用户请求停止当前子进程；工作区可能部分修改需续接。")

    def on_close(self):
        if self.running:
            if not self.messagebox.askyesno("确认", "任务仍在运行，关闭窗口会中断。继续？"):
                return
            self.on_stop()
        self.root.destroy()


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--self-test" in argv:
        return self_test()
    if "--task" in argv:
        idx = argv.index("--task")
        if idx + 1 >= len(argv):
            print("usage: _deepseek_dispatch.py --task <file> [--dry-run]")
            return 2
        task_file = Path(argv[idx + 1])
        if not task_file.exists():
            print("task file not found: %s" % task_file)
            return 2
        task_text = task_file.read_text(encoding="utf-8")
        dry = "--dry-run" in argv
        res = run_task(task_text, log_cb=lambda l: print(l), dry_run=dry)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return 0
    try:
        import tkinter as tk
    except Exception:
        print("tkinter unavailable; use: --task <file> [--dry-run] or --self-test")
        return 2
    root = tk.Tk()
    App(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
