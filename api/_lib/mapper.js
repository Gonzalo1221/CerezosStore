export function snakeToCamel(str) {
  if (str === 'description') return 'desc';
  return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

export function camelToSnake(str) {
  if (str === 'desc') return 'description';
  return str.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
}

export function mapKeys(obj, converter) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => mapKeys(item, converter));
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[converter(key)] = value;
  }
  return result;
}
