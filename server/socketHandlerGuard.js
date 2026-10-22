import { normalizeSocketEventArgs } from './socketPayload.js';

/**
 * 给单个 Socket 实例的事件处理器补上入参归一化和异常兜底。
 */
export function hardenSocketHandlers(target) {
  const originalOn = target.on.bind(target);
  target.on = (event, handler) => {
    if (typeof handler !== 'function') return originalOn(event, handler);
    return originalOn(event, (...args) => {
      const normalizedArgs = normalizeSocketEventArgs(event, args);
      const callback = typeof normalizedArgs[normalizedArgs.length - 1] === 'function'
        ? normalizedArgs[normalizedArgs.length - 1]
        : null;
      const reportFailure = (err) => {
        console.error(`socket 事件 "${event}" 处理失败:`, err?.message || err);
        const payload = { success: false, error: '服务器内部错误，请重试' };
        if (callback) callback(payload);
        else if (typeof target.emit === 'function') {
          target.emit('socket_operation_error', { event: String(event), error: payload.error });
        }
      };
      try {
        const result = handler(...normalizedArgs);
        if (result && typeof result.catch === 'function') {
          result.catch(reportFailure);
        }
      } catch (err) {
        reportFailure(err);
      }
    });
  };
  return target;
}
