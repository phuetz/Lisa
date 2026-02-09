/**
 * Message Renderer Component
 * Rendu markdown avec syntax highlighting
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { CodeBlock } from './CodeBlock';
import 'highlight.js/styles/github-dark.css';

interface MessageRendererProps {
  content: string;
}

export const MessageRenderer = ({ content }: MessageRendererProps) => {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            const code = String(children).replace(/\n$/, '');
            
            return !inline && match ? (
              <CodeBlock
                language={match[1]}
                code={code}
              />
            ) : (
              <code 
                className="px-1.5 py-0.5 bg-[#1a1a26] rounded text-sm font-mono text-blue-300 border border-[#2d2d44]" 
                {...props}
              >
                {children}
              </code>
            );
          },
          
          a({children, href}) {
            return (
              <a 
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-400 transition-colors"
              >
                {children}
              </a>
            );
          },
          
          p({children}) {
            return <p className="mb-3 last:mb-0 text-white leading-relaxed">{children}</p>;
          },
          
          h1({children}) {
            return <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0 text-white border-b border-[#2d2d44] pb-2">{children}</h1>;
          },
          
          h2({children}) {
            return <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0 text-white">{children}</h2>;
          },
          
          h3({children}) {
            return <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-white">{children}</h3>;
          },
          
          ul({children}) {
            return <ul className="list-disc list-inside mb-3 space-y-1 text-white">{children}</ul>;
          },
          
          ol({children}) {
            return <ol className="list-decimal list-inside mb-3 space-y-1 text-white">{children}</ol>;
          },
          
          li({children}) {
            return <li className="text-white">{children}</li>;
          },
          
          blockquote({children}) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-500/5 text-gray-300 italic">
                {children}
              </blockquote>
            );
          },
          
          table({children}) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-[#2d2d44] rounded-lg">
                  {children}
                </table>
              </div>
            );
          },
          
          thead({children}) {
            return <thead className="bg-[#1a1a26]">{children}</thead>;
          },
          
          tbody({children}) {
            return <tbody className="divide-y divide-[#404040]">{children}</tbody>;
          },
          
          tr({children}) {
            return <tr className="hover:bg-[#1a1a26] transition-colors">{children}</tr>;
          },
          
          th({children}) {
            return <th className="px-4 py-2 text-left text-sm font-semibold text-white border-b border-[#2d2d44]">{children}</th>;
          },
          
          td({children}) {
            return <td className="px-4 py-2 text-sm text-gray-300">{children}</td>;
          },
          
          hr() {
            return <hr className="my-4 border-[#2d2d44]" />;
          },
          
          strong({children}) {
            return <strong className="font-bold text-white">{children}</strong>;
          },
          
          em({children}) {
            return <em className="italic text-gray-300">{children}</em>;
          },
          
          img({src, alt}) {
            return (
              <img 
                src={src} 
                alt={alt}
                className="max-w-full h-auto rounded-lg my-3 border border-[#2d2d44]"
                loading="lazy"
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MessageRenderer;
