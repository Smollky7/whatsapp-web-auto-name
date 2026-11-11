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
  const DIAGNOSTIC_MODE_KEY = 'autoNameDiagnosticMode';

  let settings = { userLabel: DEFAULT_LABEL, extensionActive: true };
  let settingsReady = false;
  let diagnosticMode = 'insert';

  function readSettings() {
    globalThis.AutoSignature.readSettings(chrome.storage, chrome.runtime, (stored, error) => {
      if (error) {
        console.error('[Auto Name] Não foi possível carregar as preferências.', {
          errorName: error.name || 'StorageError',
          errorCode: Number.isFinite(error.code) ? error.code : null
        });
        return;
      }
      settings = {
        userLabel: normalizeLabel(stored.userLabel),
        extensionActive: stored.extensionActive !== false
      };
      settingsReady = true;
    });
  }

  function logDiagnostic(stage, trigger, event, input, details = {}) {
    try {
      const state = {
        stage,
        trigger,
        mode: diagnosticMode,
        isTrusted: event?.isTrusted ?? null,
        eventPhase: event?.eventPhase ?? null,
        defaultPrevented: event?.defaultPrevented ?? null,
        composerFound: Boolean(input),
        composerTag: input?.tagName || null,
        isContentEditable: input?.isContentEditable ?? null,
        activeElementIsComposer: input ? document.activeElement === input : null,
        childNodeCount: input?.childNodes?.length ?? null,
        firstChildNodeType: input?.firstChild?.nodeType ?? null,
        firstChildTag: input?.firstElementChild?.tagName || null
      };

      if (input && diagnosticMode === 'insert') {
        const innerText = input.innerText ?? '';
        const textContent = input.textContent ?? '';
        const selection = window.getSelection();
        state.innerTextLength = innerText.length;
        state.textContentLength = textContent.length;
        state.rangeCount = selection?.rangeCount ?? null;
        state.anchorNodeType = selection?.anchorNode?.nodeType ?? null;
        state.anchorOffset = selection?.anchorOffset ?? null;
        state.anchorInsideComposer = selection?.anchorNode
          ? input.contains(selection.anchorNode)
          : null;
        state.focusNodeType = selection?.focusNode?.nodeType ?? null;
        state.focusOffset = selection?.focusOffset ?? null;
      } else if (input) {
        state.textContentLength = input.textContent?.length ?? null;
      }

      Object.assign(state, details);
      console.info('[Auto Name][diagnostic]', state);
    } catch (error) {
      console.warn('[Auto Name][diagnostic] Snapshot indisponível.', error.name || 'Error');
    }
  }

  function reportError(error, trigger, event, input, operation) {
    logDiagnostic('exception', trigger, event, input, {
      operation,
      errorName: error?.name || 'Error',
      errorCode: Number.isFinite(error?.code) ? error.code : null
    });
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

  function addPrefix(input, trigger, event) {
    let operation = 'read-editor';
    try {
      if (!settingsReady) {
        console.warn('[Auto Name] Preferências ainda indisponíveis; a mensagem não foi alterada.');
        return null;
      }
      if (!settings.extensionActive) return null;

      const text = input.innerText || input.textContent || '';
      const updatedText = prefixMessage(text, settings.userLabel);
      if (updatedText === null) return null;

      operation = 'read-selection';
      const selection = window.getSelection();
      const previousRanges = selection
        ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
        : [];
      if (!selection) return false;

      operation = 'focus';
      input.focus();
      logDiagnostic('after-focus', trigger, event, input);

      operation = 'create-range';
      const start = document.createRange();
      const firstChild = input.firstChild || input;
      start.setStart(firstChild, 0);
      start.collapse(true);

      operation = 'set-selection';
      selection.removeAllRanges();
      selection.addRange(start);
      logDiagnostic('after-selection', trigger, event, input);

      const prefix = updatedText.slice(0, updatedText.length - text.length);
      operation = 'exec-command';
      const execCommandResult = document.execCommand('insertText', false, prefix);
      operation = 'verify-result';
      const innerText = input.innerText ?? '';
      const textContent = input.textContent ?? '';
      const result = innerText || textContent;
      const innerTextStartsWithPrefix = innerText.startsWith(prefix);
      const textContentStartsWithPrefix = textContent.startsWith(prefix);
      logDiagnostic('after-insert', trigger, event, input, {
        execCommandResult: typeof execCommandResult === 'boolean' ? execCommandResult : null,
        innerTextStartsWithPrefix,
        textContentStartsWithPrefix,
        textRepresentationsDiffer: innerText !== textContent
      });

      if (!result.startsWith(prefix)) {
        operation = 'restore-selection';
        selection.removeAllRanges();
        previousRanges.forEach((range) => selection.addRange(range));
        console.warn('[Auto Name] O editor não confirmou a inserção; o rascunho foi mantido.');
        return false;
      }
      return true;
    } catch (error) {
      reportError(error, trigger, event, input, operation);
      return null;
    }
  }

  function onKeydown(event) {
    try {
      if (
        event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey ||
        event.isComposing || event.keyCode === 229
      ) return;

      const input = findComposer(event.target);
      const isComposerTarget = input && (input === event.target || input.contains(event.target));
      logDiagnostic('send-attempt', 'keydown', event, isComposerTarget ? input : null, {
        composerTargetMatch: Boolean(isComposerTarget)
      });
      if (!isComposerTarget) return;
      if (diagnosticMode === 'observe') {
        logDiagnostic('observe-only', 'keydown', event, input);
        return;
      }
      addPrefix(input, 'keydown', event);
    } catch (error) {
      reportError(error, 'keydown', event, null, 'find-composer');
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
      logDiagnostic('send-attempt', 'click', event, input);
      if (!input) return;
      if (diagnosticMode === 'observe') {
        logDiagnostic('observe-only', 'click', event, input);
        return;
      }
      addPrefix(input, 'click', event);
    } catch (error) {
      reportError(error, 'click', event, null, 'find-composer');
    }
  }

  readSettings();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.userLabel) settings.userLabel = normalizeLabel(changes.userLabel.newValue);
    if (changes.extensionActive) settings.extensionActive = changes.extensionActive.newValue !== false;
    if (changes[DIAGNOSTIC_MODE_KEY]) {
      diagnosticMode = changes[DIAGNOSTIC_MODE_KEY].newValue === 'observe' ? 'observe' : 'insert';
      logDiagnostic('mode-changed', 'storage', null, null);
    }
  });

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('click', onClick, true);
  chrome.storage.local.get(DIAGNOSTIC_MODE_KEY, (stored) => {
    if (chrome.runtime.lastError) {
      logDiagnostic('mode-read-error', 'storage', null, null, {
        errorName: chrome.runtime.lastError.name || 'StorageError'
      });
      return;
    }
    diagnosticMode = stored[DIAGNOSTIC_MODE_KEY] === 'observe' ? 'observe' : 'insert';
    logDiagnostic('mode-loaded', 'storage', null, null);
  });
})();