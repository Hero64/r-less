const createHttpError = (message: string) => {
  return class HttpError extends Error {
    constructor() {
      super(message);
    }
  };
};

/**
 * Authorized status (401)
 */
export const UnauthorizedError = createHttpError('UNAUTHORIZED');
/**
 * Bad Request status (400)
 */
export const BadRequestError = createHttpError('FAILED');
/**
 * Not Found status (404)
 */
export const NotFoundError = createHttpError('NOT_FOUND');
/**
 * Internal server error status (500)
 */
export const InternalError = createHttpError('ERROR');
