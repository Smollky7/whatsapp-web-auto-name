/******************************************************
 * EXTENSÃO: Assinatura Automática WhatsApp Web
 * RESPONSABILIDADE:
 * - Interceptar envio de mensagens
 * - Inserir identificador no início
 ******************************************************/

const DEBUG_TAG = '[AutoSignature]';

/**
 * Log centralizado pra facilitar debug
 */
function debugLog(...args) {
  console.log(DEBUG_TAG, ...args);
}

/**
 * Pequeno delay para sincronizar com o DOM
 */
function sleep(ms = 20) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Seletores possíveis para caixa de texto
 * (WhatsApp muda bastante dependendo do contexto)
 */
const MESSAGE_INPUT_SELECTOR = [
  'div[contenteditable="true"][aria-label="Digite uma mensagem"]',
  'div[contenteditable="true"][title="Digite uma mensagem"]',
  'div[contenteditable="true"][aria-label="Escrever mensagem"]',
  'div[contenteditable="true"][aria-placeholder="Adicione uma legenda"]'
].join(', ');

const SEND_BUTTON_SELECTOR = 'button[aria-label="Enviar"]';
const MEDIA_CONFIRM_SELECTOR = 'div[aria-label="Enviar"]';

/**
 * Funções utilitárias relacionadas ao DOM
 */
const domActions = {

  pressEnter(element) {
    debugLog('Simulando Enter');
    element.focus();

    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      })
    );
  },

  pressShiftEnter(element) {
    element.focus();

    element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true
      })
    );
  },

  async moveCaretToBeginning(element) {
    element.focus();
    await sleep();

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    const textNode = element.firstChild || element;

    range.setStart(textNode, 0);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
  },

  getText(element) {
    return element.innerText || '';
  }
};

/**
 * Controla todo o fluxo de envio
 */
const sendController = {

  busy: false,

  async handleSend() {
    if (this.busy) return;
    this.busy = true;

    const input = document.querySelector(MESSAGE_INPUT_SELECTOR);

    // Caso especial: envio de áudio
    if (!input) {
      const audioBtn = document.querySelector(SEND_BUTTON_SELECTOR);
      if (audioBtn) audioBtn.click();
      this.busy = false;
      return;
    }

    try {
      const config = await new Promise(resolve =>
        chrome.storage.sync.get(
          ['userLabel', 'extensionActive'],
          resolve
        )
      );

      const label = config.userLabel || 'Nome';
      const active = config.extensionActive !== false;

      if (!active) {
        this.sendRaw(input);
        return;
      }

      await this.injectLabel(input, label);

    } catch (err) {
      debugLog('Erro inesperado:', err);
      this.sendRaw(input);
    } finally {
      setTimeout(() => this.busy = false, 100);
    }
  },

  async injectLabel(input, label) {
    const currentText = domActions.getText(input).trim();
    const signature = `*${label}:*`;

    // Evita duplicação ou mensagens vazias
    if (!currentText || currentText.startsWith(signature)) {
      this.sendRaw(input);
      return;
    }

    await domActions.moveCaretToBeginning(input);
    await sleep();

    document.execCommand('insertText', false, signature);
    await sleep();

    domActions.pressShiftEnter(input);
    await sleep();

    this.sendRaw(input);
  },

  sendRaw(input) {
    input.removeEventListener('keydown', interceptEnter, true);
    domActions.pressEnter(input);
    input.addEventListener('keydown', interceptEnter, true);
  }
};

/**
 * Intercepta Enter simples
 */
function interceptEnter(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    event.stopPropagation();
    sendController.handleSend();
  }
}

/**
 * Intercepta clique no botão de envio
 */
function interceptClick(event) {
  event.preventDefault();
  event.stopPropagation();
  sendController.handleSend();
}

/**
 * Aplica listeners dinamicamente
 */
function applyListeners(root) {
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  root.querySelectorAll(MESSAGE_INPUT_SELECTOR).forEach(el => {
    if (!el.dataset.autoSignature) {
      el.addEventListener('keydown', interceptEnter, true);
      el.dataset.autoSignature = '1';
    }
  });

  root.querySelectorAll(SEND_BUTTON_SELECTOR).forEach(btn => {
    if (!btn.dataset.autoSignature) {
      btn.addEventListener('click', interceptClick, true);
      btn.dataset.autoSignature = '1';
    }
  });

  root.querySelectorAll(MEDIA_CONFIRM_SELECTOR).forEach(btn => {
    if (!btn.dataset.autoSignature) {
      btn.addEventListener('click', interceptClick, true);
      btn.dataset.autoSignature = '1';
    }
  });
}

/**
 * Observer principal
 */
function initObserver() {
  applyListeners(document.body);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => applyListeners(node));
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Inicialização
initObserver();
