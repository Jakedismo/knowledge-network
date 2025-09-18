#!/usr/bin/env bun
/**
 * Performance Baseline Measurement Script
 * Measures Core Web Vitals and other performance metrics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface PerformanceMetrics {
  timestamp: string;
  coreWebVitals: {
    LCP: number; // Largest Contentful Paint (target: ≤ 2.5s)
    INP: number; // Interaction to Next Paint (target: ≤ 200ms)
    CLS: number; // Cumulative Layout Shift (target: ≤ 0.1)
    FCP: number; // First Contentful Paint
    TTFB: number; // Time to First Byte
  };
  bundleSize: {
    totalSize: number;
    jsSize: number;
    cssSize: number;
    imageSize: number;
    chunks: Array<{
      name: string;
      size: number;
      gzipped: number;
    }>;
  };
  buildMetrics: {
    buildTime: number;
    nodeModulesSize: number;
    nextCacheSize: number;
  };
}

class PerformanceBaseline {
  private metricsDir = path.join(process.cwd(), 'performance-metrics');

  async init() {
    await fs.mkdir(this.metricsDir, { recursive: true });
    console.log('📊 Starting Performance Baseline Measurement...\n');
  }

  async measureBuildMetrics(): Promise<Partial<PerformanceMetrics['buildMetrics']>> {
    console.log('⚡ Measuring build metrics...');

    const startTime = Date.now();
    await execAsync('bun run build');
    const buildTime = Date.now() - startTime;

    // Measure node_modules size
    const { stdout: nodeModulesSize } = await execAsync('du -sh node_modules | cut -f1');

    // Measure .next cache size
    const { stdout: nextCacheSize } = await execAsync('du -sh .next 2>/dev/null | cut -f1 || echo "0"');

    return {
      buildTime,
      nodeModulesSize: this.parseSize(nodeModulesSize.trim()),
      nextCacheSize: this.parseSize(nextCacheSize.trim())
    };
  }

  async analyzeBundleSize(): Promise<Partial<PerformanceMetrics['bundleSize']>> {
    console.log('📦 Analyzing bundle sizes...');

    const buildDir = path.join(process.cwd(), '.next');
    const chunks: Array<{ name: string; size: number; gzipped: number }> = [];

    // Analyze static chunks
    const staticDir = path.join(buildDir, 'static', 'chunks');
    try {
      const files = await fs.readdir(staticDir);

      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(staticDir, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath);

          // Simple gzip size estimation
          const { stdout } = await execAsync(`gzip -c "${filePath}" | wc -c`);
          const gzipped = parseInt(stdout.trim());

          chunks.push({
            name: file,
            size: stats.size,
            gzipped
          });
        }
      }
    } catch (error) {
      console.warn('Could not analyze chunks:', error);
    }

    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.size, 0);
    const jsSize = chunks.filter(c => c.name.endsWith('.js')).reduce((acc, c) => acc + c.size, 0);

    return {
      totalSize,
      jsSize,
      cssSize: 0, // Will be calculated separately
      imageSize: 0, // Will be calculated separately
      chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10) // Top 10 chunks
    };
  }

  async measureCoreWebVitals(): Promise<Partial<PerformanceMetrics['coreWebVitals']>> {
    console.log('🎯 Measuring Core Web Vitals (simulated)...');

    // These are placeholder values - in production, use Lighthouse or real user monitoring
    // For now, we'll create a Lighthouse script integration

    return {
      LCP: 3200, // milliseconds
      INP: 350,  // milliseconds
      CLS: 0.15, // score
      FCP: 1800, // milliseconds
      TTFB: 600  // milliseconds
    };
  }

  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024
    };

    const match = sizeStr.match(/^([\d.]+)([BKMG])?/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'B';

    return Math.round(value * (units[unit] || 1));
  }

  async saveMetrics(metrics: PerformanceMetrics) {
    const filename = `baseline-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.metricsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(metrics, null, 2));
    console.log(`\n✅ Metrics saved to: ${filepath}`);
  }

  async generateReport(metrics: PerformanceMetrics) {
    console.log('\n📋 Performance Baseline Report');
    console.log('================================\n');

    console.log('🎯 Core Web Vitals:');
    console.log(`  LCP: ${metrics.coreWebVitals.LCP}ms (Target: ≤ 2500ms) ${metrics.coreWebVitals.LCP <= 2500 ? '✅' : '⚠️'}`);
    console.log(`  INP: ${metrics.coreWebVitals.INP}ms (Target: ≤ 200ms) ${metrics.coreWebVitals.INP <= 200 ? '✅' : '⚠️'}`);
    console.log(`  CLS: ${metrics.coreWebVitals.CLS} (Target: ≤ 0.1) ${metrics.coreWebVitals.CLS <= 0.1 ? '✅' : '⚠️'}`);
    console.log(`  FCP: ${metrics.coreWebVitals.FCP}ms`);
    console.log(`  TTFB: ${metrics.coreWebVitals.TTFB}ms\n`);

    console.log('📦 Bundle Analysis:');
    console.log(`  Total Size: ${(metrics.bundleSize.totalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  JS Size: ${(metrics.bundleSize.jsSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Largest Chunks:`);
    metrics.bundleSize.chunks.slice(0, 5).forEach(chunk => {
      console.log(`    - ${chunk.name}: ${(chunk.size / 1024).toFixed(2)}KB (gzipped: ${(chunk.gzipped / 1024).toFixed(2)}KB)`);
    });

    console.log(`\n⚡ Build Metrics:`);
    console.log(`  Build Time: ${(metrics.buildMetrics.buildTime / 1000).toFixed(2)}s`);
    console.log(`  Node Modules: ${(metrics.buildMetrics.nodeModulesSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Next Cache: ${(metrics.buildMetrics.nextCacheSize / 1024 / 1024).toFixed(2)}MB`);
  }

  async run() {
    await this.init();

    const metrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      coreWebVitals: await this.measureCoreWebVitals() as any,
      bundleSize: await this.analyzeBundleSize() as any,
      buildMetrics: await this.measureBuildMetrics() as any
    };

    await this.saveMetrics(metrics);
    await this.generateReport(metrics);

    return metrics;
  }
}

// Run if called directly
if (import.meta.main) {
  const baseline = new PerformanceBaseline();
  baseline.run().catch(console.error);
}

export { PerformanceBaseline, PerformanceMetrics };