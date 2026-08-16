export interface ListModelsOutput {
  object: 'list';
  data: Array<{ id: string; object: 'model'; created: number; owned_by: string }>;
}

export interface ListModelsPort {
  execute(): Promise<ListModelsOutput>;
}
