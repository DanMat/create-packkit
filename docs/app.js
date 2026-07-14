import { generate, OPTIONS, GROUPS, OPTION_HELP, defaultConfig, PRESETS, PRESET_INFO } from './packkit-core.js';

// Options that only matter to the CLI (disk/git) — hide them from the web form.
const HIDDEN = new Set(['gitInit', 'install']);

const state = { ...defaultConfig(), name: 'my-package', description: '', author: '' };
let activeFile = null;

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, kids = []) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) n.append(k);
  return n;
};

// ---- form rendering (driven by the core's own schema) ----------------------
function renderForm() {
  const form = $('#form');
  form.innerHTML = '';
  for (const group of GROUPS) {
    const keys = Object.keys(OPTIONS).filter((k) => OPTIONS[k].group === group.id && !HIDDEN.has(k));
    if (!keys.length) continue;
    const wrap = el('div', { className: 'group' }, el('h3', { textContent: group.label }));
    for (const key of keys) wrap.append(renderField(key));
    form.append(wrap);
  }
}

function renderField(key) {
  const opt = OPTIONS[key];
  const field = el('div', { className: 'field' }, el('label', { textContent: opt.label }));
  if (OPTION_HELP[key]) field.append(el('p', { className: 'field-hint', textContent: OPTION_HELP[key] }));

  if (opt.type === 'text') {
    const input = el('input', { type: 'text', value: state[key] ?? '', placeholder: opt.default || '' });
    input.oninput = () => { state[key] = input.value; update(); };
    field.append(input);
  } else if (opt.type === 'boolean') {
    field.append(chip(opt.label ? 'Enabled' : key, state[key], false, () => { state[key] = !state[key]; update(); renderForm(); }));
  } else {
    const chips = el('div', { className: 'chips' });
    for (const c of opt.choices) {
      const multi = opt.type === 'multiselect';
      const on = multi ? state[key].includes(c.value) : state[key] === c.value;
      chips.append(chip(c.label, on, multi, () => {
        if (multi) {
          const set = new Set(state[key]);
          set.has(c.value) ? set.delete(c.value) : set.add(c.value);
          state[key] = [...set];
        } else {
          state[key] = c.value;
        }
        update(); renderForm();
      }));
    }
    field.append(chips);
  }
  return field;
}

function chip(label, on, multi, onclick) {
  const c = el('span', { className: 'chip' + (multi ? ' multi' : '') + (on ? ' on' : ''), textContent: label });
  c.onclick = onclick;
  return c;
}

// ---- presets ---------------------------------------------------------------
const PRESET_HINT = 'Quick-start from a common setup — hover for details.';
function renderPresets() {
  const bar = $('#presets');
  const desc = $('#presetDesc');
  for (const name of Object.keys(PRESETS)) {
    const info = PRESET_INFO[name] || '';
    const b = el('button', { textContent: name, title: info });
    b.onmouseenter = () => { if (info) desc.textContent = info; };
    b.onfocus = b.onmouseenter;
    b.onclick = () => {
      // Reset to defaults, then apply the preset — but keep the typed metadata.
      const keep = { name: state.name, description: state.description, author: state.author };
      const fresh = { ...defaultConfig(), ...PRESETS[name], ...keep };
      Object.keys(state).forEach((k) => delete state[k]);
      Object.assign(state, fresh);
      if (info) desc.textContent = info;
      update();
      renderForm();
    };
    bar.append(b);
  }
  bar.onmouseleave = () => { desc.textContent = PRESET_HINT; };
}

// ---- live preview ----------------------------------------------------------
let current = { files: {}, config: state };

function update() {
  current = generate(state);
  $('#cmd').textContent = commandFor(current.config);
  $('#fileCount').textContent = `(${current.summary.fileCount})`;
  $('#stack').textContent = current.summary.stack.join(' · ');
  renderTree(current.files);
}

function commandFor(cfg) {
  const d = defaultConfig();
  const parts = ['npx create-packkit', cfg.name || 'my-package'];
  const diff = (k) => JSON.stringify(cfg[k]) !== JSON.stringify(d[k]);
  const flag = (k, f) => { if (diff(k)) parts.push(`--${f} ${cfg[k]}`); };
  flag('language', 'language'); flag('framework', 'framework'); flag('moduleFormat', 'module'); flag('bundler', 'bundler');
  flag('test', 'test'); flag('lint', 'lint'); flag('gitHooks', 'hooks'); flag('release', 'release'); flag('deps', 'deps');
  flag('license', 'license'); flag('packageManager', 'pm'); flag('nodeVersion', 'node');
  if (diff('target')) cfg.target.forEach((t) => parts.push(`--target ${t}`));
  if (diff('workflows')) cfg.workflows.forEach((w) => parts.push(`--workflows ${w}`));
  if (cfg.minify) parts.push('--minify');
  if (cfg.storybook) parts.push('--storybook');
  if (cfg.pkgChecks) parts.push('--pkg-checks');
  if (cfg.knip) parts.push('--knip');
  if (cfg.jsr) parts.push('--jsr');
  if (cfg.sizeLimit) parts.push('--size-limit');
  if (cfg.e2e) parts.push('--e2e');
  if (cfg.env) parts.push('--env');
  if (cfg.canary) parts.push('--canary');
  if (cfg.publishable && cfg.sourcemaps === false) parts.push('--no-sourcemaps');
  if (cfg.coverage === false && (cfg.test === 'vitest' || cfg.test === 'jest')) parts.push('--no-coverage');
  if (cfg.monorepo) parts.push('--monorepo');
  for (const b of ['community', 'agents', 'vscode', 'editorconfig']) {
    if (cfg[b] === false && d[b] === true) parts.push(`--no-${b}`);
  }
  // No config flags → append -y so the recommended default runs without prompts.
  if (parts.length === 2) parts.push('-y');
  return parts.join(' ');
}

function renderTree(files) {
  const tree = {};
  for (const path of Object.keys(files).sort()) {
    let node = tree;
    const segs = path.split('/');
    segs.forEach((seg, i) => {
      const isFile = i === segs.length - 1;
      node[seg] = node[seg] || (isFile ? { __file: path } : {});
      node = node[seg];
    });
  }
  const box = $('#tree');
  box.innerHTML = '';
  const walk = (node, depth) => {
    for (const key of Object.keys(node).sort(sortEntries(node))) {
      if (key === '__file') continue;
      const entry = node[key];
      const isFile = entry.__file;
      const row = el('div', {
        className: 'row ' + (isFile ? 'file' : 'dir') + (activeFile === entry.__file ? ' active' : ''),
        textContent: '  '.repeat(depth) + (isFile ? '' : '📁 ') + key,
      });
      if (isFile) row.onclick = () => showFile(entry.__file);
      box.append(row);
      if (!isFile) walk(entry, depth + 1);
    }
  };
  walk(tree, 0);
  if (activeFile && files[activeFile]) $('#filebody').textContent = files[activeFile];
}

const sortEntries = (node) => (a, b) => {
  if (a === '__file') return -1;
  const ad = !node[a].__file, bd = !node[b].__file;
  if (ad !== bd) return ad ? -1 : 1; // dirs first
  return a.localeCompare(b);
};

function showFile(path) {
  activeFile = path;
  $('#filebody').textContent = current.files[path] || '';
  renderTree(current.files);
}

// ---- actions ---------------------------------------------------------------
$('#download').onclick = async () => {
  const zip = new JSZip();
  const root = current.config.name || 'my-package';
  for (const [path, contents] of Object.entries(current.files)) zip.file(`${root}/${path}`, contents);
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `${root}.zip` });
  document.body.append(a); a.click(); a.remove();
};

function flash(btn, msg) {
  const t = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = t), 1200);
}

$('#copy').onclick = async () => {
  await navigator.clipboard.writeText($('#cmd').textContent);
  flash($('#copy'), 'Copied!');
};

// ---- import an existing package.json ---------------------------------------
$('#import').onclick = () => $('#importFile').click();
$('#importFile').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const pj = JSON.parse(await file.text());
    if (pj.name) state.name = String(pj.name);
    if (pj.description) state.description = String(pj.description);
    if (pj.author) state.author = typeof pj.author === 'string' ? pj.author : (pj.author.name || '');
    if (pj.type === 'module') state.moduleFormat = 'esm';
    else if (pj.type === 'commonjs') state.moduleFormat = 'cjs';
    if (pj.bin && !state.target.includes('cli')) state.target = [...new Set([...state.target, 'cli'])];
    update();
    renderForm();
    flash($('#import'), '✓ Imported');
  } catch {
    flash($('#import'), '✗ Invalid JSON');
  }
  e.target.value = '';
};

// ---- share the config as a URL ---------------------------------------------
// Encode only what differs from the defaults (+ metadata) so links stay short.
function changedConfig() {
  const d = defaultConfig();
  const changed = {};
  for (const k of Object.keys(OPTIONS)) {
    if (HIDDEN.has(k)) continue;
    if (JSON.stringify(state[k]) !== JSON.stringify(d[k])) changed[k] = state[k];
  }
  for (const k of ['name', 'description', 'author']) if (state[k]) changed[k] = state[k];
  return changed;
}

$('#share').onclick = async () => {
  const url = location.origin + location.pathname + '?c=' + encodeURIComponent(JSON.stringify(changedConfig()));
  history.replaceState(null, '', url);
  await navigator.clipboard.writeText(url);
  flash($('#share'), 'Link copied!');
};

function applyFromUrl() {
  const c = new URLSearchParams(location.search).get('c');
  if (!c) return;
  try {
    const changed = JSON.parse(decodeURIComponent(c));
    const d = defaultConfig();
    for (const [k, v] of Object.entries(changed)) {
      if (k in d || ['name', 'description', 'author'].includes(k)) state[k] = v;
    }
  } catch {
    /* ignore a malformed link */
  }
}

// ---- boot ------------------------------------------------------------------
applyFromUrl();
renderPresets();
renderForm();
// preview the README by default
update();
showFile('README.md');
