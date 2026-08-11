export interface SecretsPort {
  resolve(ref: string): Promise<string>;
}

export class EnvSecretsPort implements SecretsPort {
  async resolve(ref: string): Promise<string> {
    const v = process.env[ref];
    if (!v) throw new Error(`SecretNotFound:${ref}`);
    return v;
  }
}
