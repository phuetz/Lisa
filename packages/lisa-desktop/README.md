# Lisa Desktop Control

Desktop control backend for Lisa AI Assistant, enabling full computer automation.

Inspired by [Open Interpreter](https://github.com/openinterpreter/open-interpreter) OS Mode.

## Features

- **Screen Capture**: Take screenshots of the current display
- **Mouse Control**: Click, move, drag, and scroll
- **Keyboard Control**: Type text and execute hotkeys
- **UI Element Detection**: Find elements on screen using OCR
- **Icon Detection**: Find common UI icons (close, minimize, search, menu, etc.) using computer vision
- **Custom Icon Templates**: Register custom icon templates for detection
- **Clipboard Access**: Read and write clipboard contents

## Installation

### Option 1: Local Development (Recommended)

```bash
# Navigate to the package directory
cd packages/lisa-desktop

# Install dependencies
pip install aiohttp pyautogui pillow pyperclip pytesseract opencv-python numpy

# Run the server
python src/server.py
```

### Option 2: Install as Package

```bash
cd packages/lisa-desktop
pip install -e .
lisa-desktop
```

### Option 3: PyPI (Coming Soon)

```bash
# Not yet available - will be published soon
pip install lisa-desktop
```

### System Requirements

- Python 3.9+
- Tesseract OCR (for UI element detection)

#### Windows
```bash
# Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH or set TESSDATA_PREFIX environment variable
```

#### macOS
```bash
brew install tesseract
```

#### Linux
```bash
sudo apt-get install tesseract-ocr
```

## Usage

### Start the Server

```bash
lisa-desktop
```

Options:
- `--host`: Host to bind to (default: 127.0.0.1)
- `--port`: Port to bind to (default: 8765)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/display/view` | GET | Capture screenshot (base64 PNG) |
| `/display/bounds` | GET | Get screen dimensions |
| `/display/find` | POST | Find UI elements using OCR |
| `/display/find_icons` | POST | Find icons using computer vision |
| `/display/register_icon` | POST | Register custom icon template |
| `/mouse/click` | POST | Click at position |
| `/mouse/doubleClick` | POST | Double click |
| `/mouse/rightClick` | POST | Right click |
| `/mouse/move` | POST | Move mouse |
| `/mouse/drag` | POST | Drag to position |
| `/mouse/scroll` | POST | Scroll |
| `/keyboard/write` | POST | Type text |
| `/keyboard/press` | POST | Press key |
| `/keyboard/hotkey` | POST | Execute hotkey |
| `/clipboard/view` | GET | Get clipboard contents |
| `/clipboard/copy` | POST | Copy to clipboard |

### Icon Detection

The backend can detect common UI icons using computer vision:

**Built-in icon types:**
- `close` - Close (X) buttons
- `minimize` - Minimize (-) buttons
- `maximize` - Maximize (square) buttons
- `checkbox` - Checkbox elements
- `radio` - Radio buttons
- `search` - Search/magnifying glass icons
- `menu` - Hamburger menu (three lines)

**Example: Find close button**
```bash
curl -X POST http://localhost:8765/display/find_icons \
  -H "Content-Type: application/json" \
  -d '{"icon": "close", "threshold": 0.7}'
```

**Register custom icon template**
```bash
curl -X POST http://localhost:8765/display/register_icon \
  -H "Content-Type: application/json" \
  -d '{"name": "my_icon", "template": "<base64_encoded_png>"}'
```

### Safety Features

- **Fail-safe**: Move mouse to any screen corner to stop all automation
- **Local only**: By default, only accepts connections from localhost
- **Action delay**: Small delay between actions to prevent runaway scripts

## Quick Start

```bash
# Terminal 1: Start the backend
cd packages/lisa-desktop
pip install aiohttp pyautogui pillow pyperclip pytesseract opencv-python numpy
python src/server.py

# Terminal 2: Start Lisa
pnpm dev
```

Then open http://localhost:5180 and use Code Buddy!

## Integration with Lisa

1. **Start the desktop server**:
   ```bash
   cd packages/lisa-desktop
   python src/server.py
   ```
   You should see: `Lisa Desktop Control started on http://127.0.0.1:8765`

2. **Open Lisa** in your browser: http://localhost:5180

3. **Use Code Buddy** to control your computer with natural language:
   - "Open Chrome and search for weather in Paris"
   - "Click on the Start menu"
   - "Type 'Hello World' in the text field"

4. **Verify connection**: Code Buddy panel shows "Full Control" (green) when connected

## Architecture

```
┌─────────────────┐     HTTP/REST     ┌─────────────────┐
│                 │ ◄───────────────► │                 │
│   Lisa (Web)    │                   │  lisa-desktop   │
│   Browser       │                   │  Python Server  │
│                 │                   │                 │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │    pyautogui    │
                                      │  Mouse/Keyboard │
                                      │     Control     │
                                      └─────────────────┘
```

## Troubleshooting

### "Backend not connected" in Code Buddy

1. Check if the server is running:
   ```bash
   curl http://localhost:8765/health
   ```
   Should return: `{"status": "ok", "version": "1.0.0"}`

2. Check for port conflicts:
   ```bash
   netstat -an | grep 8765
   ```

3. Restart the server:
   ```bash
   python src/server.py --port 8766  # Try different port
   ```

### Mouse/Keyboard not working

- **Windows**: Run as Administrator if needed
- **macOS**: Grant Accessibility permissions in System Preferences
- **Linux**: Install `xdotool` or run with `sudo`

### OCR not detecting text

1. Verify Tesseract is installed:
   ```bash
   tesseract --version
   ```

2. Check TESSDATA_PREFIX environment variable points to tessdata folder

## Security Notes

- Only run on trusted networks
- The server has full control over your computer
- Always keep the fail-safe active (don't disable FAILSAFE)
- Move mouse to any corner to emergency stop all automation

## Development

```bash
# Run tests
pytest

# Format code
black src/

# Type check
mypy src/
```

## License

MIT
