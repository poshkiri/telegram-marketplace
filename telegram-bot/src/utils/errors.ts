/**
 * Кастомные классы ошибок
 */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends Error {
  public fields: string[];

  constructor(message: string, fields: string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

