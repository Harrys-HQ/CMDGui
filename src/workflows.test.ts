import { describe, expect, it } from 'vitest';
import { resolveRoute, taskProfiles } from './workflows';

describe('task routing', () => {
  it('skips discovery for a known change and uses a lighter coding model', () => {
    expect(resolveRoute('scoped', 'auto').mode).toBe('codex-only');
    expect(taskProfiles.scoped.codexModel).not.toBe(taskProfiles.complex.codexModel);
  });

  it('keeps investigation read-only and avoids an implementation call', () => {
    expect(resolveRoute('analysis', 'auto').mode).toBe('agy-only');
  });

  it('uses a handoff only for discovery and honors manual routing', () => {
    expect(resolveRoute('discovery', 'auto').mode).toBe('pipeline');
    expect(resolveRoute('discovery', 'codex-only').mode).toBe('codex-only');
  });
});
