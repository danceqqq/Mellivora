#!/usr/bin/env node
/**
 * Сборка auto_orange.exe и add_coord.exe через PyInstaller.
 * Требования: pip install pyinstaller, pip install -r py/requirements.txt
 * Результат: exe-файлы в py/
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const pyDir = path.join(root, 'py');
const buildDir = path.join(pyDir, 'build');
const distDir = pyDir;

if (!fs.existsSync(pyDir)) {
  console.error('Папка py не найдена.');
  process.exit(1);
}

const python = process.platform === 'win32' ? 'python' : 'python3';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: pyDir, ...opts });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
  return r;
}

console.log('Сборка auto_orange.exe...');
run(python, [
  '-m', 'PyInstaller',
  '--onefile', '--name', 'auto_orange',
  '--distpath', distDir,
  '--workpath', buildDir,
  '--specpath', buildDir,
  '--clean',
  '--noconfirm',
  'auto_orange_cli.py',
]);

console.log('Сборка add_coord.exe...');
run(python, [
  '-m', 'PyInstaller',
  '--onefile', '--name', 'add_coord',
  '--distpath', distDir,
  '--workpath', buildDir,
  '--specpath', buildDir,
  '--clean',
  '--noconfirm',
  'add_coord_cli.py',
]);

console.log('Готово. auto_orange.exe и add_coord.exe в', pyDir);
