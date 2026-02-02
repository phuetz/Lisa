#!/usr/bin/env python3
"""
Lisa Desktop Control Server

REST API backend for computer control using PyAutoGUI.
Provides mouse, keyboard, display, and clipboard operations.

Usage:
    pip install lisa-desktop
    lisa-desktop

Or run directly:
    python server.py
"""

import asyncio
import base64
import io
import json
import logging
from typing import Optional, Dict, Any, List, Tuple

try:
    from aiohttp import web
    import pyautogui
    from PIL import Image
    import pytesseract
    import cv2
    import numpy as np
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install aiohttp pyautogui pillow pytesseract opencv-python numpy")
    exit(1)

# Store registered icon templates
ICON_TEMPLATES: Dict[str, np.ndarray] = {}

# Common system icon patterns (name -> description for AI matching)
COMMON_ICONS = {
    'close': 'X button in window corner',
    'minimize': '_ button in window corner',
    'maximize': 'square button in window corner',
    'chrome': 'Chrome browser icon',
    'firefox': 'Firefox browser icon',
    'edge': 'Edge browser icon',
    'folder': 'Folder icon',
    'file': 'File/document icon',
    'settings': 'Gear/cog icon',
    'search': 'Magnifying glass icon',
    'menu': 'Three horizontal lines (hamburger menu)',
    'back': 'Left arrow icon',
    'forward': 'Right arrow icon',
    'refresh': 'Circular arrow icon',
    'home': 'House icon',
    'star': 'Star/favorite icon',
    'trash': 'Trash bin icon',
    'download': 'Down arrow icon',
    'upload': 'Up arrow icon',
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('lisa-desktop')

# Configure PyAutoGUI safety features
pyautogui.FAILSAFE = True  # Move mouse to corner to abort
pyautogui.PAUSE = 0.1  # Small delay between actions

# ============================================================================
# Display Operations
# ============================================================================

async def display_view(request: web.Request) -> web.Response:
    """Capture screenshot and return as base64 PNG."""
    try:
        screenshot = pyautogui.screenshot()

        # Convert to base64
        buffer = io.BytesIO()
        screenshot.save(buffer, format='PNG')
        base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return web.json_response({
            'success': True,
            'screenshot': base64_image,
            'width': screenshot.width,
            'height': screenshot.height
        })
    except Exception as e:
        logger.error(f"Screenshot failed: {e}")
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def display_bounds(request: web.Request) -> web.Response:
    """Get screen dimensions."""
    try:
        size = pyautogui.size()
        return web.json_response({
            'width': size.width,
            'height': size.height
        })
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def display_find(request: web.Request) -> web.Response:
    """Find UI elements using OCR."""
    try:
        data = await request.json()
        query = data.get('query', '')

        # Capture screenshot
        screenshot = pyautogui.screenshot()

        # Use Tesseract OCR to find text
        try:
            ocr_data = pytesseract.image_to_data(screenshot, output_type=pytesseract.Output.DICT)

            elements = []
            for i, text in enumerate(ocr_data['text']):
                if text.strip() and query.lower() in text.lower():
                    x = ocr_data['left'][i]
                    y = ocr_data['top'][i]
                    w = ocr_data['width'][i]
                    h = ocr_data['height'][i]
                    conf = ocr_data['conf'][i]

                    if conf > 30:  # Minimum confidence
                        elements.append({
                            'type': 'text',
                            'text': text,
                            'bounds': {'x': x, 'y': y, 'width': w, 'height': h},
                            'confidence': conf / 100
                        })

            return web.json_response(elements)

        except Exception as ocr_error:
            logger.warning(f"OCR failed: {ocr_error}")
            return web.json_response([])

    except Exception as e:
        logger.error(f"Find elements failed: {e}")
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def display_find_icons(request: web.Request) -> web.Response:
    """Find icons on screen using template matching and edge detection."""
    try:
        data = await request.json()
        icon_name = data.get('icon', '').lower()
        threshold = data.get('threshold', 0.8)

        # Capture screenshot
        screenshot = pyautogui.screenshot()
        screen_np = np.array(screenshot)
        screen_gray = cv2.cvtColor(screen_np, cv2.COLOR_RGB2GRAY)

        icons = []

        # Check if we have a registered template for this icon
        if icon_name in ICON_TEMPLATES:
            template = ICON_TEMPLATES[icon_name]
            icons.extend(find_template_matches(screen_gray, template, icon_name, threshold))

        # Try common UI pattern detection
        if not icons:
            icons.extend(detect_common_ui_elements(screen_gray, screen_np, icon_name, threshold))

        return web.json_response({
            'success': True,
            'icons': icons
        })

    except Exception as e:
        logger.error(f"Icon detection failed: {e}")
        return web.json_response({
            'success': False,
            'error': str(e),
            'icons': []
        }, status=500)


def find_template_matches(screen_gray: np.ndarray, template: np.ndarray, name: str, threshold: float) -> List[Dict]:
    """Find all matches of a template in the screen."""
    results = []

    # Handle color templates
    if len(template.shape) == 3:
        template = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)

    # Multi-scale template matching for robustness
    for scale in [0.8, 0.9, 1.0, 1.1, 1.2]:
        resized_template = cv2.resize(template, None, fx=scale, fy=scale)
        h, w = resized_template.shape

        if h > screen_gray.shape[0] or w > screen_gray.shape[1]:
            continue

        result = cv2.matchTemplate(screen_gray, resized_template, cv2.TM_CCOEFF_NORMED)
        locations = np.where(result >= threshold)

        for pt in zip(*locations[::-1]):
            results.append({
                'type': 'icon',
                'text': name,
                'bounds': {'x': int(pt[0]), 'y': int(pt[1]), 'width': w, 'height': h},
                'confidence': float(result[pt[1], pt[0]])
            })

    # Remove duplicates (overlapping detections)
    return remove_overlapping_detections(results)


def detect_common_ui_elements(screen_gray: np.ndarray, screen_rgb: np.ndarray, icon_name: str, threshold: float) -> List[Dict]:
    """Detect common UI elements like buttons, checkboxes, etc."""
    results = []

    # Close button detection (X pattern)
    if icon_name in ['close', 'x', 'fermer']:
        results.extend(detect_close_buttons(screen_gray, screen_rgb))

    # Minimize button detection (- pattern)
    elif icon_name in ['minimize', 'minimiser', '_', 'moins']:
        results.extend(detect_minimize_buttons(screen_gray, screen_rgb))

    # Maximize button detection (square pattern)
    elif icon_name in ['maximize', 'maximiser', 'agrandir', 'square']:
        results.extend(detect_maximize_buttons(screen_gray, screen_rgb))

    # Checkbox detection
    elif icon_name in ['checkbox', 'check', 'case a cocher']:
        results.extend(detect_checkboxes(screen_gray))

    # Radio button detection
    elif icon_name in ['radio', 'radio button', 'bouton radio']:
        results.extend(detect_radio_buttons(screen_gray))

    # Search icon (magnifying glass)
    elif icon_name in ['search', 'recherche', 'loupe', 'magnifying glass']:
        results.extend(detect_search_icons(screen_gray))

    # Hamburger menu (three lines)
    elif icon_name in ['menu', 'hamburger', 'trois lignes']:
        results.extend(detect_hamburger_menu(screen_gray))

    return results


def detect_close_buttons(screen_gray: np.ndarray, screen_rgb: np.ndarray) -> List[Dict]:
    """Detect close (X) buttons, typically red or in window corners."""
    results = []

    # Look for red regions (close buttons are often red)
    hsv = cv2.cvtColor(screen_rgb, cv2.COLOR_RGB2HSV)
    # Red color range
    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    lower_red2 = np.array([160, 100, 100])
    upper_red2 = np.array([180, 255, 255])

    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = mask1 + mask2

    # Find contours in red regions
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        area = cv2.contourArea(contour)
        if 100 < area < 5000:  # Button-sized
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / h if h > 0 else 0

            # Close buttons are usually square-ish
            if 0.5 < aspect_ratio < 2.0:
                results.append({
                    'type': 'icon',
                    'text': 'close',
                    'bounds': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                    'confidence': 0.7
                })

    return results[:5]  # Limit results


def detect_minimize_buttons(screen_gray: np.ndarray, screen_rgb: np.ndarray) -> List[Dict]:
    """Detect minimize (-) buttons."""
    # Look for horizontal line patterns in top-right areas
    results = []

    # Edge detection
    edges = cv2.Canny(screen_gray, 50, 150)

    # Look for horizontal lines
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=20, minLineLength=10, maxLineGap=2)

    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Check if horizontal (within 5 degrees)
            if abs(y2 - y1) < 3 and 8 < abs(x2 - x1) < 30:
                # Check if in reasonable button location (upper portion of screen)
                if y1 < screen_gray.shape[0] * 0.15:
                    results.append({
                        'type': 'icon',
                        'text': 'minimize',
                        'bounds': {'x': min(x1, x2) - 5, 'y': y1 - 10, 'width': abs(x2 - x1) + 10, 'height': 20},
                        'confidence': 0.6
                    })

    return results[:5]


def detect_maximize_buttons(screen_gray: np.ndarray, screen_rgb: np.ndarray) -> List[Dict]:
    """Detect maximize (square) buttons."""
    results = []

    # Find square-like contours
    edges = cv2.Canny(screen_gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        # Approximate contour to polygon
        epsilon = 0.02 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # Square has 4 vertices
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = w / h if h > 0 else 0

            # Square-ish and button-sized
            if 0.8 < aspect_ratio < 1.2 and 10 < w < 40 and y < screen_gray.shape[0] * 0.15:
                results.append({
                    'type': 'icon',
                    'text': 'maximize',
                    'bounds': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                    'confidence': 0.6
                })

    return results[:5]


def detect_checkboxes(screen_gray: np.ndarray) -> List[Dict]:
    """Detect checkbox elements."""
    results = []

    # Find small square regions
    edges = cv2.Canny(screen_gray, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = w / h if h > 0 else 0

        # Checkboxes are small squares
        if 0.8 < aspect_ratio < 1.2 and 10 < w < 30 and 10 < h < 30:
            results.append({
                'type': 'icon',
                'text': 'checkbox',
                'bounds': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                'confidence': 0.5
            })

    return results[:10]


def detect_radio_buttons(screen_gray: np.ndarray) -> List[Dict]:
    """Detect radio button elements (circles)."""
    results = []

    # Detect circles using Hough Circle Transform
    circles = cv2.HoughCircles(
        screen_gray,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=20,
        param1=50,
        param2=30,
        minRadius=5,
        maxRadius=15
    )

    if circles is not None:
        circles = np.uint16(np.around(circles))
        for circle in circles[0, :]:
            x, y, r = circle
            results.append({
                'type': 'icon',
                'text': 'radio',
                'bounds': {'x': int(x - r), 'y': int(y - r), 'width': int(2 * r), 'height': int(2 * r)},
                'confidence': 0.6
            })

    return results[:10]


def detect_search_icons(screen_gray: np.ndarray) -> List[Dict]:
    """Detect search/magnifying glass icons."""
    results = []

    # Detect circles (lens part of magnifying glass)
    circles = cv2.HoughCircles(
        screen_gray,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=30,
        param1=50,
        param2=30,
        minRadius=8,
        maxRadius=25
    )

    if circles is not None:
        circles = np.uint16(np.around(circles))
        for circle in circles[0, :]:
            x, y, r = circle
            # Check for handle line extending from circle
            roi = screen_gray[max(0, y-r-5):min(screen_gray.shape[0], y+r+15),
                             max(0, x-r-5):min(screen_gray.shape[1], x+r+15)]

            edges = cv2.Canny(roi, 50, 150)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=10, minLineLength=5, maxLineGap=3)

            if lines is not None and len(lines) > 0:
                results.append({
                    'type': 'icon',
                    'text': 'search',
                    'bounds': {'x': int(x - r - 5), 'y': int(y - r - 5), 'width': int(2 * r + 15), 'height': int(2 * r + 15)},
                    'confidence': 0.6
                })

    return results[:5]


def detect_hamburger_menu(screen_gray: np.ndarray) -> List[Dict]:
    """Detect hamburger menu (three horizontal lines)."""
    results = []

    # Edge detection
    edges = cv2.Canny(screen_gray, 50, 150)

    # Look for groups of 3 parallel horizontal lines
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=15, minLineLength=15, maxLineGap=2)

    if lines is not None:
        horizontal_lines = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if abs(y2 - y1) < 3:  # Nearly horizontal
                horizontal_lines.append((min(x1, x2), y1, abs(x2 - x1)))

        # Group lines by x position
        horizontal_lines.sort(key=lambda l: (l[0], l[1]))

        for i in range(len(horizontal_lines) - 2):
            l1, l2, l3 = horizontal_lines[i:i+3]
            # Check if three lines are vertically aligned and evenly spaced
            if abs(l1[0] - l2[0]) < 5 and abs(l2[0] - l3[0]) < 5:
                spacing1 = l2[1] - l1[1]
                spacing2 = l3[1] - l2[1]
                if 3 < spacing1 < 15 and abs(spacing1 - spacing2) < 3:
                    results.append({
                        'type': 'icon',
                        'text': 'menu',
                        'bounds': {'x': int(l1[0] - 5), 'y': int(l1[1] - 5), 'width': int(l1[2] + 10), 'height': int(l3[1] - l1[1] + 10)},
                        'confidence': 0.7
                    })

    return results[:5]


def remove_overlapping_detections(detections: List[Dict], overlap_thresh: float = 0.5) -> List[Dict]:
    """Remove overlapping detections using non-maximum suppression."""
    if len(detections) == 0:
        return []

    # Sort by confidence
    detections = sorted(detections, key=lambda x: x['confidence'], reverse=True)

    keep = []
    for det in detections:
        should_keep = True
        for kept in keep:
            # Calculate IoU
            b1 = det['bounds']
            b2 = kept['bounds']

            x1 = max(b1['x'], b2['x'])
            y1 = max(b1['y'], b2['y'])
            x2 = min(b1['x'] + b1['width'], b2['x'] + b2['width'])
            y2 = min(b1['y'] + b1['height'], b2['y'] + b2['height'])

            if x2 > x1 and y2 > y1:
                intersection = (x2 - x1) * (y2 - y1)
                area1 = b1['width'] * b1['height']
                area2 = b2['width'] * b2['height']
                union = area1 + area2 - intersection
                iou = intersection / union if union > 0 else 0

                if iou > overlap_thresh:
                    should_keep = False
                    break

        if should_keep:
            keep.append(det)

    return keep


async def display_register_icon(request: web.Request) -> web.Response:
    """Register a custom icon template for detection."""
    try:
        data = await request.json()
        name = data.get('name', '').lower()
        template_base64 = data.get('template', '')

        if not name or not template_base64:
            return web.json_response({
                'success': False,
                'error': 'Name and template required'
            }, status=400)

        # Decode base64 image
        template_bytes = base64.b64decode(template_base64)
        template_np = np.frombuffer(template_bytes, dtype=np.uint8)
        template = cv2.imdecode(template_np, cv2.IMREAD_COLOR)

        if template is None:
            return web.json_response({
                'success': False,
                'error': 'Invalid image data'
            }, status=400)

        ICON_TEMPLATES[name] = template
        logger.info(f"Registered icon template: {name} ({template.shape})")

        return web.json_response({
            'success': True,
            'name': name,
            'size': {'width': template.shape[1], 'height': template.shape[0]}
        })

    except Exception as e:
        logger.error(f"Icon registration failed: {e}")
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


# ============================================================================
# Mouse Operations
# ============================================================================

async def mouse_click(request: web.Request) -> web.Response:
    """Click at position or on element."""
    try:
        data = await request.json()
        x = data.get('x')
        y = data.get('y')
        button = data.get('button', 'left')

        if x is not None and y is not None:
            pyautogui.click(x, y, button=button)
        else:
            pyautogui.click(button=button)

        return web.json_response({'success': True})
    except Exception as e:
        logger.error(f"Click failed: {e}")
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def mouse_double_click(request: web.Request) -> web.Response:
    """Double click."""
    try:
        data = await request.json()
        x = data.get('x')
        y = data.get('y')

        if x is not None and y is not None:
            pyautogui.doubleClick(x, y)
        else:
            pyautogui.doubleClick()

        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def mouse_right_click(request: web.Request) -> web.Response:
    """Right click."""
    try:
        data = await request.json()
        x = data.get('x')
        y = data.get('y')

        if x is not None and y is not None:
            pyautogui.rightClick(x, y)
        else:
            pyautogui.rightClick()

        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def mouse_move(request: web.Request) -> web.Response:
    """Move mouse to position."""
    try:
        data = await request.json()
        x = data.get('x')
        y = data.get('y')
        duration = data.get('duration', 0.25)

        if x is not None and y is not None:
            pyautogui.moveTo(x, y, duration=duration)
            return web.json_response({'success': True})
        else:
            return web.json_response({
                'success': False,
                'error': 'x and y coordinates required'
            }, status=400)
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def mouse_drag(request: web.Request) -> web.Response:
    """Drag from current position to target."""
    try:
        data = await request.json()
        drag_to = data.get('dragTo', {})
        x = drag_to.get('x')
        y = drag_to.get('y')
        duration = data.get('duration', 0.5)

        if x is not None and y is not None:
            pyautogui.drag(x - pyautogui.position().x,
                          y - pyautogui.position().y,
                          duration=duration)
            return web.json_response({'success': True})
        else:
            return web.json_response({
                'success': False,
                'error': 'dragTo coordinates required'
            }, status=400)
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def mouse_scroll(request: web.Request) -> web.Response:
    """Scroll at current position."""
    try:
        data = await request.json()
        amount = data.get('scrollAmount', 0)

        pyautogui.scroll(amount)
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


# ============================================================================
# Keyboard Operations
# ============================================================================

async def keyboard_write(request: web.Request) -> web.Response:
    """Type text."""
    try:
        data = await request.json()
        text = data.get('text', '')
        interval = data.get('interval', 0.02)

        pyautogui.write(text, interval=interval)
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def keyboard_press(request: web.Request) -> web.Response:
    """Press a single key."""
    try:
        data = await request.json()
        key = data.get('key', '')

        pyautogui.press(key)
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def keyboard_hotkey(request: web.Request) -> web.Response:
    """Execute hotkey combination."""
    try:
        data = await request.json()
        keys = data.get('keys', [])

        if keys:
            pyautogui.hotkey(*keys)
            return web.json_response({'success': True})
        else:
            return web.json_response({
                'success': False,
                'error': 'No keys specified'
            }, status=400)
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


# ============================================================================
# Clipboard Operations
# ============================================================================

async def clipboard_view(request: web.Request) -> web.Response:
    """Get clipboard contents."""
    try:
        import pyperclip
        content = pyperclip.paste()
        return web.json_response({
            'success': True,
            'content': content
        })
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


async def clipboard_copy(request: web.Request) -> web.Response:
    """Copy text to clipboard."""
    try:
        data = await request.json()
        text = data.get('text', '')

        import pyperclip
        pyperclip.copy(text)
        return web.json_response({'success': True})
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)


# ============================================================================
# OS Functions
# ============================================================================

async def os_selected_text(request: web.Request) -> web.Response:
    """Get currently selected text using clipboard trick."""
    try:
        import pyperclip

        # Save current clipboard
        original = pyperclip.paste()

        # Copy selected text
        pyautogui.hotkey('ctrl', 'c')
        await asyncio.sleep(0.1)

        # Get selected text
        selected = pyperclip.paste()

        # Restore original clipboard
        if original != selected:
            pyperclip.copy(original)

        return web.json_response({
            'success': True,
            'text': selected if selected != original else ''
        })
    except Exception as e:
        return web.json_response({
            'success': False,
            'error': str(e),
            'text': None
        })


# ============================================================================
# Files Functions
# ============================================================================

async def files_read(request: web.Request) -> web.Response:
    """Read a file's contents."""
    try:
        data = await request.json()
        path = data.get('path', '')

        if not path:
            return web.json_response({'success': False, 'error': 'No path provided'})

        # Security: only allow certain directories
        import os
        abs_path = os.path.abspath(path)

        with open(abs_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return web.json_response({
            'success': True,
            'content': content,
            'path': abs_path
        })
    except FileNotFoundError:
        return web.json_response({'success': False, 'error': 'File not found', 'content': None})
    except Exception as e:
        return web.json_response({'success': False, 'error': str(e), 'content': None})


async def files_write(request: web.Request) -> web.Response:
    """Write content to a file."""
    try:
        data = await request.json()
        path = data.get('path', '')
        content = data.get('content', '')

        if not path:
            return web.json_response({'success': False, 'error': 'No path provided'})

        import os
        abs_path = os.path.abspath(path)

        # Create directory if needed
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        with open(abs_path, 'w', encoding='utf-8') as f:
            f.write(content)

        return web.json_response({
            'success': True,
            'path': abs_path,
            'bytes_written': len(content)
        })
    except Exception as e:
        return web.json_response({'success': False, 'error': str(e)})


async def files_list(request: web.Request) -> web.Response:
    """List files in a directory."""
    try:
        data = await request.json()
        path = data.get('path', '.')

        import os
        abs_path = os.path.abspath(path)

        if not os.path.isdir(abs_path):
            return web.json_response({'success': False, 'error': 'Not a directory', 'files': []})

        files = []
        for entry in os.scandir(abs_path):
            files.append({
                'name': entry.name,
                'type': 'directory' if entry.is_dir() else 'file',
                'size': entry.stat().st_size if entry.is_file() else None
            })

        return web.json_response({
            'success': True,
            'path': abs_path,
            'files': files
        })
    except Exception as e:
        return web.json_response({'success': False, 'error': str(e), 'files': []})


# ============================================================================
# Health Check
# ============================================================================

async def health_check(request: web.Request) -> web.Response:
    """Health check endpoint."""
    return web.json_response({
        'status': 'ok',
        'service': 'lisa-desktop',
        'version': '1.1.0',
        'capabilities': ['display', 'mouse', 'keyboard', 'clipboard', 'os', 'files', 'icons'],
        'registered_icons': list(ICON_TEMPLATES.keys())
    })


# ============================================================================
# CORS Middleware
# ============================================================================

@web.middleware
async def cors_middleware(request: web.Request, handler):
    """Add CORS headers for browser access."""
    if request.method == 'OPTIONS':
        response = web.Response()
    else:
        response = await handler(request)

    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'

    return response


# ============================================================================
# Application Setup
# ============================================================================

def create_app() -> web.Application:
    """Create and configure the application."""
    app = web.Application(middlewares=[cors_middleware])

    # Health check
    app.router.add_get('/health', health_check)

    # Display routes
    app.router.add_get('/display/view', display_view)
    app.router.add_get('/display/bounds', display_bounds)
    app.router.add_post('/display/find', display_find)
    app.router.add_post('/display/find_icons', display_find_icons)
    app.router.add_post('/display/register_icon', display_register_icon)

    # Mouse routes
    app.router.add_post('/mouse/click', mouse_click)
    app.router.add_post('/mouse/doubleClick', mouse_double_click)
    app.router.add_post('/mouse/rightClick', mouse_right_click)
    app.router.add_post('/mouse/move', mouse_move)
    app.router.add_post('/mouse/drag', mouse_drag)
    app.router.add_post('/mouse/scroll', mouse_scroll)

    # Keyboard routes
    app.router.add_post('/keyboard/write', keyboard_write)
    app.router.add_post('/keyboard/press', keyboard_press)
    app.router.add_post('/keyboard/hotkey', keyboard_hotkey)

    # Clipboard routes
    app.router.add_get('/clipboard/view', clipboard_view)
    app.router.add_post('/clipboard/copy', clipboard_copy)

    # OS routes
    app.router.add_get('/os/selected_text', os_selected_text)

    # Files routes
    app.router.add_post('/files/read', files_read)
    app.router.add_post('/files/write', files_write)
    app.router.add_post('/files/list', files_list)

    return app


def main():
    """Run the server."""
    import argparse

    parser = argparse.ArgumentParser(description='Lisa Desktop Control Server')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8765, help='Port to bind to')
    args = parser.parse_args()

    print(f"""
+--------------------------------------------------------------+
|              Lisa Desktop Control v1.1.0                      |
+--------------------------------------------------------------+
|  Server: http://{args.host}:{args.port}                              |
|  Safety: Move mouse to corner to STOP automation             |
+--------------------------------------------------------------+
|  DISPLAY    /display/view, /bounds, /find, /find_icons       |
|  ICONS      /display/find_icons, /register_icon              |
|  MOUSE      /mouse/click, /move, /scroll, /drag              |
|  KEYBOARD   /keyboard/write, /press, /hotkey                 |
|  CLIPBOARD  /clipboard/view, /clipboard/copy                 |
|  OS         /os/selected_text                                |
|  FILES      /files/read, /write, /list                       |
+--------------------------------------------------------------+
|  Icon Detection: close, minimize, maximize, checkbox, radio, |
|                  search, menu (hamburger), and custom icons  |
+--------------------------------------------------------------+
    """)

    app = create_app()
    web.run_app(app, host=args.host, port=args.port, print=lambda x: None)


if __name__ == '__main__':
    main()
