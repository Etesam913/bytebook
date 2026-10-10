/**
 * Retrieves the value of a specific query parameter from a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to retrieve the value for.
 * @returns The value of the query parameter if found, otherwise null.
 */
export function getQueryParamValue(fullString: string, queryParamName: string) {
  // Match the query string part of the URL
  const queryParamMatch = fullString.match(/\?.*$/);
  if (queryParamMatch) {
    // Extract the query string without the leading '?'
    const queryString = queryParamMatch[0].substring(1);
    const params = new URLSearchParams(queryString);
    // Get the value of the specified query parameter
    return params.get(queryParamName);
  }
  return null;
}

/**
 * Adds or updates a query parameter in a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to add or update.
 * @param queryParamValue - The value of the query parameter to set.
 * @returns The updated URL string with the new or updated query parameter.
 */
export function addQueryParam(
  fullString: string,
  queryParamName: string,
  queryParamValue: string
) {
  // Match the query string part of the URL
  const queryParamMatch = fullString.match(/\?.*$/);
  if (queryParamMatch) {
    // Extract the query string without the leading '?'
    const queryString = queryParamMatch[0].substring(1);
    const params = new URLSearchParams(queryString);
    // Set or update the specified query parameter
    params.set(queryParamName, queryParamValue);
    // Replace the old query string with the new one
    return fullString.replace(/\?.*$/, `?${params.toString()}`);
  }
  // If no query string exists, add the new query parameter
  return `${fullString}?${queryParamName}=${queryParamValue}`;
}

/**
 * Removes a specific query parameter from a given URL string.
 *
 * @param fullString - The full URL string.
 * @param queryParamName - The name of the query parameter to remove.
 * @returns The updated URL string with the query parameter removed.
 */
export function removeQueryParam(fullString: string, queryParamName: string) {
  // Match the query string part of the URL
  const queryParamMatch = fullString.match(/\?.*$/);
  if (queryParamMatch) {
    // Extract the query string without the leading '?'
    const queryString = queryParamMatch[0].substring(1);
    const params = new URLSearchParams(queryString);
    // Delete the specified query parameter
    params.delete(queryParamName);
    // Replace the old query string with the new one, handling the case where the query string is empty
    return fullString.replace(
      /\?.*$/,
      `${params.toString().length === 0 ? '' : '?'}${params.toString()}`
    );
  }
  // If no query string exists, return the original URL
  return fullString;
}
