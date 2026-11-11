(() => {
  const { DEFAULT_LABEL, prefixMessage, normalizeLabel } = globalThis.AutoSignature;
  const FOOTER_COMPOSER = 'footer [contenteditable="true"]';
  const LABELED_COMPOSER = [
    '[contenteditable="true"][aria-label="Digite uma mensagem"]',
    '[contenteditable="true"][aria-label="Type a message"]',
    '[contenteditable="true"][aria-label="Escribe un mensaje"]',
    '[contenteditable="true"][aria-label="Écrivez un message"]',
    '[contenteditable="true"][aria-placeholder="Adicione uma legenda"]',
    '[contenteditable="true"][aria-placeholder="Add a caption"]'
  ].join(', ');
  const SEND_LABEL = /\b(enviar|send|envoyer|senden|invia|mandar)\b/i;

  let settings = { userLabel: DEFAULT_LABEL, extensionActive: true };
  let settingsReady = false;

  function readSettings() {
    globalThis.AutoSignature.readSettings(chrome.storage, chrome.runtime, (stored, error) => {
      if (error) {
        console.error('[Auto Name] Não foi possível carregar as preferências.', error.message);
        return;
      }
      settings = {
        userLabel: normalizeLabel(stored.userLabel),
        extensionActive: stored.extensionActive !== false
      };
      settingsReady = true;
    });
  }

  function reportError(error) {
    console.error('[Auto Name] Erro ao preparar a assinatura; o envio nativo continuará.', error);
  }

  function findComposer(target) {
    if (target instanceof Element) {
      const localComposer = target.closest(FOOTER_COMPOSER) || target.closest(LABELED_COMPOSER);
      if (localComposer) return localComposer;

      const dialog = target.closest('[role="dialog"]');
      if (dialog) {
        return dialog.querySelector(LABELED_COMPOSER) || dialog.querySelector('[contenteditable="true"]');
      }
    }
    return document.querySelector(FOOTER_COMPOSER) || document.querySelector(LABELED_COMPOSER);
  }

  function addPrefix(input) {
    if (!settingsReady) {
      console.warn('[Auto Name] Preferências ainda indisponíveis; a mensagem não foi alterada.');
      return null;
    }
    if (!settings.extensionActive) return null;

    const text = input.innerText || input.textContent || '';
    const updatedText = prefixMessage(text, settings.userLabel);
    if (updatedText === null) return null;

    const selection = window.getSelection();
    const previousRanges = selection
      ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
      : [];
    if (!selection) return false;

    input.focus();
    const start = document.createRange();
    const firstChild = input.firstChild || input;
    start.setStart(firstChild, 0);
    start.collapse(true);
    selection.removeAllRanges();
    selection.addRange(start);

    const prefix = updatedText.slice(0, updatedText.length - text.length);
    document.execCommand('insertText', false, prefix);
    const result = input.innerText || input.textContent || '';
    if (!result.startsWith(prefix)) {
      selection.removeAllRanges();
      previousRanges.forEach((range) => selection.addRange(range));
      console.warn('[Auto Name] O editor não confirmou a inserção; o rascunho foi mantido.');
      return false;
    }
    return true;
  }

  function onKeydown(event) {
    try {
      if (
        event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey ||
        event.isComposing || event.keyCode === 229
      ) return;

      const input = findComposer(event.target);
      if (input && (input === event.target || input.contains(event.target))) addPrefix(input);
    } catch (error) {
      reportError(error);
    }
  }

  function onClick(event) {
    try {
      const control = event.target instanceof Element
        ? event.target.closest('button, [role="button"]')
        : null;
      if (!control) return;

      const label = `${control.getAttribute('aria-label') || ''} ${control.getAttribute('title') || ''}`;
      if (!SEND_LABEL.test(label)) return;

      const input = findComposer(control);
      if (input) addPrefix(input);
    } catch (error) {
      reportError(error);
    }
  }

  readSettings();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.userLabel) settings.userLabel = normalizeLabel(changes.userLabel.newValue);
    if (changes.extensionActive) settings.extensionActive = changes.extensionActive.newValue !== false;
  });

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('click', onClick, true);
})();