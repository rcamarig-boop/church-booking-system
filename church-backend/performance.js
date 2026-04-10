/**
 * Performance Monitoring - Phase 1
 * Tracks API response times, database queries, and identifies bottlenecks
 */

const metrics = {
  endpoints: {},
  queries: [],
  slowestQueries: [],
  memorySnapshots: []
};

const PERFORMANCE_THRESHOLDS = {
  apiEndpoint: 500, // 500ms - acceptable response time
  databaseQuery: 100, // 100ms - database query warning threshold
  slowQuery: 200, // 200ms - slow query threshold
};

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = metrics;
  }

  /**
   * Track API endpoint performance
   */
  trackEndpoint(method, path, duration, statusCode) {
    const key = `${method} ${path}`;
    
    if (!this.metrics.endpoints[key]) {
      this.metrics.endpoints[key] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        warnings: []
      };
    }

    const endpoint = this.metrics.endpoints[key];
    endpoint.count++;
    endpoint.totalTime += duration;
    endpoint.avgTime = Math.round(endpoint.totalTime / endpoint.count);
    endpoint.minTime = Math.min(endpoint.minTime, duration);
    endpoint.maxTime = Math.max(endpoint.maxTime, duration);

    if (statusCode >= 400) {
      endpoint.errors++;
    }

    if (duration > PERFORMANCE_THRESHOLDS.apiEndpoint) {
      endpoint.warnings.push({
        timestamp: new Date().toISOString(),
        duration,
        threshold: PERFORMANCE_THRESHOLDS.apiEndpoint
      });
    }

    return this.metrics.endpoints[key];
  }

  /**
   * Track database query performance
   */
  trackQuery(sql, duration, error = null) {
    const query = {
      sql: sql.substring(0, 200), // Truncate long queries
      duration,
      timestamp: new Date().toISOString(),
      error
    };

    this.metrics.queries.push(query);

    if (duration > PERFORMANCE_THRESHOLDS.slowQuery) {
      this.metrics.slowestQueries.push({
        ...query,
        category: duration > 1000 ? 'critical' : 'warning'
      });

      // Keep only last 100 slow queries
      if (this.metrics.slowestQueries.length > 100) {
        this.metrics.slowestQueries.shift();
      }

      console.warn(`⚠️ SLOW QUERY (${duration}ms): ${query.sql}...`);
    }

    return query;
  }

  /**
   * Get performance report
   */
  getReport() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    const endpointReport = Object.entries(this.metrics.endpoints)
      .map(([endpoint, data]) => ({
        endpoint,
        ...data,
        hasIssues: data.warnings.length > 0 || data.avgTime > PERFORMANCE_THRESHOLDS.apiEndpoint
      }))
      .sort((a, b) => b.avgTime - a.avgTime);

    const slowQueries = this.metrics.slowestQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20);

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime / 1000),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      api: {
        totalEndpoints: Object.keys(this.metrics.endpoints).length,
        totalRequests: Object.values(this.metrics.endpoints).reduce((sum, ep) => sum + ep.count, 0),
        totalErrors: Object.values(this.metrics.endpoints).reduce((sum, ep) => sum + ep.errors, 0),
        slowEndpoints: endpointReport.filter(ep => ep.hasIssues)
      },
      database: {
        totalQueries: this.metrics.queries.length,
        slowQueries: this.metrics.slowestQueries.length,
        topSlowQueries: slowQueries,
        avgQueryTime: this.metrics.queries.length > 0 
          ? Math.round(this.metrics.queries.reduce((sum, q) => sum + q.duration, 0) / this.metrics.queries.length)
          : 0
      },
      thresholds: PERFORMANCE_THRESHOLDS
    };
  }

  /**
   * Health check - returns true if system is healthy
   */
  getHealthStatus() {
    const report = this.getReport();
    const slowEndpoints = report.api.slowEndpoints.length;
    const slowQueries = report.database.slowQueries;
    const errorRate = report.api.totalRequests > 0 
      ? (report.api.totalErrors / report.api.totalRequests) * 100 
      : 0;

    return {
      healthy: slowEndpoints === 0 && slowQueries === 0 && errorRate < 5,
      status: {
        slowEndpoints: slowEndpoints > 0 ? 'warning' : 'ok',
        slowQueries: slowQueries > 0 ? 'warning' : 'ok',
        errorRate: errorRate > 5 ? 'warning' : errorRate > 1 ? 'caution' : 'ok',
        memory: report.memory.heapUsed > 200 ? 'warning' : 'ok'
      },
      errorRate: Math.round(errorRate * 100) / 100,
      memory: report.memory
    };
  }

  /**
   * Reset metrics (call periodically)
   */
  reset() {
    this.metrics = {
      endpoints: {},
      queries: [],
      slowestQueries: [],
      memorySnapshots: []
    };
  }
}

/**
 * Express middleware to track endpoint performance
 */
function performanceMiddleware(monitor) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      monitor.trackEndpoint(req.method, req.path, duration, res.statusCode);

      // Log slow requests
      if (duration > PERFORMANCE_THRESHOLDS.apiEndpoint) {
        console.warn(`⚠️ SLOW ENDPOINT (${duration}ms): ${req.method} ${req.path}`);
      }
    });

    next();
  };
}

module.exports = {
  PerformanceMonitor,
  performanceMiddleware,
  PERFORMANCE_THRESHOLDS
};
