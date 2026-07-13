import { generate, OPTIONS, GROUPS, defaultConfig, PRESETS } from './packkit-core.js';

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
function renderPresets() {
  const bar = $('#presets');
  for (const name of Object.keys(PRESETS)) {
    const b = el('button', { textContent: name });
    b.onclick = () => { Object.assign(state, PRESETS[name]); update(); renderForm(); };
    bar.append(b);
  }
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
  const flag = (k, f) => { if (JSON.stringify(cfg[k]) !== JSON.stringify(d[k])) parts.push(`--${f} ${Array.isArray(cfg[k]) ? cfg[k].join(',') : cfg[k]}`); };
  flag('language', 'language'); flag('moduleFormat', 'module'); flag('bundler', 'bundler');
  flag('test', 'test'); flag('lint', 'lint'); flag('gitHooks', 'hooks'); flag('release', 'release');
  flag('license', 'license'); flag('packageManager', 'pm');
  if (JSON.stringify(cfg.target) !== JSON.stringify(d.target)) parts.push(`--target ${cfg.target.join(' --target ')}`);
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

$('#copy').onclick = async () => {
  await navigator.clipboard.writeText($('#cmd').textContent);
  const btn = $('#copy'); const t = btn.textContent;
  btn.textContent = 'Copied!'; setTimeout(() => (btn.textContent = t), 1200);
};

// ---- boot ------------------------------------------------------------------
renderPresets();
renderForm();
// preview the README by default
update();
showFile('README.md');
