import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test result interfaces
export interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  suite: string;
  category: string;
  file: string;
  timestamp: string;
}

export interface TestSuite {
  name: string;
  category: string;
  file: string;
  tests: TestResult[];
  startTime: number;
  endTime: number;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface TestReport {
  id: string;
  timestamp: string;
  environment: {
    node: string;
    browser?: string;
    os: string;
    ci: boolean;
  };
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance: {
    totalDuration: number;
    slowestTest: TestResult;
    averageTestDuration: number;
  };
  suites: TestSuite[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    successRate: number;
  };
  trends: {
    previousRuns: TestRunSummary[];
    improvementAreas: string[];
    regressions: string[];
  };
}

export interface TestRunSummary {
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  duration: number;
  coverage: number;
}

// Test Reporter Class
export class TestReporter {
  private results: TestResult[] = [];
  private suites: Map<string, TestSuite> = new Map();
  private startTime: number = Date.now();
  private reportHistory: TestRunSummary[] = [];

  constructor() {
    this.loadHistoricalData();
  }

  // Record test result
  recordTest(result: TestResult): void {
    this.results.push(result);
    this.updateSuite(result);
  }

  // Update suite statistics
  private updateSuite(result: TestResult): void {
    const suiteKey = `${result.category}-${result.suite}`;
    
    if (!this.suites.has(suiteKey)) {
      this.suites.set(suiteKey, {
        name: result.suite,
        category: result.category,
        file: result.file,
        tests: [],
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
      });
    }

    const suite = this.suites.get(suiteKey)!;
    suite.tests.push(result);
    suite.total++;
    
    switch (result.status) {
      case 'passed':
        suite.passed++;
        break;
      case 'failed':
        suite.failed++;
        break;
      case 'skipped':
        suite.skipped++;
        break;
    }
    
    suite.endTime = Date.now();
    suite.duration = suite.endTime - suite.startTime;
  }

  // Generate comprehensive test report
  generateReport(): TestReport {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    
    const summary = this.calculateSummary();
    const performance = this.calculatePerformance();
    const trends = this.calculateTrends();

    const report: TestReport = {
      id: `test-run-${Date.now()}`,
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      coverage: this.getCoverageInfo(),
      performance,
      suites: Array.from(this.suites.values()),
      summary,
      trends
    };

    this.saveReportHistory(summary);
    return report;
  }

  // Calculate overall summary
  private calculateSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, skipped, successRate };
  }

  // Calculate performance metrics
  private calculatePerformance() {
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);
    const slowestTest = this.results.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest,
      this.results[0] || { duration: 0 } as TestResult
    );
    const averageTestDuration = this.results.length > 0 ? totalDuration / this.results.length : 0;

    return { totalDuration, slowestTest, averageTestDuration };
  }

  // Calculate trends and regressions
  private calculateTrends() {
    const currentRun = this.calculateSummary();
    const improvementAreas: string[] = [];
    const regressions: string[] = [];

    if (this.reportHistory.length > 0) {
      const lastRun = this.reportHistory[this.reportHistory.length - 1];
      
      // Check for regressions
      if (currentRun.successRate < lastRun.passed / lastRun.total * 100) {
        regressions.push('Overall success rate decreased');
      }
      
      const currentAvgDuration = this.calculatePerformance().averageTestDuration;
      const lastAvgDuration = lastRun.duration / lastRun.total;
      
      if (currentAvgDuration > lastAvgDuration * 1.1) {
        regressions.push('Test execution time increased by >10%');
      }
      
      // Check for improvements
      if (currentRun.successRate > lastRun.passed / lastRun.total * 100) {
        improvementAreas.push('Overall success rate improved');
      }
      
      if (currentAvgDuration < lastAvgDuration * 0.9) {
        improvementAreas.push('Test execution time improved by >10%');
      }
    }

    return {
      previousRuns: this.reportHistory.slice(-10), // Last 10 runs
      improvementAreas,
      regressions
    };
  }

  // Get environment information
  private getEnvironmentInfo() {
    return {
      node: process.version,
      browser: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      os: process.platform,
      ci: !!process.env.CI
    };
  }

  // Get coverage information (mock implementation)
  private getCoverageInfo() {
    // In real implementation, this would integrate with coverage tools
    return {
      statements: 92.5,
      branches: 88.3,
      functions: 94.1,
      lines: 91.8
    };
  }

  // Save report history for trend analysis
  private saveReportHistory(summary: any): void {
    const runSummary: TestRunSummary = {
      timestamp: new Date().toISOString(),
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      duration: this.calculatePerformance().totalDuration,
      coverage: this.getCoverageInfo().lines
    };

    this.reportHistory.push(runSummary);
    
    // Keep only last 50 runs
    if (this.reportHistory.length > 50) {
      this.reportHistory = this.reportHistory.slice(-50);
    }

    // In real implementation, save to persistent storage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('test-history', JSON.stringify(this.reportHistory));
    }
  }

  // Load historical data
  private loadHistoricalData(): void {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('test-history');
      if (stored) {
        try {
          this.reportHistory = JSON.parse(stored);
        } catch (error) {
          console.warn('Failed to load test history:', error);
          this.reportHistory = [];
        }
      }
    }
  }

  // Generate HTML report
  generateHTMLReport(report: TestReport): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SOP System Test Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
          .metric { background: #ecf0f1; padding: 15px; border-radius: 6px; text-align: center; }
          .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
          .metric-label { color: #7f8c8d; margin-top: 5px; }
          .success { color: #27ae60; }
          .error { color: #e74c3c; }
          .warning { color: #f39c12; }
          .section { margin: 20px; }
          .suite { border: 1px solid #bdc3c7; margin: 10px 0; border-radius: 6px; }
          .suite-header { background: #ecf0f1; padding: 10px; border-radius: 6px 6px 0 0; font-weight: bold; }
          .test { padding: 8px 15px; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; }
          .test:last-child { border-bottom: none; }
          .status { padding: 2px 8px; border-radius: 12px; color: white; font-size: 0.8em; }
          .passed { background: #27ae60; }
          .failed { background: #e74c3c; }
          .skipped { background: #95a5a6; }
          .chart { height: 300px; margin: 20px 0; }
          .trends { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .trend-item { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 5px 0; }
          .improvement { border-left: 4px solid #27ae60; }
          .regression { border-left: 4px solid #e74c3c; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 SOP System Test Report</h1>
            <p>Generated: ${report.timestamp}</p>
            <p>Environment: ${report.environment.node} on ${report.environment.os}</p>
          </div>
          
          <div class="summary">
            <div class="metric">
              <div class="metric-value ${report.summary.successRate >= 90 ? 'success' : report.summary.successRate >= 70 ? 'warning' : 'error'}">
                ${report.summary.successRate.toFixed(1)}%
              </div>
              <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
              <div class="metric-value success">${report.summary.passed}</div>
              <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
              <div class="metric-value error">${report.summary.failed}</div>
              <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
              <div class="metric-value">${report.summary.total}</div>
              <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
              <div class="metric-value">${(report.performance.totalDuration / 1000).toFixed(2)}s</div>
              <div class="metric-label">Duration</div>
            </div>
            <div class="metric">
              <div class="metric-value">${report.coverage.lines.toFixed(1)}%</div>
              <div class="metric-label">Line Coverage</div>
            </div>
          </div>

          <div class="section">
            <h2>📊 Test Results by Category</h2>
            <canvas id="categoryChart" class="chart"></canvas>
          </div>

          <div class="section">
            <h2>📈 Trends Analysis</h2>
            <div class="trends">
              <div>
                <h3>🎯 Improvements</h3>
                ${report.trends.improvementAreas.map(item => 
                  `<div class="trend-item improvement">${item}</div>`
                ).join('')}
                ${report.trends.improvementAreas.length === 0 ? '<div class="trend-item">No improvements detected</div>' : ''}
              </div>
              <div>
                <h3>⚠️ Regressions</h3>
                ${report.trends.regressions.map(item => 
                  `<div class="trend-item regression">${item}</div>`
                ).join('')}
                ${report.trends.regressions.length === 0 ? '<div class="trend-item">No regressions detected</div>' : ''}
              </div>
            </div>
          </div>

          <div class="section">
            <h2>🔍 Detailed Results</h2>
            ${report.suites.map(suite => `
              <div class="suite">
                <div class="suite-header">
                  ${suite.name} (${suite.category})
                  <span style="float: right;">
                    ${suite.passed}/${suite.total} passed (${((suite.passed / suite.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                ${suite.tests.map(test => `
                  <div class="test">
                    <span>${test.name}</span>
                    <div>
                      <span class="status ${test.status}">${test.status.toUpperCase()}</span>
                      <span style="margin-left: 10px; color: #7f8c8d;">
                        ${test.duration.toFixed(2)}ms
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>⚡ Performance Analysis</h2>
            <p><strong>Slowest Test:</strong> ${report.performance.slowestTest.name} (${report.performance.slowestTest.duration.toFixed(2)}ms)</p>
            <p><strong>Average Test Duration:</strong> ${report.performance.averageTestDuration.toFixed(2)}ms</p>
            <canvas id="performanceChart" class="chart"></canvas>
          </div>
        </div>

        <script>
          // Category chart
          const categoryData = ${JSON.stringify(this.getCategoryData(report))};
          new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
              labels: Object.keys(categoryData),
              datasets: [{
                data: Object.values(categoryData),
                backgroundColor: ['#27ae60', '#e74c3c', '#3498db', '#f39c12', '#9b59b6']
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: 'bottom' }
              }
            }
          });

          // Performance trend chart
          const performanceData = ${JSON.stringify(report.trends.previousRuns)};
          new Chart(document.getElementById('performanceChart'), {
            type: 'line',
            data: {
              labels: performanceData.map(run => new Date(run.timestamp).toLocaleDateString()),
              datasets: [{
                label: 'Success Rate (%)',
                data: performanceData.map(run => (run.passed / run.total) * 100),
                borderColor: '#27ae60',
                tension: 0.1
              }, {
                label: 'Average Duration (ms)',
                data: performanceData.map(run => run.duration / run.total),
                borderColor: '#3498db',
                tension: 0.1,
                yAxisID: 'y1'
              }]
            },
            options: {
              responsive: true,
              scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Success Rate (%)' } },
                y1: { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'Duration (ms)' } }
              }
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  // Get category data for charts
  private getCategoryData(report: TestReport) {
    const categories = {};
    report.suites.forEach(suite => {
      if (!categories[suite.category]) {
        categories[suite.category] = 0;
      }
      categories[suite.category] += suite.total;
    });
    return categories;
  }

  // Generate JSON report for CI/CD integration
  generateJSONReport(report: TestReport): string {
    return JSON.stringify(report, null, 2);
  }

  // Generate JUnit XML report for CI/CD integration
  generateJUnitReport(report: TestReport): string {
    const escapeXml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites 
  name="SOP System Tests" 
  tests="${report.summary.total}" 
  failures="${report.summary.failed}" 
  time="${(report.performance.totalDuration / 1000).toFixed(3)}"
>
${report.suites.map(suite => `
  <testsuite 
    name="${escapeXml(suite.name)}" 
    tests="${suite.total}" 
    failures="${suite.failed}" 
    time="${(suite.duration / 1000).toFixed(3)}"
  >
${suite.tests.map(test => `
    <testcase 
      name="${escapeXml(test.name)}" 
      classname="${escapeXml(suite.category)}.${escapeXml(suite.name)}" 
      time="${(test.duration / 1000).toFixed(3)}"
    >
${test.status === 'failed' ? `
      <failure message="${escapeXml(test.error || 'Test failed')}">${escapeXml(test.error || '')}</failure>
` : ''}
${test.status === 'skipped' ? `
      <skipped />
` : ''}
    </testcase>
`).join('')}
  </testsuite>
`).join('')}
</testsuites>`;
  }

  // Clear results for new test run
  reset(): void {
    this.results = [];
    this.suites.clear();
    this.startTime = Date.now();
  }
}

// Global test reporter instance
export const testReporter = new TestReporter();

// Vitest integration helpers
export const setupTestReporting = () => {
  // Integration with Vitest lifecycle hooks would go here
  // This is a simplified version for demonstration
  
  beforeEach(() => {
    // Record test start
  });

  afterEach((context) => {
    // Record test result
    const result: TestResult = {
      id: `test-${Date.now()}-${Math.random()}`,
      name: context?.meta?.name || 'Unknown Test',
      status: 'passed', // Would be determined from actual test result
      duration: 100, // Would be calculated from actual timing
      suite: 'Unknown Suite',
      category: 'unit',
      file: 'unknown.test.ts',
      timestamp: new Date().toISOString()
    };
    
    testReporter.recordTest(result);
  });
};

// Export utility functions for test analysis
export const analyzeTestResults = (results: TestResult[]) => {
  const slowTests = results
    .filter(test => test.duration > 1000)
    .sort((a, b) => b.duration - a.duration);

  const flakyTests = results
    .reduce((acc, test) => {
      const key = `${test.suite}-${test.name}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(test.status);
      return acc;
    }, {} as Record<string, string[]>);

  const flaky = Object.entries(flakyTests)
    .filter(([, statuses]) => new Set(statuses).size > 1)
    .map(([testKey]) => testKey);

  const categoryStats = results.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = { total: 0, passed: 0, failed: 0 };
    }
    acc[test.category].total++;
    if (test.status === 'passed') acc[test.category].passed++;
    if (test.status === 'failed') acc[test.category].failed++;
    return acc;
  }, {} as Record<string, any>);

  return {
    slowTests: slowTests.slice(0, 10),
    flakyTests: flaky,
    categoryStats
  };
};

export default TestReporter;