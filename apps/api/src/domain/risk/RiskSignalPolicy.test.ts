import { describe, expect, it } from 'vitest';
import { evaluateRiskSignals, type RiskSignalInput } from './RiskSignalPolicy.js';

const config = { reviewThreshold: 40, blockThreshold: 80, duplicateWeight: 15, replayWeight: 35, velocityWeight: 10 } as const;

function signal(overrides: Partial<RiskSignalInput> = {}): RiskSignalInput {
  return { currentScore: 0, duplicateCount: 0, replayDetected: false, velocityPerMinute: 0, severity: 0, ...overrides };
}

describe('RiskSignalPolicy', () => {
  it('raises review for duplicate reward or ad signals', () => {
    expect(evaluateRiskSignals(signal({ duplicateCount: 3 }), config)).toMatchObject({ score: 45, action: 'REVIEW' });
  });

  it('blocks replay and high velocity without using a role or raw payload', () => {
    expect(evaluateRiskSignals(signal({ replayDetected: true, velocityPerMinute: 10, severity: 20 }), config)).toMatchObject({ action: 'BLOCKED' });
  });

  it('never lowers an existing score below zero', () => {
    expect(evaluateRiskSignals(signal({ currentScore: 20 }), config)).toEqual({ score: 20, action: 'NORMAL', reason: 'NO_SIGNAL' });
  });
});
