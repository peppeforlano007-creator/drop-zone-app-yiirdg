
/**
 * Performance Monitoring Utilities
 * 
 * This file contains utilities for monitoring and optimizing app performance.
 */

import { InteractionManager } from 'react-native';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = __DEV__; // Only enable in development

  /**
   * Start measuring a performance metric
   */
  start(metricName: string) {
    if (!this.enabled) return;

    this.metrics.set(metricName, {
      name: metricName,
      startTime: Date.now(),
    });

    console.log(`⏱️ Performance: Started measuring "${metricName}"`);
  }

  /**
   * End measuring a performance metric
   */
  end(metricName: string) {
    if (!this.enabled) return;

    const metric = this.metrics.get(metricName);
    if (!metric) {
      console.warn(`⏱️ Performance: Metric "${metricName}" not found`);
      return;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`⏱️ Performance: "${metricName}" took ${metric.duration}ms`);

    // Warn if operation took too long
    if (metric.duration > 1000) {
      console.warn(`⚠️ Performance: "${metricName}" took ${metric.duration}ms (>1s)`);
    }

    return metric.duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(metricName: string, operation: () => Promise<T>): Promise<T> {
    this.start(metricName);
    try {
      const result = await operation();
      this.end(metricName);
      return result;
    } catch (error) {
      this.end(metricName);
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(metricName: string): number | null {
    const metrics = Array.from(this.metrics.values())
      .filter(m => m.name === metricName && m.duration !== undefined);

    if (metrics.length === 0) return null;

    const total = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    return total / metrics.length;
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to measure component render time
 */
export function usePerformanceMonitor(componentName: string) {
  const metricName = `${componentName}_render`;
  
  React.useEffect(() => {
    performanceMonitor.start(metricName);
    
    return () => {
      performanceMonitor.end(metricName);
    };
  }, [metricName]);
}

/**
 * Defer execution until after interactions are complete
 */
export function runAfterInteractions(callback: () => void) {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
}

/**
 * Measure image loading performance
 */
export function measureImageLoad(imageUrl: string, onLoad: () => void) {
  const metricName = `image_load_${imageUrl.substring(0, 50)}`;
  performanceMonitor.start(metricName);
  
  return () => {
    performanceMonitor.end(metricName);
    onLoad();
  };
}

/**
 * Measure network request performance
 */
export async function measureNetworkRequest<T>(
  requestName: string,
  request: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measure(`network_${requestName}`, request);
}

// Import React for the hook
import React from 'react';
