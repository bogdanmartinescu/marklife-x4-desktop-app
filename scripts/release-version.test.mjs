import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertReleaseVersion,
  compareSemver,
  parseSemver,
  tagToVersion,
} from './release-version.mjs';

test('parseSemver accepts dotted triples', () => {
  assert.deepEqual(parseSemver('0.2.0'), { major: 0, minor: 2, patch: 0 });
});

test('parseSemver rejects a v-prefix and incomplete versions', () => {
  assert.throws(() => parseSemver('v0.2.0'), /semver/i);
  assert.throws(() => parseSemver('1.0'), /semver/i);
});

test('compareSemver orders patch, minor, then major', () => {
  assert.equal(compareSemver('0.1.0', '0.1.1'), -1);
  assert.equal(compareSemver('0.2.0', '0.1.9'), 1);
  assert.equal(compareSemver('1.0.0', '0.9.9'), 1);
  assert.equal(compareSemver('0.2.0', '0.2.0'), 0);
});

test('tagToVersion strips a single leading v', () => {
  assert.equal(tagToVersion('v0.2.0'), '0.2.0');
  assert.equal(tagToVersion('0.2.0'), '0.2.0');
});

test('assertReleaseVersion requires every package and Cargo.toml to match', () => {
  assert.throws(
    () =>
      assertReleaseVersion({
        packageVersion: '0.2.0',
        cargoVersion: '0.1.0',
        workspaceVersions: ['0.2.0', '0.2.0'],
        previousTags: ['v0.1.0'],
      }),
    /Cargo.toml/,
  );
  assert.throws(
    () =>
      assertReleaseVersion({
        packageVersion: '0.2.0',
        cargoVersion: '0.2.0',
        workspaceVersions: ['0.2.0', '0.1.0'],
        previousTags: ['v0.1.0'],
      }),
    /workspace/,
  );
});

test('assertReleaseVersion rejects a tag that does not match the package version', () => {
  assert.throws(
    () =>
      assertReleaseVersion({
        packageVersion: '0.2.0',
        cargoVersion: '0.2.0',
        workspaceVersions: ['0.2.0'],
        currentTag: 'v0.1.1',
        previousTags: ['v0.1.0'],
      }),
    /tag/,
  );
});

test('assertReleaseVersion allows a branch build whose version matches an existing tag', () => {
  assert.doesNotThrow(() =>
    assertReleaseVersion({
      packageVersion: '1.2.1',
      cargoVersion: '1.2.1',
      workspaceVersions: ['1.2.1'],
      previousTags: ['v1.2.0', 'v1.2.1'],
    }),
  );
});

test('assertReleaseVersion rejects a version that was already released', () => {
  assert.throws(
    () =>
      assertReleaseVersion({
        packageVersion: '1.2.0',
        cargoVersion: '1.2.0',
        workspaceVersions: ['1.2.0'],
        currentTag: 'v1.2.0',
        previousTags: ['v1.2.0', 'v1.2.1'],
      }),
    /already released/,
  );
});

test('assertReleaseVersion accepts a bumped version on a matching tag', () => {
  assert.doesNotThrow(() =>
    assertReleaseVersion({
      packageVersion: '0.2.0',
      cargoVersion: '0.2.0',
      workspaceVersions: ['0.2.0', '0.2.0'],
      currentTag: 'v0.2.0',
      previousTags: ['v0.1.0'],
    }),
  );
});
