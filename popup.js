// Elementos principais da interface
const nameField = document.getElementById('prefixInput');
const activeToggle = document.getElementById('enabledToggle');
const saveButton = document.getElementById('saveBtn');
const feedbackBox = document.getElementById('successMsg');
const previewBox = document.getElementById('previewText');

// Carrega configurações salvas
chrome.storage.sync.get(
  ['userLabel', 'extensionActive'],
  (config) => {
    nameField.value = config.userLabel || 'Nome';
    activeToggle.checked = config.extensionActive !== false;
    refreshPreview();
  }
);

// Atualiza prévia em tempo real
nameField.addEventListener('input', refreshPreview);
activeToggle.addEventListener('change', () => {
  chrome.storage.sync.set({
    extensionActive: activeToggle.checked
  });
  refreshPreview();
});

/**
 * Atualiza o balão de pré-visualização
 */
function refreshPreview() {
  const name = nameField.value || 'Nome';

  if (activeToggle.checked) {
    previewBox.innerHTML = `<strong>${name}:</strong><br>Olá, tudo bem?`;
  } else {
    previewBox.textContent = 'Olá, tudo bem?';
  }
}

// Salva o nome configurado
saveButton.addEventListener('click', () => {
  chrome.storage.sync.set(
    { userLabel: nameField.value.trim() || 'Nome' },
    () => {
      feedbackBox.style.display = 'block';
      setTimeout(() => feedbackBox.style.display = 'none', 2000);
    }
  );
});
