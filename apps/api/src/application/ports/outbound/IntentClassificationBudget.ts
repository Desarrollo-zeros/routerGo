export interface IntentClassificationBudgetPort {
  canClassify(): Promise<boolean>;
}
