/**
 * Code Block Component
 * Code avec syntax highlighting et bouton copy
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 not-prose">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border border-[#404040] rounded-t-lg">
        <span className="text-xs font-mono text-gray-400 uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors rounded hover:bg-[#2a2a2a]"
          title="Copier le code"
        >
          {copied ? (
            <>
              <Check size={14} />
              Copié!
            </>
          ) : (
            <>
              <Copy size={14} />
              Copier
            </>
          )}
        </button>
      </div>
      
      {/* Code */}
      <pre className="!mt-0 p-4 bg-[#0a0a0a] border border-t-0 border-[#404040] rounded-b-lg overflow-x-auto">
        <code className={`language-${language} text-sm !bg-transparent`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
