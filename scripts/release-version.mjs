import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function parseSemver(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`Expected semver X.Y.Z, got ${value}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }
  return 0;
}

export function tagToVersion(tag) {
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

export function assertReleaseVersion(options) {
  const { packageVersion, cargoVersion, workspaceVersions, currentTag, previousTags } = options;
  parseSemver(packageVersion);
  if (cargoVersion !== packageVersion) {
    throw new Error(`Cargo.toml version ${cargoVersion} does not match ${packageVersion}`);
  }
  for (const version of workspaceVersions) {
    if (version !== packageVersion) {
      throw new Error(`workspace package version ${version} does not match ${packageVersion}`);
    }
  }
  if (currentTag !== undefined) {
    const tagged = tagToVersion(currentTag);
    if (tagged !== packageVersion) {
      throw new Error(`git tag ${currentTag} does not match package version ${packageVersion}`);
    }
  }
  const previousVersions = previousTags
    .map((tag) => {
      try {
        return tagToVersion(tag);
      } catch {
        return undefined;
      }
    })
    .filter((version) => {
      if (version === undefined) {
        return false;
      }
      try {
        parseSemver(version);
        return currentTag === undefined || version !== tagToVersion(currentTag);
      } catch {
        return false;
      }
    });
  for (const previous of previousVersions) {
    if (compareSemver(packageVersion, previous) <= 0) {
      throw new Error(
        `version ${packageVersion} was already released as v${previous}; bump before releasing`,
      );
    }
  }
}

export function readCargoVersion(contents) {
  const match = /^version = "([^"]+)"/m.exec(contents);
  if (!match?.[1]) {
    throw new Error('Cargo.toml is missing version');
  }
  return match[1];
}

export function replaceCargoVersion(contents, version) {
  return contents.replace(/^version = "[^"]+"/m, `version = "${version}"`);
}

function workspacePackageJsonPaths() {
  const paths = [join(root, 'package.json'), join(root, 'apps', 'desktop', 'package.json')];
  for (const name of readdirSync(join(root, 'packages'))) {
    paths.push(join(root, 'packages', name, 'package.json'));
  }
  return paths;
}

export function collectWorkspaceVersions(readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))) {
  return workspacePackageJsonPaths().map((file) => {
    const parsed = readJson(file);
    if (typeof parsed.version !== 'string') {
      throw new Error(`${file} is missing version`);
    }
    return parsed.version;
  });
}

export function listVersionTags(
  runner = () => execSync('git tag -l "v*"', { encoding: 'utf8', cwd: root }),
) {
  return runner()
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
}

export function checkReleaseVersion(env = process.env, tags = listVersionTags()) {
  const rootPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const cargoVersion = readCargoVersion(readFileSync(join(root, 'native', 'printbridge', 'Cargo.toml'), 'utf8'));
  const ref = env.GITHUB_REF ?? '';
  const currentTag = ref.startsWith('refs/tags/') ? ref.slice('refs/tags/'.length) : undefined;
  assertReleaseVersion({
    packageVersion: rootPackage.version,
    cargoVersion,
    workspaceVersions: collectWorkspaceVersions(),
    ...(currentTag !== undefined ? { currentTag } : {}),
    previousTags: tags,
  });
  return rootPackage.version;
}

export function bumpWorkspaceVersion(next) {
  parseSemver(next);
  for (const file of workspacePackageJsonPaths()) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.version = next;
    writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
  }
  const cargoPath = join(root, 'native', 'printbridge', 'Cargo.toml');
  writeFileSync(cargoPath, replaceCargoVersion(readFileSync(cargoPath, 'utf8'), next));
}

function usage() {
  process.stderr.write('Usage: node scripts/release-version.mjs check|bump <x.y.z>\n');
  process.exit(2);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === 'check') {
    const fromEnv = (process.env.RELEASE_PREVIOUS_TAGS ?? '')
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const tags =
      process.env.RELEASE_PREVIOUS_TAGS !== undefined ? fromEnv : listVersionTags();
    const version = checkReleaseVersion(process.env, tags);
    process.stdout.write(`${version}\n`);
  } else if (command === 'bump') {
    const next = process.argv[3];
    if (next === undefined) {
      usage();
    }
    bumpWorkspaceVersion(next);
    process.stdout.write(`${next}\n`);
  } else {
    usage();
  }
}
