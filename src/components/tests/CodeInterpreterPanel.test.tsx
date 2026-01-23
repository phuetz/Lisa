import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeInterpreterPanel } from '../CodeInterpreterPanel';
import { agentRegistry } from '../../features/agents/core/registry';
import type { BaseAgent } from '../../features/agents/core/types';

// Mock the agent registry
vi.mock('../../features/agents/core/registry', () => ({
  agentRegistry: {
    getAgent: vi.fn(),
  },
}));

describe('CodeInterpreterPanel', () => {
  const mockExecute = vi.fn();
  const mockAgent = {
    name: 'CodeInterpreterAgent',
    execute: mockExecute,
  } as unknown as BaseAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(agentRegistry.getAgent).mockReturnValue(mockAgent);
  });

  it('should render in collapsed state initially', () => {
    render(<CodeInterpreterPanel />);
    expect(screen.getByText('Code Interpreter')).toBeInTheDocument();
    expect(screen.queryByLabelText('Python Code')).not.toBeInTheDocument();
  });

  it('should expand and show code editor when clicked', async () => {
    render(<CodeInterpreterPanel />);
    
    // Click to expand
    fireEvent.click(screen.getByText('Code Interpreter'));
    
    // Expect code editor to be visible
    expect(screen.getByLabelText('Python Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Code' })).toBeInTheDocument();
  });

  it('should execute code and display results', async () => {
    // Mock successful execution
    mockExecute.mockResolvedValue({
      success: true,
      output: 'Execution result: 15'
    });

    render(<CodeInterpreterPanel expanded={true} />);
    
    // Enter code
    const codeInput = screen.getByLabelText('Python Code');
    fireEvent.change(codeInput, { target: { value: 'print(5 + 10)' } });
    
    // Click run button
    fireEvent.click(screen.getByRole('button', { name: 'Run Code' }));
    
    // Wait for execution to complete
    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        intent: 'execute_code',
        parameters: { code: 'print(5 + 10)' }
      });
    });
    
    // Check if result is displayed
    await waitFor(() => {
      expect(screen.getByText('Output:')).toBeInTheDocument();
      expect(screen.getByText(/Execution result: 15/)).toBeInTheDocument();
    });
  });

  it('should display error message when execution fails', async () => {
    // Mock failed execution
    mockExecute.mockResolvedValue({
      success: false,
      error: 'SyntaxError: invalid syntax'
    });

    render(<CodeInterpreterPanel expanded={true} />);
    
    // Enter code with syntax error
    const codeInput = screen.getByLabelText('Python Code');
    fireEvent.change(codeInput, { target: { value: 'print(5 +' } });
    
    // Click run button
    fireEvent.click(screen.getByText('Run Code'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('SyntaxError: invalid syntax')).toBeInTheDocument();
    });
  });

  it('should handle case when agent is not available', () => {
    // Mock agent not available
    vi.mocked(agentRegistry.getAgent).mockReturnValue(undefined);
    
    render(<CodeInterpreterPanel expanded={true} />);
    
    expect(screen.getByText('Code interpreter functionality is not available. Please check your configuration.')).toBeInTheDocument();
  });

  it('should copy result to clipboard when copy button is clicked', async () => {
    // Mock clipboard API
    const clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteTextMock },
      configurable: true
    });

    // Mock successful execution
    mockExecute.mockResolvedValue({
      success: true,
      output: 'Result to copy'
    });

    render(<CodeInterpreterPanel expanded={true} />);
    
    // Run code
    fireEvent.click(screen.getByText('Run Code'));
    
    // Wait for result to appear
    await waitFor(() => {
      expect(screen.getByText(/Result to copy/)).toBeInTheDocument();
    });
    
    // Click copy button (using the title attribute of the button)
    const copyButton = screen.getByRole('button', { name: 'Copy result' });
    fireEvent.click(copyButton);

    // Verify clipboard API was called
    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('Result to copy');
    });
  });
});
