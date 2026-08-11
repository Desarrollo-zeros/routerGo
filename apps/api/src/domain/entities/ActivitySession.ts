export type ActivityStatus =
  | 'CREATED'
  | 'CALIBRATING'
  | 'ACTIVE'
  | 'SUBMITTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'REJECTED';

export interface ActivitySessionProps {
  id: string;
  userId: string;
  walletId: string;
  status: ActivityStatus;
  reps: number;
  challengeNonce: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date | null;
  rejectedReason?: string | null;
}

export class ActivitySession {
  constructor(private props: ActivitySessionProps) {}

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get walletId(): string {
    return this.props.walletId;
  }

  get status(): ActivityStatus {
    return this.props.status;
  }

  get reps(): number {
    return this.props.reps;
  }

  get challengeNonce(): string {
    return this.props.challengeNonce;
  }

  canSubmit(): boolean {
    return this.props.status === 'ACTIVE' || this.props.status === 'CREATED';
  }

  markVerifying(): void {
    if (!this.canSubmit()) throw new Error('InvalidTransition');
    this.props.status = 'VERIFYING';
    this.props.updatedAt = new Date();
  }

  markVerified(): void {
    this.props.status = 'VERIFIED';
    this.props.verifiedAt = new Date();
    this.props.updatedAt = new Date();
  }

  markRejected(reason: string): void {
    this.props.status = 'REJECTED';
    this.props.rejectedReason = reason;
    this.props.updatedAt = new Date();
  }

  toProps(): ActivitySessionProps {
    return { ...this.props };
  }

  static create(props: ActivitySessionProps): ActivitySession {
    if (!props.id || !props.userId) throw new Error('ActivitySession id/userId required');
    if (props.reps < 0) throw new Error('reps must be >=0');
    return new ActivitySession(props);
  }
}
