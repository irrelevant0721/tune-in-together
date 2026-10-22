import { getRuntimeConfig } from './runtimeConfig.js';

const DEFAULT_TIMEOUT_MS = 10000;

export function getApihzId() {
  return getRuntimeConfig().apihzId;
}

export function getApihzKey() {
  return getRuntimeConfig().apihzKey;
}

export function isApihzConfigured() {
  return Boolean(getApihzId() && getApihzKey());
}

export function buildApihzUrl(endpoint) {
  const path = String(endpoint || '').replace(/^\//, '');
  return `${getRuntimeConfig().apihzBaseUrl}/${path}`;
}

export async function fetchApihz(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
