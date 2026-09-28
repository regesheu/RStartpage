'use strict';

// Firefox routes requests directly; never evaluate the Chromium PAC script.
const RFirefoxProxy = (() => {
  let routing = null;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const markReady = () => resolveReady();

  function glob(value, pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`).test(value);
  }

  function ipv4(value) {
    const parts = value.split('.');
    if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
    return parts.reduce((sum, part) => ((sum << 8) | Number(part)) >>> 0, 0);
  }

  async function matches(pattern, url, host, resolveHost) {
    const raw = String(pattern || '').trim();
    if (!raw) return false;
    if (raw === '<local>') return !host.includes('.');
    const cidr = raw.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d|[12]\d|3[0-2])$/);
    if (cidr) {
      const network = ipv4(cidr[1]);
      if (network === null) return false;
      const mask = Number(cidr[2]) === 0 ? 0 : (0xffffffff << (32 - Number(cidr[2]))) >>> 0;
      const addresses = ipv4(host) === null ? await resolveHost() : [host];
      return addresses.some(address => ipv4(address) !== null && ((ipv4(address) & mask) >>> 0) === ((network & mask) >>> 0));
    }
    if (raw.includes('://') || raw.includes('/')) return glob(url, raw);
    if (raw.startsWith('*.')) return host === raw.slice(2) || glob(host, raw);
    if (raw.startsWith('.')) return host === raw.slice(1) || host.endsWith(raw);
    if (raw.includes('*') || raw.includes('?')) return glob(host, raw);
    return host === raw.toLowerCase();
  }

  async function route(details) {
    await ready;
    const config = routing;
    // An empty chain preserves Firefox's own proxy configuration when disabled.
    if (!config) return [];
    const host = new URL(details.url).hostname.toLowerCase();
    let dnsResult;
    const resolveHost = () => dnsResult ||= browser.dns.resolve(host).then(result => result.addresses, () => []);
    for (const pattern of config.bypass) {
      if (await matches(pattern, details.url, host, resolveHost)) return null;
    }
    let profile = config.fallback;
    for (const rule of config.rules) {
      if (!rule.enabled) continue;
      const target = config.profiles.find(item => item.id === rule.targetId);
      if (rule.targetId !== 'DIRECT' && !target) continue;
      if (await matches(rule.pattern, details.url, host, resolveHost)) {
        if (rule.targetId === 'DIRECT') return null;
        profile = target;
        break;
      }
    }
    if (!profile) return null;
    const info = { type: profile.scheme === 'socks5' ? 'socks' : profile.scheme, host: profile.host, port: Number(profile.port) };
    if (info.type === 'socks' || info.type === 'socks4') info.proxyDNS = true;
    if (info.type === 'socks' && profile.username) {
      info.username = profile.username;
      info.password = await ProxyStore.getPassword(profile);
    }
    // Stop Firefox from falling back to its system proxy/direct route on failure.
    return [info, null];
  }

  async function set(fallback, smart = false) {
    if (!await browser.permissions.contains({ origins: ['<all_urls>'] })) {
      const language = await ProxyStore.getLanguage();
      throw new Error(language === 'ru'
        ? 'Разрешите доступ ко всем сайтам в about:addons → RStartpage → Разрешения.'
        : 'Allow access to all websites in about:addons → RStartpage → Permissions.');
    }
    const profiles = smart ? await ProxyStore.getProfiles() : [fallback];
    const rules = smart ? await ProxyStore.getRules() : [];
    routing = { fallback, profiles, rules, bypass: profiles.flatMap(profile => profile.bypass || []) };
    markReady();
  }
  async function clear() { routing = null; markReady(); }
  browser.proxy.onRequest.addListener(route, { urls: ['<all_urls>'] });
  return { set, clear, markReady, matches };
})();
