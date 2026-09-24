export interface PerformanceSnapshot {
  startupMs?: number;
  averageFrameMs: number;
  longTasks: number;
  sampledAt: number;
}

const STORAGE_KEY = "desktop-manager.performance.v1";

class PerformanceMonitor {
  private frameTimes: number[] = [];
  private longTasks = 0;
  private frameId = 0;
  private observer?: PerformanceObserver;
  private startedAt = performance.now();

  start(): () => void {
    let lastFrame = performance.now();
    const frame = (now: number) => {
      this.frameTimes.push(now - lastFrame);
      if (this.frameTimes.length > 300) this.frameTimes.shift();
      lastFrame = now;
      this.frameId = requestAnimationFrame(frame);
    };
    this.frameId = requestAnimationFrame(frame);
    if ("PerformanceObserver" in window) {
      try {
        this.observer = new PerformanceObserver((entries) => { this.longTasks += entries.getEntries().length; });
        this.observer.observe({ entryTypes: ["longtask"] });
      } catch { /* Long task timing is optional in WebView2 versions without support. */ }
    }
    const timer = window.setInterval(() => this.persist(), 30_000);
    return () => {
      cancelAnimationFrame(this.frameId);
      window.clearInterval(timer);
      this.observer?.disconnect();
      this.persist();
    };
  }

  markReady(): void {
    const existing = this.read();
    this.write({ ...existing, startupMs: performance.now() - this.startedAt });
  }

  snapshot(): PerformanceSnapshot {
    return {
      ...this.read(),
      averageFrameMs: this.frameTimes.length
        ? this.frameTimes.reduce((sum, value) => sum + value, 0) / this.frameTimes.length
        : 0,
      longTasks: this.longTasks,
      sampledAt: Date.now(),
    };
  }

  private persist(): void {
    this.write(this.snapshot());
  }

  private read(): Partial<PerformanceSnapshot> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
  }

  private write(snapshot: Partial<PerformanceSnapshot>): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* Metrics must never affect the workspace. */ }
  }
}

export const performanceMonitor = new PerformanceMonitor();
