/**
 * 将运行时 SEO（尤其是百度验证 meta）写入 client/dist/index.html，
 * 供 Nginx 静态直出时百度爬虫能抓到与平台一致的源码。
 */
import fs from 'fs';
import path from 'path';
import { applySeoToHtml } from './seoFiles.js';

/**
 * @param {string} clientDist
 * @param {{ baiduVerification?: string, siteOrigin?: string }} opts
 */
export function patchClientIndexHtml(clientDist, opts = {}) {
  const htmlPath = path.join(clientDist, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return { ok: false, error: 'index.html 不存在' };
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const next = applySeoToHtml(html, {
    baiduVerification: opts.baiduVerification,
    siteOrigin: opts.siteOrigin || '',
  });
  if (next === html) return { ok: true, unchanged: true };
  fs.writeFileSync(htmlPath, next, 'utf8');
  return { ok: true };
}

/**
 * @param {string} clientDist
 * @param {{ baiduVerification?: string, siteOrigin?: string }} opts
 * @returns {string | null}
 */
export function readClientIndexHtml(clientDist, opts = {}) {
  const htmlPath = path.join(clientDist, 'index.html');
  if (!fs.existsSync(htmlPath)) return null;
  const html = fs.readFileSync(htmlPath, 'utf8');
  return applySeoToHtml(html, {
    baiduVerification: opts.baiduVerification,
    siteOrigin: opts.siteOrigin || '',
  });
}
