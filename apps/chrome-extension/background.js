/**
 * Lisa Chrome Extension - Background Service Worker
 * Connects to Lisa Gateway and handles browser control
 */

// Configuration
const LISA_GATEWAY_URL = 'ws://localhost:18789';
const LISA_API_URL = 'http://localhost:5180';

// State
let gatewaySocket = null;
let isConnected = false;
let currentTabId = null;

// ============================================================================
// WebSocket Connection to Lisa Gateway
// ============================================================================

function connectToGateway() {
  if (gatewaySocket?.readyState === WebSocket.OPEN) return;

  try {
    gatewaySocket = new WebSocket(LISA_GATEWAY_URL);

    gatewaySocket.onopen = () => {
      isConnected = true;
      console.log('[Lisa Extension] Connected to Gateway');
      updateBadge('connected');

      // Register as browser node
      sendToGateway({
        type: 'node.register',
        payload: {
          name: 'Chrome Browser',
          type: 'browser',
          platform: 'web',
          capabilities: ['browser', 'screen_capture', 'clipboard', 'notifications']
        }
      });
    };

    gatewaySocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await handleGatewayMessage(message);
      } catch (error) {
        console.error('[Lisa Extension] Failed to parse message:', error);
      }
    };

    gatewaySocket.onclose = () => {
      isConnected = false;
      console.log('[Lisa Extension] Disconnected from Gateway');
      updateBadge('disconnected');

      // Reconnect after 5 seconds
      setTimeout(connectToGateway, 5000);
    };

    gatewaySocket.onerror = (error) => {
      console.error('[Lisa Extension] WebSocket error:', error);
      updateBadge('error');
    };

  } catch (error) {
    console.error('[Lisa Extension] Failed to connect:', error);
    setTimeout(connectToGateway, 5000);
  }
}

function sendToGateway(message) {
  if (gatewaySocket?.readyState === WebSocket.OPEN) {
    gatewaySocket.send(JSON.stringify({
      ...message,
      id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    }));
  }
}

// ============================================================================
// Handle Gateway Messages (Commands from Lisa)
// ============================================================================

async function handleGatewayMessage(message) {
  console.log('[Lisa Extension] Received:', message.type);

  switch (message.type) {
    case 'browser.navigate':
      await handleNavigate(message.payload);
      break;

    case 'browser.click':
      await handleClick(message.payload);
      break;

    case 'browser.type':
      await handleType(message.payload);
      break;

    case 'browser.screenshot':
      await handleScreenshot(message.payload);
      break;

    case 'browser.evaluate':
      await handleEvaluate(message.payload);
      break;

    case 'browser.scroll':
      await handleScroll(message.payload);
      break;

    case 'browser.getContent':
      await handleGetContent(message.payload);
      break;

    case 'clipboard.read':
      await handleClipboardRead();
      break;

    case 'clipboard.write':
      await handleClipboardWrite(message.payload);
      break;

    case 'notification.show':
      await handleNotification(message.payload);
      break;

    default:
      console.log('[Lisa Extension] Unknown message type:', message.type);
  }
}

// ============================================================================
// Browser Control Actions
// ============================================================================

async function handleNavigate({ url, tabId }) {
  try {
    const targetTabId = tabId || currentTabId;

    if (targetTabId) {
      await chrome.tabs.update(targetTabId, { url });
    } else {
      const tab = await chrome.tabs.create({ url });
      currentTabId = tab.id;
    }

    sendToGateway({
      type: 'browser.navigate.result',
      payload: { success: true, url }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.navigate.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleClick({ selector, x, y }) {
  try {
    const tabId = currentTabId || (await getActiveTabId());

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, posX, posY) => {
        if (sel) {
          const element = document.querySelector(sel);
          if (element) {
            element.click();
            return { success: true, method: 'selector' };
          }
        }

        if (posX !== undefined && posY !== undefined) {
          const element = document.elementFromPoint(posX, posY);
          if (element) {
            element.click();
            return { success: true, method: 'coordinates' };
          }
        }

        return { success: false, error: 'Element not found' };
      },
      args: [selector, x, y]
    });

    sendToGateway({
      type: 'browser.click.result',
      payload: { success: true, selector, x, y }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.click.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleType({ selector, text, delay = 0 }) {
  try {
    const tabId = currentTabId || (await getActiveTabId());

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, inputText, typeDelay) => {
        const element = sel ? document.querySelector(sel) : document.activeElement;

        if (!element) {
          return { success: false, error: 'No element focused' };
        }

        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.value = inputText;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (element.isContentEditable) {
          element.textContent = inputText;
          element.dispatchEvent(new InputEvent('input', { bubbles: true, data: inputText }));
        }

        return { success: true };
      },
      args: [selector, text, delay]
    });

    sendToGateway({
      type: 'browser.type.result',
      payload: { success: true, text: text.slice(0, 50) }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.type.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleScreenshot({ fullPage = false }) {
  try {
    const tabId = currentTabId || (await getActiveTabId());

    // Capture visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90
    });

    // Get page info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    sendToGateway({
      type: 'browser.screenshot.result',
      payload: {
        success: true,
        dataUrl,
        url: tab.url,
        title: tab.title,
        width: tab.width,
        height: tab.height
      }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.screenshot.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleEvaluate({ script }) {
  try {
    const tabId = currentTabId || (await getActiveTabId());

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (code) => {
        try {
          return { success: true, result: eval(code) };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },
      args: [script]
    });

    sendToGateway({
      type: 'browser.evaluate.result',
      payload: results[0]?.result || { success: false, error: 'No result' }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.evaluate.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleScroll({ x = 0, y = 0, selector }) {
  try {
    const tabId = currentTabId || (await getActiveTabId());

    await chrome.scripting.executeScript({
      target: { tabId },
      func: (scrollX, scrollY, sel) => {
        if (sel) {
          const element = document.querySelector(sel);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            return { success: true };
          }
        }

        window.scrollBy({ left: scrollX, top: scrollY, behavior: 'smooth' });
        return { success: true };
      },
      args: [x, y, selector]
    });

    sendToGateway({
      type: 'browser.scroll.result',
      payload: { success: true }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.scroll.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleGetContent({ selector, type = 'text' }) {
  try {
    const tabId = currentTabId || (await getActiveTabId());

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (sel, contentType) => {
        if (sel) {
          const element = document.querySelector(sel);
          if (!element) return { success: false, error: 'Element not found' };

          return {
            success: true,
            content: contentType === 'html' ? element.innerHTML : element.textContent,
            tagName: element.tagName
          };
        }

        // Get full page content
        return {
          success: true,
          content: contentType === 'html' ? document.body.innerHTML : document.body.textContent,
          title: document.title,
          url: window.location.href
        };
      },
      args: [selector, type]
    });

    sendToGateway({
      type: 'browser.getContent.result',
      payload: results[0]?.result || { success: false }
    });
  } catch (error) {
    sendToGateway({
      type: 'browser.getContent.result',
      payload: { success: false, error: error.message }
    });
  }
}

// ============================================================================
// Clipboard & Notifications
// ============================================================================

async function handleClipboardRead() {
  try {
    const text = await navigator.clipboard.readText();
    sendToGateway({
      type: 'clipboard.read.result',
      payload: { success: true, text }
    });
  } catch (error) {
    sendToGateway({
      type: 'clipboard.read.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleClipboardWrite({ text }) {
  try {
    await navigator.clipboard.writeText(text);
    sendToGateway({
      type: 'clipboard.write.result',
      payload: { success: true }
    });
  } catch (error) {
    sendToGateway({
      type: 'clipboard.write.result',
      payload: { success: false, error: error.message }
    });
  }
}

async function handleNotification({ title, message, iconUrl }) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: iconUrl || 'icons/icon48.png',
      title: title || 'Lisa',
      message: message
    });

    sendToGateway({
      type: 'notification.show.result',
      payload: { success: true }
    });
  } catch (error) {
    sendToGateway({
      type: 'notification.show.result',
      payload: { success: false, error: error.message }
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

function updateBadge(status) {
  const colors = {
    connected: '#4CAF50',
    disconnected: '#9E9E9E',
    error: '#F44336'
  };

  chrome.action.setBadgeBackgroundColor({ color: colors[status] || '#9E9E9E' });
  chrome.action.setBadgeText({ text: status === 'connected' ? '' : '!' });
}

// ============================================================================
// Context Menu
// ============================================================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lisa-analyze',
    title: 'Analyser avec Lisa',
    contexts: ['page', 'selection', 'image', 'link']
  });

  chrome.contextMenus.create({
    id: 'lisa-screenshot',
    title: 'Envoyer screenshot à Lisa',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'lisa-analyze':
      // Send selected content to Lisa
      sendToGateway({
        type: 'context.analyze',
        payload: {
          selectionText: info.selectionText,
          pageUrl: info.pageUrl,
          linkUrl: info.linkUrl,
          srcUrl: info.srcUrl
        }
      });
      break;

    case 'lisa-screenshot':
      await handleScreenshot({});
      break;
  }
});

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'capture-screen':
      await handleScreenshot({});
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Lisa',
        message: 'Screenshot envoyé à Lisa'
      });
      break;
  }
});

// ============================================================================
// Tab Tracking
// ============================================================================

chrome.tabs.onActivated.addListener((activeInfo) => {
  currentTabId = activeInfo.tabId;
});

// ============================================================================
// Initialize
// ============================================================================

// Connect on startup
connectToGateway();

// Keep service worker alive
setInterval(() => {
  if (!isConnected) {
    connectToGateway();
  }
}, 30000);

console.log('[Lisa Extension] Background service worker started');
