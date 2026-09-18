#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "proxy-shared.js"
source = path.read_text(encoding="utf-8")

old = r'''  function buildPacScript(profiles, rules, fallbackProfile) {
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const lines = ['function FindProxyForURL(url, host) {', '  host = host.toLowerCase();'];
    for (const rule of rules.filter((item) => item.enabled)) {
      const condition = pacCondition(rule.pattern);
      if (!condition || condition === 'false') continue;
      if (rule.targetId === 'DIRECT') {
        lines.push(`  if (${condition}) return "DIRECT";`);
        continue;
      }
      const target = profileMap.get(rule.targetId);
      if (!target) continue;
      const bypass = bypassCondition(target.bypass);
      const directive = proxyDirective(target);
      lines.push(`  if (${condition}) { if (${bypass}) return "DIRECT"; return ${JSON.stringify(directive)}; }`);
    }
    if (fallbackProfile) {
      const fallbackBypass = bypassCondition(fallbackProfile.bypass);
      lines.push(`  if (${fallbackBypass}) return "DIRECT";`);
      lines.push(`  return ${JSON.stringify(proxyDirective(fallbackProfile))};`);
    } else {
      lines.push('  return "DIRECT";');
    }
    lines.push('}');
    return lines.join('\n');
  }'''

new = r'''  function buildPacScript(profiles, rules, fallbackProfile) {
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const lines = ['function FindProxyForURL(url, host) {', '  host = host.toLowerCase();'];

    // Profile bypass lists are global safety exclusions in SMART mode.
    // They must win before any Smart Proxy Rule, regardless of which proxy
    // the matching rule would otherwise select.
    const priorityBypass = bypassCondition(
      profiles.flatMap((profile) => Array.isArray(profile.bypass) ? profile.bypass : []),
    );
    if (priorityBypass !== 'false') {
      lines.push(`  if (${priorityBypass}) return "DIRECT";`);
    }

    for (const rule of rules.filter((item) => item.enabled)) {
      const condition = pacCondition(rule.pattern);
      if (!condition || condition === 'false') continue;
      if (rule.targetId === 'DIRECT') {
        lines.push(`  if (${condition}) return "DIRECT";`);
        continue;
      }
      const target = profileMap.get(rule.targetId);
      if (!target) continue;
      const directive = proxyDirective(target);
      lines.push(`  if (${condition}) return ${JSON.stringify(directive)};`);
    }
    if (fallbackProfile) {
      lines.push(`  return ${JSON.stringify(proxyDirective(fallbackProfile))};`);
    } else {
      lines.push('  return "DIRECT";');
    }
    lines.push('}');
    return lines.join('\n');
  }'''

marker = "Profile bypass lists are global safety exclusions in SMART mode."
if marker in source:
    print("proxy-shared.js already contains SMART bypass priority fix")
elif old not in source:
    raise SystemExit("Expected buildPacScript implementation was not found; refusing to patch unknown source")
else:
    path.write_text(source.replace(old, new, 1), encoding="utf-8")
    print("Applied SMART routing bypass priority fix to proxy-shared.js")
