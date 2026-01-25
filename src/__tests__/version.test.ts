import { APP_VERSION } from '@/lib/version';

describe('Version', () => {
  it('exports a version string', () => {
    expect(typeof APP_VERSION).toBe('string');
  });

  it('follows semver format', () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    expect(APP_VERSION).toMatch(semverRegex);
  });
});
