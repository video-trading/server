/**
 * Takes an object and returns a copy of the object with all $oid values replaced with the value of $oid
 * @param data
 */
export function objectIdToId(data: { [key: string]: any }): {
  [key: string]: any;
} {
  const deepCopy = JSON.parse(JSON.stringify(data));
  // for each key check if value is an object with $oid key
  // if it is, replace the value with the value of $oid
  // if it is not, return the value
  for (const key in deepCopy) {
    if (typeof deepCopy[key] === 'object' && '$oid' in deepCopy[key]) {
      deepCopy[key] = deepCopy[key].$oid;
    }
    // if value is an object, recursively call objectIdToId
    if (typeof deepCopy[key] === 'object') {
      deepCopy[key] = objectIdToId(deepCopy[key]);
    }
  }
  return deepCopy;
}
