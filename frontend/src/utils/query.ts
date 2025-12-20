/**
 * Sonner shows a toast error when QueryError is thrown.
 */
export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryError';
  }
}
