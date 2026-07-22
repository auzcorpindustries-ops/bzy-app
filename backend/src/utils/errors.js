export class ApiError extends Error {
  constructor(message, status = 400, code = 'bad_request') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(msg = 'Not found') {
  return new ApiError(msg, 404, 'not_found');
}

export function forbidden(msg = 'Forbidden') {
  return new ApiError(msg, 403, 'forbidden');
}

export function badRequest(msg = 'Bad request') {
  return new ApiError(msg, 400, 'bad_request');
}

export function conflict(msg = 'Conflict') {
  return new ApiError(msg, 409, 'conflict');
}
