import { h } from './dom.js';
import { renderCloseButton } from './components/ui-primitives.js';

const debugSecretPatterns = [
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /\bAKIA[A-Z0-9]{16}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g
];

/**
 * @param {'user' | 'assistant'} role
 * @param {string} content
 * @param {string} traceId
 */
function debugCopilotMessage(role, content, traceId) {
  const redacted = debugSecretPatterns.reduce(
    (value, pattern) => value.replace(pattern, '[REDACTED]'),
    content
  );
  console.debug('[dashboard-copilot]', JSON.stringify({ traceId, role, content: redacted }));
}

/**
 * @param {string} message
 * @param {unknown} details
 * @param {string} traceId
 */
function debugCopilotUpdate(message, details = {}, traceId) {
  console.debug('[dashboard-copilot]', JSON.stringify({ traceId, message, details }));
}

/**
 * @param {WebSocket} socket
 * @param {string} event
 * @param {string} traceId
 * @param {Record<string, unknown>} details
 */
function browserTrace(socket, event, traceId, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    source: 'browser',
    event,
    traceId,
    details
  };
  console.debug('[dashboard-trace]', JSON.stringify(entry));
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({ type: 'browser.trace', traceId, event, details }));
  }
}

/**
 * @param {WebSocket} socket
 * @returns {HTMLFormElement}
 */
export function renderCopilotPrompt(socket) {
  const input = /** @type {HTMLInputElement} */ (h('input', {
    id: 'dashboard-copilot-request',
    name: 'request',
    type: 'text',
    required: true,
    maxLength: 10000,
    placeholder: 'Describe the change to this view'
  }));
  const sendButton = /** @type {HTMLButtonElement} */ (h(
    'button',
    { type: 'submit', className: 'dashboard-copilot-send' },
    'Send'
  ));
  const openButton = /** @type {HTMLButtonElement} */ (h(
    'button',
    { type: 'button', className: 'dashboard-copilot-open' },
    'Open Copilot'
  ));
  const toolbarStatus = h('output', {
    id: 'dashboard-copilot-status',
    'aria-live': 'polite'
  });
  const dialog = /** @type {HTMLDialogElement} */ (h('dialog', {
    className: 'dashboard-copilot-dialog',
    'aria-labelledby': 'dashboard-copilot-dialog-title'
  }));
  const conversation = h('div', {
    className: 'dashboard-copilot-conversation',
    role: 'log',
    'aria-live': 'polite'
  });
  const dialogStatus = h('output', {
    className: 'dashboard-copilot-dialog-status',
    'aria-live': 'polite'
  });
  let sessionActive = false;
  let activeViewName = '';
  let assistantResponse = '';
  let activeTraceId = '';
  /** @type {HTMLElement | null} */
  let assistantContent = null;
  const appendAssistantMessage = (content = '') => {
    const message = h(
      'div',
      { className: 'dashboard-copilot-message dashboard-copilot-message-assistant' },
      h('strong', null, 'Copilot'),
      h('div', { className: 'dashboard-copilot-message-content' }, content)
    );
    conversation.append(message);
    assistantContent = message.querySelector('.dashboard-copilot-message-content');
    scrollConversation();
  };
  const scrollConversation = () => {
    conversation.scrollTop = conversation.scrollHeight;
  };
  const openDialog = () => {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    input.focus();
  };

  const stopSession = () => {
    if (!sessionActive) return;
    sessionActive = false;
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'copilot.stop', traceId: activeTraceId }));
      browserTrace(socket, 'copilot.stop.sent', activeTraceId);
    }
  };
  const closeDialog = () => {
    stopSession();
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      input.focus();
    }
  };
  dialog.append(
    h(
      'header',
      { className: 'dashboard-copilot-dialog-header' },
      h('h2', { id: 'dashboard-copilot-dialog-title' }, 'How would you want to modify this view?'),
      renderCloseButton({
        className: 'dashboard-copilot-dialog-close',
        label: 'Close Copilot chat',
        onClick: closeDialog
      })
    ),
    conversation,
    h(
      'footer',
      { className: 'dashboard-copilot-dialog-footer' },
      h('label', { htmlFor: input.id }, 'Message Copilot'),
      h(
        'div',
        { className: 'dashboard-copilot-composer' },
        input,
        sendButton
      ),
      dialogStatus
    )
  );
  openButton.addEventListener('click', openDialog);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener('close', () => {
    stopSession();
    input.focus();
  });
  const form = /** @type {HTMLFormElement} */ (h(
    'form',
    { id: 'dashboard-copilot-prompt', className: 'dashboard-copilot-prompt' },
    h('strong', null, 'Copilot dashboard editor'),
    openButton,
    toolbarStatus,
    dialog
  ));

  sendButton.disabled = socket.readyState !== 1;
  openButton.disabled = socket.readyState !== 1;
  socket.addEventListener('open', () => {
    openButton.disabled = false;
    if (!sessionActive) sendButton.disabled = false;
  });
  socket.addEventListener('close', () => {
    sessionActive = false;
    sendButton.disabled = true;
    openButton.disabled = true;
    toolbarStatus.textContent = 'Copilot connection closed.';
    dialogStatus.textContent = 'Copilot connection closed.';
    if (activeTraceId) browserTrace(socket, 'copilot.socket.closed', activeTraceId);
  });
  socket.addEventListener('message', (event) => {
    const streamEvent = JSON.parse(String(event.data));
    if (!streamEvent?.type) return;
    if (streamEvent.traceId && activeTraceId && streamEvent.traceId !== activeTraceId) return;
    if (streamEvent.type === 'stopped') {
      dialogStatus.textContent = 'Session stopped.';
      sessionActive = false;
      sendButton.disabled = false;
      return;
    }
    if (!sessionActive) return;
    if (streamEvent.type === 'debug' && typeof streamEvent.message === 'string') {
      debugCopilotUpdate(streamEvent.message, streamEvent.details, activeTraceId);
    } else if (streamEvent.type === 'assistant-delta' && typeof streamEvent.content === 'string') {
      if (!assistantContent) appendAssistantMessage();
      assistantResponse += streamEvent.content;
      if (assistantContent) assistantContent.textContent += streamEvent.content;
      scrollConversation();
    } else if (streamEvent.type === 'assistant-message' && typeof streamEvent.content === 'string') {
      if (!assistantContent) appendAssistantMessage(streamEvent.content);
      else assistantContent.textContent = streamEvent.content;
      assistantResponse = streamEvent.content;
      scrollConversation();
      debugCopilotMessage('assistant', assistantResponse, activeTraceId);
      assistantContent = null;
    } else if (streamEvent.type === 'status' && typeof streamEvent.message === 'string') {
      dialogStatus.textContent = streamEvent.message;
    } else if (streamEvent.type === 'reloaded') {
      dialogStatus.textContent = 'Saved and preview updated.';
      toolbarStatus.textContent = 'Updated.';
      browserTrace(socket, 'copilot.preview.confirmed', activeTraceId, { view: activeViewName });
    } else if (streamEvent.type === 'done') {
      dialogStatus.textContent = 'Saved and preview updated.';
      toolbarStatus.textContent = 'Updated.';
      sessionActive = false;
      sendButton.disabled = false;
      input.focus();
      debugCopilotUpdate('Dashboard view update stream completed.', {}, activeTraceId);
      browserTrace(socket, 'copilot.request.completed', activeTraceId, { view: activeViewName });
    } else if (streamEvent.type === 'error' && typeof streamEvent.message === 'string') {
      toolbarStatus.textContent = streamEvent.message;
      dialogStatus.textContent = streamEvent.message;
      sessionActive = false;
      sendButton.disabled = false;
      console.error('Copilot dashboard update failed.', {
        traceId: activeTraceId,
        view: activeViewName,
        error: streamEvent.message
      });
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (socket.readyState !== 1 || sessionActive) return;
    const activeView = document.querySelector('[data-nav-page-id][aria-current=page]');
    const view = activeView?.getAttribute('aria-label')
      || activeView?.getAttribute('data-nav-page-id')
      || location.hash.match(/^#page-([^?]+)/)?.[1]
      || 'overview';
    activeViewName = view;
    const request = input.value;
    activeTraceId = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    debugCopilotMessage('user', request, activeTraceId);
    assistantResponse = '';
    assistantContent = null;
    conversation.append(
      h(
        'div',
        { className: 'dashboard-copilot-message dashboard-copilot-message-user' },
        h('strong', null, 'You'),
        h('div', { className: 'dashboard-copilot-message-content' }, request)
      )
    );
    input.value = '';
    scrollConversation();
    dialogStatus.textContent = 'Copilot is working…';
    toolbarStatus.textContent = 'Working…';
    openDialog();

    sendButton.disabled = true;
    sessionActive = true;
    debugCopilotUpdate('Sending dashboard view update request.', {
      view,
      requestLength: request.length
    }, activeTraceId);
    browserTrace(socket, 'copilot.request.sent', activeTraceId, {
      view,
      requestLength: request.length
    });
    socket.send(JSON.stringify({ type: 'copilot.start', traceId: activeTraceId, view, request }));
  });
  return form;
}
