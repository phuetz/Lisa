/**
 * Typing Indicator Component
 * Animation des 3 points pendant que l'assistant tape
 */

export const TypingIndicator = () => {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg flex-shrink-0">
        🤖
      </div>
      
      <div className="flex items-center gap-1 px-4 py-3 bg-[#2a2a2a] rounded-xl">
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
          style={{ animationDelay: '150ms', animationDuration: '1s' }}
        />
        <div 
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
          style={{ animationDelay: '300ms', animationDuration: '1s' }}
        />
      </div>
    </div>
  );
};

export default TypingIndicator;
