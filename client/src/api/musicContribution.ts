import { fetchWithTimeout } from './http';
import type { MusicAccountPlatform, MusicAccountQrSession } from '../lib/musicAccountQr';

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  code?: string;
  data?: T;
  message?: string;
  revokeToken?: string;
  updated?: boolean;
}

export interface SharedContribution {
  providerName: string;
  platform: MusicAccountPlatform;
  tier: 'vip' | 'svip';
  source: 'homepage' | 'room' | string;
  updatedAt: number;
}

function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  return response.json().catch(() => ({})).then((data) => ({
    success: response.ok && data?.success !== false,
    ...data,
    error: data?.error || (!response.ok ? '请求失败，请稍后再试' : undefined),
  }));
}

export async function createContributionQr(platform: MusicAccountPlatform) {
  const response = await fetchWithTimeout('/api/music-account-contribution/qr/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  }, 45_000);
  return parseResponse<MusicAccountQrSession>(response);
}

export async function checkContributionQr(payload: Record<string, unknown>) {
  const response = await fetchWithTimeout('/api/music-account-contribution/qr/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, 45_000);
  return parseResponse<Record<string, unknown>>(response);
}

export async function startQishuiVerification(sessionId: string) {
  const response = await fetchWithTimeout('/api/music-account-contribution/qr/verify/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }, 45_000);
  return parseResponse<Record<string, unknown>>(response);
}

export async function requestQishuiVerification(sessionId: string, request: Record<string, unknown>) {
  const response = await fetchWithTimeout('/api/music-account-contribution/qr/verify/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, request }),
  }, 180_000);
  return parseResponse<Record<string, unknown>>(response);
}

export async function completeQishuiVerification(sessionId: string) {
  const response = await fetchWithTimeout('/api/music-account-contribution/qr/verify/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }, 180_000);
  return parseResponse<Record<string, unknown>>(response);
}

export async function bindContributionAccount(sessionId: string, providerName: string) {
  const response = await fetchWithTimeout('/api/music-account-contribution/bind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, providerName }),
  }, 45_000);
  return parseResponse<Record<string, unknown>>(response);
}

export async function revokeContribution(revokeToken: string) {
  const response = await fetchWithTimeout('/api/music-account-contribution/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ revokeToken }),
  }, 15_000);
  return parseResponse<Record<string, unknown>>(response);
}

export async function fetchSharedContributions() {
  const response = await fetchWithTimeout('/api/music-account-contribution/shared?limit=20', {
    method: 'GET',
  }, 15_000);
  return parseResponse<SharedContribution[]>(response);
}
