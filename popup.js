const { normalizeLabel, MAX_LABEL_LENGTH } = globalThis.AutoSignature;
const nameField = document.getElementById('prefixInput');
const activeToggle = document.getElementById('enabledToggle');
const settingsForm = document.getElementById('settingsForm');
const saveButton = document.getElementById('saveBtn');
const saveLabel = document.getElementById('saveLabel');
const statusMessage = document.getElementById('statusMessage');
const previewLabel = document.getElementById('previewLabel');
const characterCount = document.getElementById('characterCount');
const stage = document.getElementById('stage');
const nameCollapse = document.getElementById('nameCollapse');
const replayButton = document.getElementById('replayBtn');
const previewTime = document.getElementById('previewTime');
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let settingsLoaded = false;
let introTimer = null;
let typeTimer = null;

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

function refreshPreview() {
  characterCount.textContent = `${nameField.value.length}/${MAX_LABEL_LENGTH}`;
  previewLabel.textContent = normalizeLabel(nameField.value);
  nameCollapse.classList.toggle('off', !activeToggle.checked);
}

function markChanged() {
  if (settingsLoaded) showStatus('Alterações não salvas');
  stopTimers();
  stage.classList.remove('play');
  refreshPreview();
  bumpName();
}

function currentName() {
  return normalizeLabel(nameField.value);
}

function stopTimers() {
  clearTimeout(introTimer);
  clearTimeout(typeTimer);
}

function bumpName() {
  if (reduceMotion) return;
  previewLabel.classList.remove('bump');
  void previewLabel.offsetWidth;
  previewLabel.classList.add('bump');
}

function replayAnimation() {
  stopTimers();
  stage.classList.remove('play');
  void stage.offsetWidth;
  stage.classList.add('play');

  if (reduceMotion) {
    previewLabel.textContent = currentName();
    return;
  }

  previewLabel.textContent = '';
  introTimer = setTimeout(() => revealName(currentName()), 1250);
}

function revealName(name) {
  const characters = Array.from(name);
  let index = 0;

  function revealNext() {
    index += 1;
    previewLabel.textContent = characters.slice(0, index).join('');
    if (index < characters.length) typeTimer = setTimeout(revealNext, 42);
  }

  if (!characters.length) return;
  revealNext();
}

globalThis.AutoSignature.readSettings(chrome.storage, chrome.runtime, (stored, error) => {
  if (error) {
    showStatus('Não foi possível carregar as configurações.', true);
    return;
  }

  nameField.value = normalizeLabel(stored.userLabel);
  activeToggle.checked = stored.extensionActive !== false;
  settingsLoaded = true;
  previewTime.textContent = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  refreshPreview();
  replayAnimation();
});

nameField.addEventListener('input', markChanged);
activeToggle.addEventListener('change', markChanged);
replayButton.addEventListener('click', replayAnimation);

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!settingsLoaded) {
    showStatus('As configurações ainda estão carregando.', true);
    return;
  }

  saveButton.disabled = true;
  showStatus('Salvando...');
  saveLabel.textContent = 'Salvando...';
  chrome.storage.local.set({
    userLabel: normalizeLabel(nameField.value),
    extensionActive: activeToggle.checked
  }, () => {
    saveButton.disabled = false;
    if (chrome.runtime.lastError) {
      saveLabel.textContent = 'Salvar alterações';
      showStatus('Não foi possível salvar. Tente novamente.', true);
      return;
    }

    nameField.value = normalizeLabel(nameField.value);
    saveLabel.textContent = 'Salvo';
    showStatus('Configuração salva neste navegador.');
    refreshPreview();
    setTimeout(() => {
      saveLabel.textContent = 'Salvar alterações';
    }, 1800);
  });
});

refreshPreview();
