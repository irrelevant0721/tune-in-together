export function socketPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return {};
  return value;
}

/** Normalize the first argument of application Socket.IO events while preserving ack callbacks. */
export function normalizeSocketEventArgs(event, args) {
  if (event === 'disconnect') return args;
  if (args.length === 0) return [{}];
  if (typeof args[0] === 'function') return [{}, ...args];
  return [socketPayload(args[0]), ...args.slice(1)];
}
