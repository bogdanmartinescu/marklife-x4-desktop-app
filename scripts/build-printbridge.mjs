import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const crate = join(root, 'native', 'printbridge');
const release = process.argv.includes('--release');
const cargoHome = process.env.CARGO_HOME ?? join(homedir(), '.cargo');
const env = {
  ...process.env,
  PATH: `${join(cargoHome, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
  CARGO_TARGET_DIR: join(crate, 'target'),
};

const args = [
  'build',
  '--manifest-path',
  join(crate, 'Cargo.toml'),
  '--target-dir',
  join(crate, 'target'),
];
if (release) {
  args.push('--release');
}

const child = spawn('cargo', args, {
  cwd: crate,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('error', (error) => {
  process.stderr.write(`Failed to start cargo: ${error.message}\n`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
