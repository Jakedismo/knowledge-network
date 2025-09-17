export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxAttempts?: number;
  monitoringPeriod?: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailTime: number = 0;
  private halfOpenAttempts: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxAttempts: number;
  private readonly monitoringPeriod: number;
  private stats: {
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    lastOpenTime?: number;
    lastCloseTime?: number;
  };

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 60 seconds
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 3;
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check if circuit should be opened
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.resetTimeout) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker is OPEN. Will retry after ${new Date(this.lastFailTime + this.resetTimeout).toISOString()}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.totalSuccesses++;

    switch (this.state) {
      case 'CLOSED':
        this.failures = 0; // Reset failure count on success
        break;

      case 'HALF_OPEN':
        this.successes++;
        this.halfOpenAttempts++;

        // If we've had enough successful attempts, close the circuit
        if (this.successes >= this.halfOpenMaxAttempts) {
          this.transitionTo('CLOSED');
        }
        break;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.stats.totalFailures++;
    this.lastFailTime = Date.now();

    switch (this.state) {
      case 'CLOSED':
        this.failures++;

        // Check if we should open the circuit
        if (this.failures >= this.failureThreshold) {
          this.transitionTo('OPEN');
        }
        break;

      case 'HALF_OPEN':
        // Any failure in half-open state reopens the circuit
        this.transitionTo('OPEN');
        break;
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    console.log(`Circuit breaker state transition: ${oldState} → ${newState}`);

    switch (newState) {
      case 'OPEN':
        this.stats.lastOpenTime = Date.now();
        this.failures = 0;
        this.successes = 0;
        break;

      case 'CLOSED':
        this.stats.lastCloseTime = Date.now();
        this.failures = 0;
        this.successes = 0;
        this.halfOpenAttempts = 0;
        break;

      case 'HALF_OPEN':
        this.successes = 0;
        this.halfOpenAttempts = 0;
        break;
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitBreakerState;
    failures: number;
    successes: number;
    stats: typeof this.stats;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      stats: { ...this.stats }
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failures = 0;
    this.successes = 0;
    this.lastFailTime = 0;
    this.halfOpenAttempts = 0;
  }

  /**
   * Force the circuit breaker to open
   */
  trip(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Check if the circuit breaker is allowing requests
   */
  isAllowingRequests(): boolean {
    if (this.state === 'OPEN') {
      return Date.now() - this.lastFailTime > this.resetTimeout;
    }
    return true;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): {
    state: CircuitBreakerState;
    successRate: number;
    failureRate: number;
    totalRequests: number;
    uptimePercentage: number;
  } {
    const total = this.stats.totalRequests || 1;
    const successRate = (this.stats.totalSuccesses / total) * 100;
    const failureRate = (this.stats.totalFailures / total) * 100;

    // Calculate uptime (time in CLOSED or HALF_OPEN state)
    let uptimePercentage = 100;
    if (this.stats.lastOpenTime && this.stats.lastCloseTime) {
      const downtime = (this.stats.lastCloseTime - this.stats.lastOpenTime) / 1000;
      const totalTime = (Date.now() - Math.min(this.stats.lastOpenTime, this.stats.lastCloseTime)) / 1000;
      uptimePercentage = ((totalTime - downtime) / totalTime) * 100;
    }

    return {
      state: this.state,
      successRate,
      failureRate,
      totalRequests: this.stats.totalRequests,
      uptimePercentage
    };
  }
}

/**
 * Circuit breaker with exponential backoff
 */
export class ExponentialBackoffCircuitBreaker extends CircuitBreaker {
  private backoffMultiplier: number = 2;
  private currentResetTimeout: number;
  private maxResetTimeout: number;

  constructor(options: CircuitBreakerOptions & {
    backoffMultiplier?: number;
    maxResetTimeout?: number;
  } = {}) {
    super(options);
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.currentResetTimeout = this.resetTimeout;
    this.maxResetTimeout = options.maxResetTimeout || 300000; // 5 minutes max
  }

  protected onFailure(): void {
    super.onFailure();

    // Increase reset timeout exponentially on repeated failures
    if (this.state === 'OPEN') {
      this.currentResetTimeout = Math.min(
        this.currentResetTimeout * this.backoffMultiplier,
        this.maxResetTimeout
      );
    }
  }

  protected onSuccess(): void {
    super.onSuccess();

    // Reset the timeout on successful close
    if (this.state === 'CLOSED') {
      this.currentResetTimeout = this.resetTimeout;
    }
  }
}
