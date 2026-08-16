export type CampaignStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'REJECTED';
export type ModerationStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED';

export type CampaignBudget = { budgetMicro: bigint; spentMicro: bigint };
type CampaignState = { id: string; organizationId: string; status: CampaignStatus; moderation: ModerationStatus; budget: CampaignBudget };

export class Campaign {
  private constructor(private readonly state: CampaignState) {}

  static create(id: string, organizationId: string, budgetMicro: bigint): Campaign {
    if (!id || !organizationId || budgetMicro <= 0n) throw new Error('CAMPAIGN_INVALID');
    return new Campaign({ id, organizationId, status: 'DRAFT', moderation: 'DRAFT', budget: { budgetMicro, spentMicro: 0n } });
  }

  get id(): string { return this.state.id; }
  get organizationId(): string { return this.state.organizationId; }
  get currentStatus(): CampaignStatus { return this.state.status; }
  get moderationStatus(): ModerationStatus { return this.state.moderation; }
  get budgetSnapshot(): CampaignBudget { return { ...this.state.budget }; }

  submitForReview(): void {
    this.requireStatus('DRAFT');
    this.state.status = 'REVIEW';
    this.state.moderation = 'REVIEW';
  }

  approve(): void {
    this.requireStatus('REVIEW');
    this.state.status = 'APPROVED';
    this.state.moderation = 'APPROVED';
  }

  reject(): void {
    if (this.state.status !== 'REVIEW') throw new Error('CAMPAIGN_INVALID_TRANSITION');
    this.state.status = 'REJECTED';
    this.state.moderation = 'REJECTED';
  }

  activate(): void {
    this.requireStatus('APPROVED');
    if (this.state.moderation !== 'APPROVED') throw new Error('CAMPAIGN_NOT_MODERATED');
    this.state.status = 'ACTIVE';
  }

  pause(): void {
    this.requireStatus('ACTIVE');
    this.state.status = 'PAUSED';
  }

  resume(): void {
    this.requireStatus('PAUSED');
    this.state.status = 'ACTIVE';
  }

  recordSpend(amountMicro: bigint): void {
    if (this.state.status !== 'ACTIVE') throw new Error('CAMPAIGN_NOT_ACTIVE');
    if (amountMicro <= 0n || this.state.budget.spentMicro + amountMicro > this.state.budget.budgetMicro) throw new Error('CAMPAIGN_BUDGET_EXCEEDED');
    this.state.budget.spentMicro += amountMicro;
    if (this.state.budget.spentMicro === this.state.budget.budgetMicro) this.state.status = 'COMPLETED';
  }

  private requireStatus(expected: CampaignStatus): void {
    if (this.state.status !== expected) throw new Error('CAMPAIGN_INVALID_TRANSITION');
  }
}
