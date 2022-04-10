export function uniqueBy<T, U>(array: T[], fn: (el: T) => U): T[] {
  const seenKeys = new Set<U>();
  const result: T[] = [];
  for (const el of array) {
    const key = fn(el);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push(el);
    }
  }
  return result;
}
