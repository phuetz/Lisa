/**
 * Lisa Chrome Extension - Content Script
 * Injected into web pages for DOM interaction
 */

// ============================================================================
// State
// ============================================================================

let lisaOverlay = null;
let isListening = false;

// ============================================================================
// Communication with Background Script
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Lisa Content] Received:', message.type);

  switch (message.type) {
    case 'getPageInfo':
      sendResponse(getPageInfo());
      break;

    case 'getElementAt':
      sendResponse(getElementAt(message.x, message.y));
      break;

    case 'highlightElement':
      highlightElement(message.selector);
      sendResponse({ success: true });
      break;

    case 'clickElement':
      sendResponse(clickElement(message.selector, message.x, message.y));
      break;

    case 'typeText':
      sendResponse(typeText(message.selector, message.text));
      break;

    case 'scrollTo':
      sendResponse(scrollTo(message.selector, message.x, message.y));
      break;

    case 'getSelectedText':
      sendResponse({ text: window.getSelection().toString() });
      break;

    case 'showOverlay':
      showLisaOverlay(message.text);
      sendResponse({ success: true });
      break;

    case 'hideOverlay':
      hideLisaOverlay();
      sendResponse({ success: true });
      break;

    case 'findElements':
      sendResponse(findElements(message.query));
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep channel open for async response
});

// ============================================================================
// Page Information
// ============================================================================

function getPageInfo() {
  return {
    url: window.location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    text: document.body.innerText.slice(0, 10000),
    links: Array.from(document.querySelectorAll('a[href]')).slice(0, 50).map(a => ({
      text: a.textContent.trim().slice(0, 100),
      href: a.href
    })),
    inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
      type: el.type || el.tagName.toLowerCase(),
      name: el.name,
      id: el.id,
      placeholder: el.placeholder
    })),
    buttons: Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]')).map(el => ({
      text: el.textContent.trim().slice(0, 50),
      id: el.id,
      class: el.className
    })),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    }
  };
}

// ============================================================================
// Element Interaction
// ============================================================================

function getElementAt(x, y) {
  const element = document.elementFromPoint(x, y);
  if (!element) return null;

  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className,
    text: element.textContent.trim().slice(0, 200),
    rect: element.getBoundingClientRect(),
    isClickable: isClickable(element),
    isEditable: isEditable(element)
  };
}

function isClickable(element) {
  const clickableTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (clickableTags.includes(element.tagName)) return true;
  if (element.onclick) return true;
  if (element.getAttribute('role') === 'button') return true;
  if (element.style.cursor === 'pointer') return true;
  return false;
}

function isEditable(element) {
  if (element.isContentEditable) return true;
  if (['INPUT', 'TEXTAREA'].includes(element.tagName)) return true;
  return false;
}

function findElements(query) {
  try {
    const elements = document.querySelectorAll(query);
    return Array.from(elements).slice(0, 100).map((el, index) => ({
      index,
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      text: el.textContent.trim().slice(0, 100),
      rect: el.getBoundingClientRect(),
      selector: generateSelector(el)
    }));
  } catch (error) {
    return { error: error.message };
  }
}

function generateSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c).join('.');
    if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
  }
  return element.tagName.toLowerCase();
}

// ============================================================================
// Actions
// ============================================================================

function clickElement(selector, x, y) {
  try {
    let element;

    if (selector) {
      element = document.querySelector(selector);
    } else if (x !== undefined && y !== undefined) {
      element = document.elementFromPoint(x, y);
    }

    if (!element) {
      return { success: false, error: 'Element not found' };
    }

    // Scroll into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Simulate click
    element.focus();
    element.click();

    return { success: true, element: generateSelector(element) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function typeText(selector, text) {
  try {
    const element = selector ? document.querySelector(selector) : document.activeElement;

    if (!element) {
      return { success: false, error: 'No element to type into' };
    }

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.isContentEditable) {
      element.focus();
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    } else {
      return { success: false, error: 'Element is not editable' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function scrollTo(selector, x, y) {
  try {
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { success: true };
      }
    }

    if (x !== undefined || y !== undefined) {
      window.scrollTo({
        left: x || 0,
        top: y || 0,
        behavior: 'smooth'
      });
      return { success: true };
    }

    return { success: false, error: 'No target specified' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Visual Feedback
// ============================================================================

function highlightElement(selector) {
  // Remove existing highlights
  document.querySelectorAll('.lisa-highlight').forEach(el => el.remove());

  if (!selector) return;

  const element = document.querySelector(selector);
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');
  highlight.className = 'lisa-highlight';
  highlight.style.cssText = `
    position: fixed;
    left: ${rect.left - 2}px;
    top: ${rect.top - 2}px;
    width: ${rect.width + 4}px;
    height: ${rect.height + 4}px;
    border: 2px solid #7C3AED;
    border-radius: 4px;
    background: rgba(124, 58, 237, 0.1);
    pointer-events: none;
    z-index: 999999;
    animation: lisa-pulse 1s ease-in-out infinite;
  `;

  document.body.appendChild(highlight);

  // Remove after 3 seconds
  setTimeout(() => highlight.remove(), 3000);
}

function showLisaOverlay(text) {
  hideLisaOverlay();

  lisaOverlay = document.createElement('div');
  lisaOverlay.className = 'lisa-overlay';
  lisaOverlay.innerHTML = `
    <div class="lisa-overlay-content">
      <div class="lisa-avatar">🤖</div>
      <div class="lisa-message">${text}</div>
    </div>
  `;
  lisaOverlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    max-width: 300px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 16px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: lisa-slide-in 0.3s ease-out;
  `;

  document.body.appendChild(lisaOverlay);
}

function hideLisaOverlay() {
  if (lisaOverlay) {
    lisaOverlay.remove();
    lisaOverlay = null;
  }
}

// ============================================================================
// CSS Injection
// ============================================================================

const style = document.createElement('style');
style.textContent = `
  @keyframes lisa-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes lisa-slide-in {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .lisa-overlay-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .lisa-avatar {
    font-size: 24px;
  }

  .lisa-message {
    font-size: 14px;
    color: #333;
    line-height: 1.4;
  }
`;
document.head.appendChild(style);

// ============================================================================
// Initialization
// ============================================================================

console.log('[Lisa Content] Script loaded on', window.location.href);

// Notify background script that content script is ready
chrome.runtime.sendMessage({ type: 'content.ready', url: window.location.href });
