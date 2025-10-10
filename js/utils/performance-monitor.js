class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.frameTimes = [];
        this.maxFrameSamples = 60;
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.memoryUsage = 0;
        
        this.setupMonitoring();
    }

    setupMonitoring() {
        // Start monitoring loop
        this.monitorLoop();
        
        // Setup memory monitoring if available
        if (performance.memory) {
            setInterval(() => this.updateMemoryUsage(), 1000);
        }
    }

    monitorLoop() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        
        // Calculate FPS
        this.frameTimes.push(deltaTime);
        if (this.frameTimes.length > this.maxFrameSamples) {
            this.frameTimes.shift();
        }
        
        const averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.fps = Math.round(1000 / averageFrameTime);
        
        this.lastFrameTime = now;
        
        // Continue monitoring
        requestAnimationFrame(() => this.monitorLoop());
    }

    updateMemoryUsage() {
        if (performance.memory) {
            this.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576); // Convert to MB
        }
    }

    startMeasurement(name) {
        this.metrics.set(name, {
            startTime: performance.now(),
            calls: 0,
            totalTime: 0,
            averageTime: 0
        });
    }

    endMeasurement(name) {
        const metric = this.metrics.get(name);
        if (metric) {
            const duration = performance.now() - metric.startTime;
            metric.calls++;
            metric.totalTime += duration;
            metric.averageTime = metric.totalTime / metric.calls;
        }
    }

    getMetric(name) {
        return this.metrics.get(name);
    }

    getAllMetrics() {
        return Object.fromEntries(this.metrics);
    }

    logMetrics() {
        console.group('Performance Metrics');
        console.table(this.getAllMetrics());
        console.log(`FPS: ${this.fps}`);
        console.log(`Memory: ${this.memoryUsage} MB`);
        console.groupEnd();
    }

    // Memory management utilities
    forceGarbageCollection() {
        if (global.gc) {
            global.gc();
        } else {
            console.warn('Garbage collection not exposed. Run Node with --expose-gc');
        }
    }

    getMemoryInfo() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }

    // Performance optimization suggestions
    getOptimizationSuggestions() {
        const suggestions = [];
        const metrics = this.getAllMetrics();
        
        // Check for slow operations
        for (const [name, metric] of Object.entries(metrics)) {
            if (metric.averageTime > 16) { // More than 16ms per frame
                suggestions.push(`Operation "${name}" is taking ${metric.averageTime.toFixed(2)}ms on average`);
            }
        }
        
        // Check memory usage
        const memoryInfo = this.getMemoryInfo();
        if (memoryInfo && memoryInfo.used > 100) {
            suggestions.push(`High memory usage: ${memoryInfo.used}MB. Consider optimizing asset loading.`);
        }
        
        // Check FPS
        if (this.fps < 30) {
            suggestions.push(`Low FPS: ${this.fps}. Consider reducing scene complexity.`);
        }
        
        return suggestions;
    }

    // Resource monitoring
    trackTextureMemory(texture) {
        // Estimate texture memory usage
        let bytes = 0;
        
        if (texture.image) {
            const width = texture.image.width || texture.image.videoWidth || 1;
            const height = texture.image.height || texture.image.videoHeight || 1;
            
            // Rough estimate: width * height * 4 bytes (RGBA)
            bytes = width * height * 4;
        }
        
        return bytes;
    }

    trackGeometryMemory(geometry) {
        let bytes = 0;
        
        if (geometry.attributes) {
            for (const attributeName in geometry.attributes) {
                const attribute = geometry.attributes[attributeName];
                if (attribute.array) {
                    bytes += attribute.array.byteLength;
                }
            }
        }
        
        return bytes;
    }

    // Performance profiling
    profileFunction(fn, name, iterations = 1000) {
        const times = [];
        
        // Warm-up
        for (let i = 0; i < 10; i++) {
            fn();
        }
        
        // Profile
        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            fn();
            const end = performance.now();
            times.push(end - start);
        }
        
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        console.group(`Profiling: ${name}`);
        console.log(`Iterations: ${iterations}`);
        console.log(`Average: ${average.toFixed(4)}ms`);
        console.log(`Min: ${min.toFixed(4)}ms`);
        console.log(`Max: ${max.toFixed(4)}ms`);
        console.log(`Total: ${(average * iterations).toFixed(2)}ms`);
        console.groupEnd();
        
        return { average, min, max, times };
    }

    // Frame time analysis
    analyzeFrameTimes() {
        if (this.frameTimes.length < 2) return null;
        
        const times = this.frameTimes;
        const average = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((a, b) => a + Math.pow(b - average, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        
        // Identify spikes (frames that take significantly longer than average)
        const spikes = times.filter(time => time > average + 2 * stdDev);
        
        return {
            averageFrameTime: average,
            stdDev: stdDev,
            spikeCount: spikes.length,
            spikePercentage: (spikes.length / times.length) * 100,
            worstFrame: Math.max(...times)
        };
    }

    // Performance alerts
    setupAlerts(thresholds = {}) {
        const defaultThresholds = {
            minFPS: 30,
            maxMemory: 500, // MB
            maxFrameTime: 50, // ms
            maxSpikePercentage: 10 // %
        };
        
        this.alertThresholds = { ...defaultThresholds, ...thresholds };
        this.alerts = new Set();
        
        setInterval(() => this.checkAlerts(), 2000);
    }

    checkAlerts() {
        const analysis = this.analyzeFrameTimes();
        const memoryInfo = this.getMemoryInfo();
        
        // Check FPS
        if (this.fps < this.alertThresholds.minFPS && !this.alerts.has('low_fps')) {
            this.triggerAlert('low_fps', `Low FPS: ${this.fps} (threshold: ${this.alertThresholds.minFPS})`);
        }
        
        // Check memory
        if (memoryInfo && memoryInfo.used > this.alertThresholds.maxMemory && !this.alerts.has('high_memory')) {
            this.triggerAlert('high_memory', `High memory usage: ${memoryInfo.used}MB (threshold: ${this.alertThresholds.maxMemory}MB)`);
        }
        
        // Check frame times
        if (analysis && analysis.worstFrame > this.alertThresholds.maxFrameTime && !this.alerts.has('frame_spike')) {
            this.triggerAlert('frame_spike', `Frame spike: ${analysis.worstFrame.toFixed(2)}ms (threshold: ${this.alertThresholds.maxFrameTime}ms)`);
        }
        
        // Check spike percentage
        if (analysis && analysis.spikePercentage > this.alertThresholds.maxSpikePercentage && !this.alerts.has('high_spikes')) {
            this.triggerAlert('high_spikes', `High spike percentage: ${analysis.spikePercentage.toFixed(1)}% (threshold: ${this.alertThresholds.maxSpikePercentage}%)`);
        }
    }

    triggerAlert(type, message) {
        this.alerts.add(type);
        console.warn(`PERFORMANCE ALERT: ${message}`);
        
        // Dispatch custom event for UI to handle
        const event = new CustomEvent('performanceAlert', {
            detail: { type, message, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }

    clearAlert(type) {
        this.alerts.delete(type);
    }

    // Export performance data
    exportData() {
        return {
            timestamp: Date.now(),
            fps: this.fps,
            memory: this.getMemoryInfo(),
            metrics: this.getAllMetrics(),
            frameAnalysis: this.analyzeFrameTimes(),
            alerts: Array.from(this.alerts)
        };
    }

    // Reset monitoring
    reset() {
        this.metrics.clear();
        this.frameTimes = [];
        this.alerts.clear();
        this.lastFrameTime = performance.now();
    }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in other modules
window.performanceMonitor = performanceMonitor;
