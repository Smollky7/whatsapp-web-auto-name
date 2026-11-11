const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const signature = require('../signature-core.js');

const contentScript = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');
const popupScript = fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8');

test('normaliza identificadores vazios, longos e com quebras de linha', () => {
  assert.equal(signature.normalizeLabel('  '), 'Nome');
  assert.equal(signature.normalizeLabel('Ana\nSilva'), 'Ana Silva');
  assert.equal(signature.normalizeLabel('a'.repeat(60)).length, 50);
});

test('prefixa uma vez sem modificar espaços, linhas ou Unicode da mensagem', () => {
  const message = '  Olá 😀\nsegunda linha  ';
  assert.equal(signature.prefixMessage(message, 'Equipe'), `*Equipe:*\n${message}`);
  assert.equal(signature.prefixMessage('*Equipe:*\nOlá', 'Equipe'), null);
  assert.equal(signature.prefixMessage(' \n ', 'Equipe'), null);
});

test('migra preferências antigas de sync para local e remove a cópia sincronizada', () => {
  let migrated;
  let removed;
  let result;
  const runtime = { lastError: null };
  const storage = {
    local: {
      get(_keys, callback) { callback({}); },
      set(values, callback) { migrated = values; callback(); }
    },
    sync: {
      get(_keys, callback) { callback({ userLabel: 'Equipe', extensionActive: false }); },
      remove(keys, callback) { removed = keys; callback(); }
    }
  };

  signature.readSettings(storage, runtime, (settings, error) => { result = { settings, error }; });

  assert.deepEqual(JSON.parse(JSON.stringify(migrated)), { userLabel: 'Equipe', extensionActive: false });
  assert.deepEqual(JSON.parse(JSON.stringify(removed)), ['userLabel', 'extensionActive']);
  assert.deepEqual(JSON.parse(JSON.stringify(result.settings)), { userLabel: 'Equipe', extensionActive: false });
  assert.equal(result.error, null);
});

class FakeElement {
  constructor({ composer = false, button = false, attributes = {}, dialog = null } = {}) {
    this.isComposer = composer;
    this.isButton = button;
    this.attributes = attributes;
    this.dialog = dialog;
  }

  closest(selector) {
    if (selector === '[role="dialog"]') return this.dialog;
    if (this.isComposer && selector !== 'button, [role="button"]') return this;
    if (this.isButton && selector === 'button, [role="button"]') return this;
    return null;
  }

  contains(element) {
    return this === element;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
}

class FakeInput extends FakeElement {
  constructor(text) {
    super({ composer: true });
    this.innerText = text;
    this.textContent = text;
    this.focused = false;
  }

  focus() {
    this.focused = true;
  }
}

class FakeDialog {
  constructor(composer) {
    this.composer = composer;
  }

  querySelector() {
    return this.composer;
  }
}

function createContentHarness({ label = 'Equipe', active = true, delayedSettings = false, composer = true } = {}) {
  const input = composer ? new FakeInput('') : null;
  let settingsCallback;
  let changedListener;
  let insertCount = 0;
  let preventDefaultCount = 0;
  const range = {
    selectNodeContents(element) { this.currentEditor = element; },
    collapse() {},
    cloneRange() { return { cloneRange: this.cloneRange }; }
  };
  const selection = {
    rangeCount: 0,
    getRangeAt() { return range; },
    removeAllRanges() { this.rangeCount = 0; },
    addRange() { this.rangeCount += 1; }
  };
  const documentListeners = {};
  const document = {
    addEventListener(type, listener) { documentListeners[type] = listener; },
    querySelector() { return input; },
    createRange() { return range; },
    execCommand(command, _showUI, text) {
      assert.equal(command, 'insertText');
      insertCount += 1;
      range.currentEditor.innerText = text + range.currentEditor.innerText;
      range.currentEditor.textContent = range.currentEditor.innerText;
      return true;
    }
  };
  const chrome = {
    runtime: { lastError: null },
    storage: {
      local: {
        get(_keys, callback) {
          settingsCallback = callback;
          if (!delayedSettings) callback({});
        },
        set(_values, callback) { callback(); }
      },
      sync: {
        get(_keys, callback) { callback({ userLabel: label, extensionActive: active }); },
        remove(_keys, callback) { callback(); }
      },
      onChanged: { addListener(listener) { changedListener = listener; } }
    }
  };
  const context = {
    AutoSignature: signature,
    Element: FakeElement,
    chrome,
    document,
    window: { getSelection: () => selection }
  };

  vm.runInNewContext(contentScript, context);

  function dispatch(type, event) {
    documentListeners[type]({
      target: input,
      key: 'Enter',
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isComposing: false,
      keyCode: 13,
      preventDefault() { preventDefaultCount += 1; },
      ...event
    });
  }

  return {
    input,
    dispatch,
    get insertCount() { return insertCount; },
    get preventDefaultCount() { return preventDefaultCount; },
    get settingsCallback() { return settingsCallback; },
    get changedListener() { return changedListener; },
    setComposer(value) { document.querySelector = () => value; }
  };
}

test('Enter prefixa o rascunho uma vez e não cancela o envio nativo', () => {
  const harness = createContentHarness();
  harness.input.innerText = 'Olá 😀\nTudo bem?';
  harness.input.textContent = harness.input.innerText;

  harness.dispatch('keydown');
  harness.dispatch('keydown');

  assert.equal(harness.input.innerText, '*Equipe:*\nOlá 😀\nTudo bem?');
  assert.equal(harness.insertCount, 1);
  assert.equal(harness.preventDefaultCount, 0);
});

test('Shift+Enter e composição de texto não prefixam', () => {
  const harness = createContentHarness();
  harness.input.innerText = 'rascunho';
  harness.input.textContent = 'rascunho';

  harness.dispatch('keydown', { shiftKey: true });
  harness.dispatch('keydown', { isComposing: true });
  harness.dispatch('keydown', { keyCode: 229 });

  assert.equal(harness.input.innerText, 'rascunho');
  assert.equal(harness.insertCount, 0);
});

test('clique em Enviar prefixa texto sem cancelar o clique', () => {
  const harness = createContentHarness();
  const button = new FakeElement({ button: true, attributes: { 'aria-label': 'Enviar' } });
  harness.input.innerText = 'Mensagem';
  harness.input.textContent = 'Mensagem';

  harness.dispatch('click', { target: button });

  assert.equal(harness.input.innerText, '*Equipe:*\nMensagem');
  assert.equal(harness.preventDefaultCount, 0);
});

test('clique de legenda usa o editor do diálogo, não o rascunho principal', () => {
  const harness = createContentHarness();
  const caption = new FakeInput('Legenda');
  const dialog = new FakeDialog(caption);
  const button = new FakeElement({
    button: true,
    attributes: { 'aria-label': 'Enviar' },
    dialog
  });
  harness.input.innerText = 'Rascunho principal';
  harness.input.textContent = harness.input.innerText;

  harness.dispatch('click', { target: button });

  assert.equal(caption.innerText, '*Equipe:*\nLegenda');
  assert.equal(harness.input.innerText, 'Rascunho principal');
});

test('não altera áudio sem editor de texto e aguarda configuração assíncrona', () => {
  const audio = createContentHarness({ composer: false });
  const sendButton = new FakeElement({ button: true, attributes: { 'aria-label': 'Enviar' } });
  audio.dispatch('click', { target: sendButton });
  assert.equal(audio.insertCount, 0);

  const loading = createContentHarness({ delayedSettings: true });
  loading.input.innerText = 'Mensagem';
  loading.input.textContent = 'Mensagem';
  loading.dispatch('keydown');
  assert.equal(loading.input.innerText, 'Mensagem');

  loading.settingsCallback({});
  loading.dispatch('keydown');
  assert.equal(loading.input.innerText, '*Equipe:*\nMensagem');
});

class FakeUiElement {
  constructor() {
    this.value = '';
    this.checked = false;
    this.textContent = '';
    this.disabled = false;
    this.listeners = {};
    this.classes = new Set();
    this.offsetWidth = 100;
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
  }

  addEventListener(type, listener) { this.listeners[type] = listener; }

  dispatch(type, event = {}) {
    this.listeners[type]?.({ preventDefault() {}, ...event });
  }
}

test('popup carrega e salva preferências com prévia de texto segura', () => {
  const ids = ['prefixInput', 'enabledToggle', 'settingsForm', 'saveBtn', 'saveLabel', 'statusMessage', 'previewLabel', 'characterCount', 'stage', 'nameCollapse', 'replayBtn', 'previewTime'];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeUiElement()]));
  const stored = { userLabel: '<b>Equipe</b>', extensionActive: true };
  let saved;
  const chrome = {
    runtime: { lastError: null },
    storage: { local: {
      get(_keys, callback) { callback({}); },
      set(value, callback) { saved = value; callback(); }
    }, sync: {
      get(_keys, callback) { callback({ ...stored }); },
      remove(_keys, callback) { callback(); }
    } }
  };
  const context = {
    AutoSignature: signature,
    chrome,
    window: { matchMedia: () => ({ matches: true }) },
    setTimeout: () => 1,
    clearTimeout() {},
    document: { getElementById: (id) => elements[id] }
  };

  vm.runInNewContext(popupScript, context);
  assert.equal(elements.previewLabel.textContent, '<b>Equipe</b>');
  assert.equal(elements.prefixInput.value, '<b>Equipe</b>');

  elements.prefixInput.value = 'Novo nome';
  elements.prefixInput.dispatch('input');
  assert.equal(elements.previewLabel.textContent, 'Novo nome');
  elements.enabledToggle.checked = false;
  elements.enabledToggle.dispatch('change');
  assert.equal(elements.nameCollapse.classes.has('off'), true);
  elements.replayBtn.dispatch('click');
  assert.equal(elements.stage.classes.has('play'), true);
  elements.settingsForm.dispatch('submit');

  assert.deepEqual(JSON.parse(JSON.stringify(saved)), { userLabel: 'Novo nome', extensionActive: false });
  assert.equal(elements.statusMessage.textContent, 'Configuração salva neste navegador.');
});

test('popup anuncia erro quando a gravação local falha', () => {
  const ids = ['prefixInput', 'enabledToggle', 'settingsForm', 'saveBtn', 'saveLabel', 'statusMessage', 'previewLabel', 'characterCount', 'stage', 'nameCollapse', 'replayBtn', 'previewTime'];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeUiElement()]));
  const runtime = { lastError: null };
  const chrome = {
    runtime,
    storage: { local: {
      get(_keys, callback) { callback({ userLabel: 'Equipe', extensionActive: true }); },
      set(_value, callback) {
        runtime.lastError = { message: 'storage unavailable' };
        callback();
        runtime.lastError = null;
      }
    } }
  };

  vm.runInNewContext(popupScript, {
    AutoSignature: signature,
    chrome,
    window: { matchMedia: () => ({ matches: true }) },
    setTimeout: () => 1,
    clearTimeout() {},
    document: { getElementById: (id) => elements[id] }
  });
  elements.settingsForm.dispatch('submit');

  assert.equal(elements.statusMessage.textContent, 'Não foi possível salvar. Tente novamente.');
  assert.equal(elements.statusMessage.classes.has('error'), true);
});