/**
 * Lisa Chrome Extension - Popup Script
 */

// Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const readBtn = document.getElementById('readBtn');
const openLisaBtn = document.getElementById('openLisaBtn');

// State
let isConnected = false;

// ============================================================================
// Connection Status
// ============================================================================

async function checkConnection() {
  try {
    const response = await fetch('http://localhost:5180/api/health', {
      method: 'GET',
      mode: 'cors'
    });

    if (response.ok) {
      setConnected(true);
    } else {
      setConnected(false);
    }
  } catch (error) {
    // Try gateway websocket check
    try {
      const ws = new WebSocket('ws://localhost:18789');
      ws.onopen = () => {
        setConnected(true);
        ws.close();
      };
      ws.onerror = () => {
        setConnected(false);
      };
    } catch {
      setConnected(false);
    }
  }
}

function setConnected(connected) {
  isConnected = connected;
  statusDot.className = `status-dot ${connected ? '' : 'disconnected'}`;
  statusText.textContent = connected ? 'Connecté à Lisa' : 'Déconnecté';
}

// ============================================================================
// Chat
// ============================================================================

function addMessage(text, isUser = false) {
  const message = document.createElement('div');
  message.className = `message ${isUser ? 'user' : 'lisa'}`;
  message.textContent = text;
  chatContainer.appendChild(message);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage(text, true);
  messageInput.value = '';

  try {
    // Send to Lisa API
    const response = await fetch('http://localhost:5180/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    if (response.ok) {
      const data = await response.json();
      addMessage(data.response || 'Message reçu');
    } else {
      addMessage('Erreur de connexion à Lisa');
    }
  } catch (error) {
    // Try via background script
    chrome.runtime.sendMessage({
      type: 'chat.send',
      payload: { message: text }
    }, (response) => {
      if (response?.success) {
        addMessage(response.message || 'Message envoyé');
      } else {
        addMessage('Lisa n\'est pas connectée. Lancez l\'application.');
      }
    });
  }
}

// ============================================================================
// Actions
// ============================================================================

async function takeScreenshot() {
  addMessage('Capture d\'écran en cours...', false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 90
    });

    // Send to Lisa
    chrome.runtime.sendMessage({
      type: 'browser.screenshot',
      payload: {
        dataUrl,
        url: tab.url,
        title: tab.title
      }
    });

    addMessage('Screenshot envoyé à Lisa pour analyse');
  } catch (error) {
    addMessage('Erreur: ' + error.message);
  }
}

async function analyzePage() {
  addMessage('Analyse de la page...', false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          url: window.location.href,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content,
          text: document.body.innerText.slice(0, 5000),
          linkCount: document.querySelectorAll('a').length,
          imageCount: document.querySelectorAll('img').length,
          formCount: document.querySelectorAll('form').length
        };
      }
    });

    const pageInfo = results[0]?.result;
    if (pageInfo) {
      addMessage(`Page: ${pageInfo.title}\n${pageInfo.linkCount} liens, ${pageInfo.imageCount} images`);

      // Send to Lisa for full analysis
      chrome.runtime.sendMessage({
        type: 'context.analyze',
        payload: pageInfo
      });
    }
  } catch (error) {
    addMessage('Erreur: ' + error.message);
  }
}

async function readContent() {
  addMessage('Lecture du contenu...', false);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Extract main content
        const article = document.querySelector('article') ||
                       document.querySelector('main') ||
                       document.querySelector('.content') ||
                       document.body;

        return {
          title: document.title,
          content: article.innerText.slice(0, 10000)
        };
      }
    });

    const content = results[0]?.result;
    if (content) {
      addMessage(`Contenu extrait: ${content.content.slice(0, 200)}...`);

      // Send to Lisa
      chrome.runtime.sendMessage({
        type: 'browser.getContent.result',
        payload: {
          success: true,
          title: content.title,
          content: content.content
        }
      });
    }
  } catch (error) {
    addMessage('Erreur: ' + error.message);
  }
}

function openLisa() {
  chrome.tabs.create({ url: 'http://localhost:5180' });
}

// ============================================================================
// Event Listeners
// ============================================================================

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

screenshotBtn.addEventListener('click', takeScreenshot);
analyzeBtn.addEventListener('click', analyzePage);
readBtn.addEventListener('click', readContent);
openLisaBtn.addEventListener('click', openLisa);

// ============================================================================
// Initialize
// ============================================================================

checkConnection();
setInterval(checkConnection, 10000);

// Focus input
messageInput.focus();
