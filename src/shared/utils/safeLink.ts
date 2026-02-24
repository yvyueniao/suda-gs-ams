// src/shared/utils/safeLink.ts

/** 允许的协议（默认只放行 http/https） */
const ALLOW_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * 可选：允许的外链域名白名单（上线时强烈建议配置）
 * - 开发期你也可以先留空数组：表示“只校验协议，不校验域名”
 */
const ALLOW_HOSTS: string[] = [
  // 例如：
  // "localhost",
  // "127.0.0.1",
  // "your-api-domain.com",
];

/** 判断 host 是否在白名单（空白名单 => 不校验 host） */
function isAllowedHost(host: string) {
  if (ALLOW_HOSTS.length === 0) return true;
  return ALLOW_HOSTS.includes(host);
}

/** 把后端返回的 url 变成安全可用的 url；不安全则返回空字符串 */
export function toSafeHttpUrl(input: string, base = window.location.origin) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw, base);

    if (!ALLOW_PROTOCOLS.has(u.protocol)) return "";
    if (!isAllowedHost(u.hostname)) return "";

    return u.href;
  } catch {
    return "";
  }
}

/** 外链打开时必须带的 rel（防 tabnabbing） */
export function safeRel(rel?: string) {
  const set = new Set(
    String(rel ?? "")
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean),
  );
  set.add("noopener");
  set.add("noreferrer");
  return Array.from(set).join(" ");
}
