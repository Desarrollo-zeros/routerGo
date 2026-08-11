export interface ChallengeNonceProps {
  value: string;
  issuedAt: Date;
  expiresAt: Date;
  userId: string;
  sessionId: string;
}

export class ChallengeNonce {
  constructor(private readonly props: ChallengeNonceProps) {}

  get value(): string {
    return this.props.value;
  }

  get userId(): string {
    return this.props.userId;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  belongsTo(userId: string, sessionId: string): boolean {
    return this.props.userId === userId && this.props.sessionId === sessionId;
  }

  static create(props: ChallengeNonceProps): ChallengeNonce {
    if (!props.value || props.value.length < 16) {
      throw new Error('ChallengeNonce must be >=16 chars');
    }
    if (props.expiresAt <= props.issuedAt) {
      throw new Error('expiresAt must be after issuedAt');
    }
    return new ChallengeNonce(props);
  }

  toProps(): ChallengeNonceProps {
    return { ...this.props };
  }
}
