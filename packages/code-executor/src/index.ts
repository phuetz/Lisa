/**
 * @lisa-ai/code-executor
 * Python code execution engine using Pyodide
 * 
 * Features:
 * - Run Python code in the browser via WebAssembly
 * - Auto-detect and install packages (numpy, pandas, matplotlib, etc.)
 * - Capture stdout/stderr output
 * - Display matplotlib plots as base64 images
 * - Support for requests via pyodide-http
 */

export * from './executor';
export * from './types';
export * from './packages';
