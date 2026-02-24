/**
 * Safe array access utilities to prevent "Cannot read properties of null" errors
 * These utilities help ensure we never try to access properties on null/undefined values
 */

/**
 * Safely access an array element at a specific index, with fallback support
 * @param array - The array to access
 * @param index - The index to access
 * @param fallback - Optional fallback value if access fails
 * @returns The element at the index, or the fallback value
 */
export function safeArrayAccess<T>(
  array: T[] | null | undefined,
  index: number,
  fallback?: T
): T | undefined {
  if (!array || index < 0 || index >= array.length) {
    return fallback;
  }
  return array[index];
}

/**
 * Safely filter an array to remove null/undefined elements
 * @param array - The array to filter
 * @returns A filtered array with only non-null/undefined elements
 */
export function safeFilterArray<T>(array: (T | null | undefined)[]): T[] {
  return array.filter((item) => item != null) as T[];
}

/**
 * Safely map an array, filtering out null elements first
 * @param array - The array to map
 * @param fn - The mapping function
 * @returns The mapped array with null elements filtered out
 */
export function safeMap<T, R>(
  array: (T | null | undefined)[] | null | undefined,
  fn: (item: T) => R
): R[] {
  if (!array) {
    return [];
  }
  return safeFilterArray(array).map(fn);
}

/**
 * Safely access a property on an object, with fallback support
 * @param obj - The object to access
 * @param property - The property key
 * @param fallback - Optional fallback value
 * @returns The property value or fallback
 */
export function safeProperty<T, K extends keyof T>(
  obj: T | null | undefined,
  property: K,
  fallback?: T[K]
): T[K] | undefined {
  if (obj == null) {
    return fallback;
  }
  return obj[property] ?? fallback;
}

/**
 * Safely check if an array has items with a specific property
 * @param array - The array to check
 * @param predicate - The predicate function
 * @returns True if any item matches the predicate
 */
export function safeSome<T>(
  array: (T | null | undefined)[] | null | undefined,
  predicate: (item: T) => boolean
): boolean {
  if (!array) {
    return false;
  }
  return safeFilterArray(array).some(predicate);
}

/**
 * Safely find an element in an array
 * @param array - The array to search
 * @param predicate - The predicate function
 * @returns The found element or undefined
 */
export function safeFind<T>(
  array: (T | null | undefined)[] | null | undefined,
  predicate: (item: T) => boolean
): T | undefined {
  if (!array) {
    return undefined;
  }
  return safeFilterArray(array).find(predicate);
}
