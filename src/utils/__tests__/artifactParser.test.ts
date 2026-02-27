import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArtifacts, hasArtifacts, createManualArtifact } from '../artifactParser';

// Stabilize artifact IDs for assertions
beforeEach(() => {
  let counter = 0;
  vi.spyOn(Date, 'now').mockReturnValue(1000000);
  vi.spyOn(Math, 'random').mockImplementation(() => {
    counter++;
    return counter * 0.001;
  });
});

describe('parseArtifacts', () => {
  it('should detect HTML artifacts with DOCTYPE in markdown code blocks', () => {
    const content = 'Here is a page:\n```html\n<!DOCTYPE html>\n<html><body><h1>Hello</h1></body></html>\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('html');
    expect(result.artifacts[0].title).toBe('HTML Page');
    expect(result.artifacts[0].language).toBe('html');
    expect(result.artifacts[0].code).toContain('<!DOCTYPE html>');
  });

  it('should detect React/JSX artifacts with ReactDOM.render', () => {
    const jsxCode = `
function App() {
  return <div>Hello React</div>;
}
ReactDOM.render(<App />, document.getElementById('root'));
`.trim();
    const content = '```jsx\n' + jsxCode + '\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('react');
    expect(result.artifacts[0].title).toBe('React Component');
    expect(result.artifacts[0].language).toBe('javascript');
    expect(result.artifacts[0].code).toContain('ReactDOM.render');
  });

  it('should detect React/JSX artifacts with createRoot', () => {
    const jsxCode = `
function App() {
  return <div>Hello React 18</div>;
}
const root = createRoot(document.getElementById('root'));
root.render(<App />);
`.trim();
    const content = '```react\n' + jsxCode + '\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('react');
    expect(result.artifacts[0].code).toContain('createRoot');
  });

  it('should detect Python artifacts with sufficient code length', () => {
    // Python must be > 100 chars and contain a keyword like print/class/def/import
    const pythonCode = `
import numpy as np

def calculate_statistics(data):
    mean = np.mean(data)
    std = np.std(data)
    print(f"Mean: {mean}, Std: {std}")
    return mean, std

calculate_statistics([1, 2, 3, 4, 5])
`.trim();
    const content = '```python\n' + pythonCode + '\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('python');
    expect(result.artifacts[0].title).toBe('Python Script');
    expect(result.artifacts[0].language).toBe('python');
  });

  it('should NOT detect short Python snippets (<=100 chars)', () => {
    const shortPython = 'print("hello")';
    const content = '```python\n' + shortPython + '\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(0);
  });

  it('should detect SVG artifacts', () => {
    const svgCode = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
    // The SVG regex expects </svg> immediately before ``` (no trailing newline)
    const content = '```svg\n' + svgCode + '```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('svg');
    expect(result.artifacts[0].title).toBe('SVG Image');
    expect(result.artifacts[0].language).toBe('xml');
    expect(result.artifacts[0].code).toContain('<svg');
  });

  it('should detect Mermaid diagram artifacts', () => {
    const mermaidCode = 'graph TD\n  A[Start] --> B[End]';
    const content = '```mermaid\n' + mermaidCode + '\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].type).toBe('mermaid');
    expect(result.artifacts[0].title).toBe('Diagram');
    expect(result.artifacts[0].language).toBe('markdown');
  });

  it('should handle code blocks without matching artifact patterns', () => {
    const content = '```\nsome plain text code block\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(0);
    expect(result.text).toContain('some plain text code block');
  });

  it('should handle messages with no code blocks at all', () => {
    const content = 'This is a plain text message with no code blocks.';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(0);
    expect(result.text).toBe(content);
  });

  it('should handle multiple artifacts in one message', () => {
    const htmlCode = '<!DOCTYPE html>\n<html><body>Hello</body></html>';
    const mermaidCode = 'graph TD\n  A --> B';
    const content = 'HTML:\n```html\n' + htmlCode + '\n```\nDiagram:\n```mermaid\n' + mermaidCode + '\n```';

    const result = parseArtifacts(content);

    expect(result.artifacts).toHaveLength(2);
    const types = result.artifacts.map(a => a.type);
    expect(types).toContain('html');
    expect(types).toContain('mermaid');
  });

  it('should replace detected artifact code blocks with placeholder text', () => {
    const content = 'Check this:\n```html\n<!DOCTYPE html>\n<html><body>Hi</body></html>\n```\nDone.';

    const result = parseArtifacts(content);

    expect(result.text).toContain('Artefact: HTML Page');
    expect(result.text).not.toContain('<!DOCTYPE html>');
  });
});

describe('hasArtifacts', () => {
  it('should return true when content contains detectable artifacts', () => {
    const content = '```html\n<!DOCTYPE html>\n<html></html>\n```';
    expect(hasArtifacts(content)).toBe(true);
  });

  it('should return false when content has no artifacts', () => {
    const content = 'Just some plain text, no code here.';
    expect(hasArtifacts(content)).toBe(false);
  });
});

describe('createManualArtifact', () => {
  it('should create an artifact with the correct fields', () => {
    const artifact = createManualArtifact('javascript', 'My Script', 'console.log("hi")');

    expect(artifact.type).toBe('javascript');
    expect(artifact.title).toBe('My Script');
    expect(artifact.code).toBe('console.log("hi")');
    expect(artifact.language).toBe('javascript');
    expect(artifact.id).toMatch(/^artifact-/);
  });
});
