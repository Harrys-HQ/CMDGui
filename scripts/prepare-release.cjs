// Stage local installers and synchronize updater metadata after `npm run dist`.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const pkg = readJson('package.json');
const version = pkg.version;
const tauri = readJson('src-tauri/tauri.conf.json');
const lock = readJson('package-lock.json');
const cargo = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoLock = fs.readFileSync(path.join(root, 'src-tauri/Cargo.lock'), 'utf8');
const notes = fs.readFileSync(path.join(root, 'release_notes.md'), 'utf8');
if (tauri.version !== version || lock.version !== version || lock.packages[''].version !== version
  || !cargo.includes(`version = "${version}"`)
  || !cargoLock.replaceAll('\r\n', '\n').includes(`name = "cmdgui"\nversion = "${version}"`)) {
  throw new Error('Version metadata is out of sync. Update all version fields before staging.');
}
const [heading, ...highlights] = notes.split(/^---\s*$/m)[0].trim().split(/\r?\n/);
if (!heading.endsWith(` v${version}`) || !highlights.join('').trim()) {
  throw new Error(`Add release notes for v${version} before staging.`);
}

const nsis = `CmdGUI_${version}_x64-setup.exe`;
const msi = `CmdGUI_${version}_x64_en-US.msi`;
const assets = [
  ['nsis', nsis], ['nsis', `${nsis}.sig`],
  ['msi', msi], ['msi', `${msi}.sig`],
];
// Check everything before replacing the existing updater manifest.
for (const [kind, name] of assets) {
  const file = path.join(root, 'src-tauri/target/release/bundle', kind, name);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`Missing release artifact: ${name}`);
}
const out = path.join(root, 'release', `v${version}`);
fs.mkdirSync(out, { recursive: true });
for (const [kind, name] of assets) fs.copyFileSync(path.join(root, 'src-tauri/target/release/bundle', kind, name), path.join(out, name));
const url = pkg.repository.url.replace(/\.git$/, '') + `/releases/download/v${version}/`;
const entry = (name) => ({ signature: fs.readFileSync(path.join(out, `${name}.sig`), 'utf8').trim(), url: url + name });
const manifest = {
  version,
  notes: highlights.join('\n').trim(),
  pub_date: new Date().toISOString(),
  platforms: { 'windows-x86_64': entry(nsis), 'windows-x86_64-nsis': entry(nsis), 'windows-x86_64-msi': entry(msi) },
};
const json = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(root, 'latest.json'), json);
fs.writeFileSync(path.join(out, 'latest.json'), json);
const names = [...assets.map(([, name]) => name), 'latest.json'];
const hashes = names.map((name) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name))).digest('hex')}  ${name}`);
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), hashes.join('\n') + '\n');
console.log(`Prepared CmdGUI v${version}: ${out}`);
console.log('Local files only; no release has been published.');
