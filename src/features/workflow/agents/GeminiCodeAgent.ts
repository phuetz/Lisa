/**
 * @file Agent that interfaces with Google's Gemini Pro via the Gemini CLI
 * and provides a fallback to a local Code Gemma model.
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Promisify the exec function for async/await usage
const execAsync = promisify(exec);

// --- Data Structures ---

export interface CodeGenerationContext {
  language: string;
  fileContent?: string; // Content of the file being edited
}

export interface GenerationResult {
  success: boolean;
  content?: string; // The generated code or diff
  error?: string;
  source: 'gemini' | 'gemma' | 'error';
}

// --- Agent Class ---

export class GeminiCodeAgent {
  private readonly GEMINI_CLI_PATH = 'gemini'; // Assumes 'gemini' is in the system's PATH
  private readonly GEMINI_CREDENTIALS_PATH = path.join(process.env.USERPROFILE || '', '.gemini', 'credentials.json');
  private readonly DAILY_REQUEST_QUOTA_LIMIT = 900;
  private currentRequestCount = 0; // This should be persisted

  constructor() {
    this.loadRequestCount();
  }

  /**
   * Reads the local Gemini credentials to check for API key presence.
   * In a real app, this would use Windows DPAPI for decryption.
   */
  private async checkCredentials(): Promise<boolean> {
    try {
      const stats = await fs.stat(this.GEMINI_CREDENTIALS_PATH);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Generates code using either Gemini Pro or a local fallback.
   * @param prompt - The natural language prompt for code generation.
   * @param context - Optional context, like language or current file content.
   * @returns The generated code or an error message.
   */
  async generateCode(prompt: string): Promise<GenerationResult> {
    if (this.currentRequestCount >= this.DAILY_REQUEST_QUOTA_LIMIT) {
      console.warn('Gemini daily quota reached. Falling back to local Code Gemma.');
      return this.generateWithGemma(prompt);
    }

    if (!(await this.checkCredentials())) {
        return { success: false, error: 'Gemini credentials not found.', source: 'error' };
    }

    try {
      // The Gemini CLI command might look different; this is an educated guess.
      // Using stdin for the prompt is more secure and robust.
      const options = {
        cwd: process.env.HOME || process.env.USERPROFILE,
      };

      // Escape double quotes in the prompt to prevent command injection
      const escapedPrompt = prompt.replace(/"/g, '\\"');

      const { stdout, stderr } = await execAsync(`${this.GEMINI_CLI_PATH} "${escapedPrompt}"`, options);

      if (stderr) {
        console.error('Gemini CLI Error:', stderr);
        // Don't fallback on CLI error, it might be a user issue
        return { success: false, error: stderr, source: 'gemini' };
      }

      this.incrementRequestCount();
      
      // Here you would parse the stdout to get the rate-limit headers if the CLI provides them.
      // For now, we just increment our local counter.

      return { success: true, content: stdout, source: 'gemini' };

    } catch (error: any) {
      console.error('Failed to execute Gemini CLI:', error);
      // Fallback on execution failure
      return this.generateWithGemma(prompt);
    }
  }

  /**
   * Fallback mechanism to use a local Code Gemma model via transformers.
   * @param prompt - The code generation prompt.
   * @returns The generated code or an error message.
   */
  private async generateWithGemma(prompt: string): Promise<GenerationResult> {
    console.log('Using local Code Gemma model...');
    // This is a placeholder for the actual implementation using Hugging Face's transformers.js
    // It would require loading the quantized model and running inference.
    // e.g., const pipeline = await pipeline('text-generation', 'google/codegemma-7b-it');
    try {
      const mockGemmaOutput = `// Code Gemma fallback response for prompt: "${prompt}"\nconsole.log("Hello from local Gemma!");`;
      return { success: true, content: mockGemmaOutput, source: 'gemma' };
    } catch (error: any) {
      return { success: false, error: error.message, source: 'error' };
    }
  }

  private async loadRequestCount(): Promise<void> {
    // In a real app, this would be read from a persistent store like IndexedDB.
    this.currentRequestCount = 0; 
  }

  private async incrementRequestCount(): Promise<void> {
    this.currentRequestCount++;
    // In a real app, this would be saved to a persistent store.
  }
}
