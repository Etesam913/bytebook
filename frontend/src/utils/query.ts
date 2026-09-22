/**
 * Sonner shows a toast error when QueryError is thrown.
 */
export class QueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryError';
  }
}

/** Shape shared by the generated BackendResponseWith/WithoutData classes. */
type BackendResponse<T> = { success: boolean; message: string; data?: T };

/**
 * Awaits a backend call and throws a QueryError carrying the backend message
 * when it reports failure. Returns the response data, which the bindings type
 * as optional.
 */
export async function getBackendResponseData<T = undefined>(
  response: Promise<BackendResponse<T>> | BackendResponse<T>
): Promise<T | undefined> {
  const res = await response;
  if (!res.success) throw new QueryError(res.message);
  return res.data;
}

/** Like getBackendResponseData, but also treats missing data as a failure. */
export async function requireBackendResponseData<T>(
  response: Promise<BackendResponse<T>> | BackendResponse<T>
): Promise<T> {
  const res = await response;
  if (!res.success || res.data == null) throw new QueryError(res.message);
  return res.data;
}
