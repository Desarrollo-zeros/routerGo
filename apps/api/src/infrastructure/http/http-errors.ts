export class RouteNotReadyError extends Error {
  constructor() {
    super('RouteNotReady');
    this.name = 'RouteNotReadyError';
  }
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('AuthenticationRequired');
    this.name = 'AuthenticationRequiredError';
  }
}
