export class Credits {
  private constructor(private readonly amount: bigint) {}

  static zero(): Credits {
    return new Credits(0n);
  }

  static of(amount: bigint | number): Credits {
    const v = typeof amount === 'number' ? BigInt(amount) : amount;
    if (!Number.isSafeInteger(Number(v)) && v > Number.MAX_SAFE_INTEGER) {
      // allow bigint beyond safe integer, just validate integer
    }
    return new Credits(v);
  }

  static fromBigInt(v: bigint): Credits {
    return new Credits(v);
  }

  get value(): bigint {
    return this.amount;
  }

  add(other: Credits): Credits {
    return new Credits(this.amount + other.amount);
  }

  subtract(other: Credits): Credits {
    return new Credits(this.amount - other.amount);
  }

  isNegative(): boolean {
    return this.amount < 0n;
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  gte(other: Credits): boolean {
    return this.amount >= other.amount;
  }

  gt(other: Credits): boolean {
    return this.amount > other.amount;
  }

  equals(other: Credits): boolean {
    return this.amount === other.amount;
  }

  toNumber(): number {
    return Number(this.amount);
  }

  toString(): string {
    return this.amount.toString();
  }
}
