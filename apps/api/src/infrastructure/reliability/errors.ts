export class TimeoutError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'TimeoutError';
  }
}

export class CancellationError extends Error {
  constructor(message = 'Operation cancelled', cause?: unknown) {
    super(message, { cause });
    this.name = 'CancellationError';
  }
}

export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
