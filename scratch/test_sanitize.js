function sanitizeLog(obj) {
  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj);
      return sanitizeLog(parsed);
    } catch(e) {
      return JSON.stringify(obj);
    }
  }
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  
  const copy = JSON.parse(JSON.stringify(obj));
  function traverse(o) {
    if (typeof o !== 'object' || o === null) return;
    for (const key of Object.keys(o)) {
      if (['password_hash', 'passwordHash', 'token', 'secret'].includes(key)) {
        o[key] = '[REDACTED]';
      } else if (typeof o[key] === 'object') {
        traverse(o[key]);
      }
    }
  }
  traverse(copy);
  return JSON.stringify(copy);
}

console.log('string:', sanitizeLog("hello"));
console.log('quoted string:', sanitizeLog('"hello"'));
console.log('number:', sanitizeLog(123));
console.log('null:', sanitizeLog(null));
