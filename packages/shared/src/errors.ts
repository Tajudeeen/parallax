export class ParallaxError extends Error {
  constructor(message: string, public readonly code: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ParallaxError";
  }
}

export class EngineNotFoundError extends ParallaxError {
  constructor(engineName: string) {
    super(`No engine registered under name "${engineName}"`, "ENGINE_NOT_FOUND");
    this.name = "EngineNotFoundError";
  }
}

export class EngineValidationError extends ParallaxError {
  constructor(engineName: string, reasons: string[]) {
    super(`Engine "${engineName}" rejected context: ${reasons.join(", ")}`, "ENGINE_VALIDATION_FAILED");
    this.name = "EngineValidationError";
  }
}

/** For client input problems that aren't authentication failures: bad request, 400. */
export class ValidationError extends ParallaxError {
  constructor(message: string) {
    super(message, "VALIDATION_FAILED");
    this.name = "ValidationError";
  }
}

export class DataHubQueryError extends ParallaxError {
  constructor(message: string, cause?: unknown) {
    super(message, "DATAHUB_QUERY_FAILED", cause);
    this.name = "DataHubQueryError";
  }
}
