import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BrainCircuit, User, Loader2, Maximize2, Minimize2, Trash2, Bot, MessageSquare } from 'lucide-react';
import { FinancialData } from '../types';
import { getFinancialInsights } from '../services/geminiService';

interface AIChatProps {
  data: FinancialData;
}

const AIChat: React.FC<AIChatProps> = ({ data }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: Date }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessage = { role: 'user' as const, content: userMessage, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      console.log('[AI Chat] Sending request to backend...');
      const response = await getFinancialInsights(data, userMessage);
      console.log('[AI Chat] ✓ Response received from backend');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response || "I'm sorry, I couldn't process that request.",
        timestamp: new Date()
      }]);
    } catch (error: any) {
      console.error('[AI Chat] ✗ Error:', error);

      // Determine error type and provide helpful message
      let errorMessage = "I'm having trouble processing your request. ";

      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        errorMessage += "The AI backend server may not be running. Please make sure to start it with 'npm run server'.";
      } else if (error.message?.includes('Backend request failed')) {
        errorMessage += "There was an issue connecting to the AI service. " + error.message;
      } else {
        errorMessage += error.message || "An unexpected error occurred. Please try again.";
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (messages.length > 0 && window.confirm('Clear all messages?')) {
      setMessages([]);
    }
  };

  return (
    <div className={`flex flex-col glass-panel rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-200/50 dark:border-slate-800/50 transition-all duration-500 ease-in-out bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl overflow-hidden ${isExpanded ? 'h-[85vh] mt-2' : 'h-[650px]'} relative group/chat`}>
      {/* AI Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl opacity-0 group-hover/chat:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>

      {/* Premium Header */}
      <div className="px-6 py-5 md:px-10 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center relative overflow-hidden group min-h-[90px] md:min-h-[120px]">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-transparent to-purple-600/10 transition-opacity duration-500"></div>

        <div className="flex items-center gap-4 md:gap-6 relative z-10 shrink-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 md:w-16 md:h-16 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Bot className="w-6 h-6 md:w-9 md:h-9 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm"></div>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base md:text-2xl text-slate-900 dark:text-white font-heading tracking-tight flex items-center gap-2 md:gap-3">
              <span className="truncate">Nexile AI Analyst</span>
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            </h3>
            <div className="flex items-center gap-2 mt-0.5 md:mt-1">
              <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 md:px-2 py-0.5 rounded shrink-0">Live</span>
              <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Intelligence Core Active</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed group/btn"
            title="Clear Chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-indigo-500"
          >
            {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
              <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-[2rem] flex items-center justify-center shadow-glass relative border border-slate-100 dark:border-slate-700">
                <BrainCircuit className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-2xl text-slate-900 dark:text-white font-heading">How can I help you today?</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                I'm your dedicated financial analyst. I can help analyze your profits, forecast expenses, and optimize your business strategy.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 w-full animate-in slide-in-from-bottom-4 duration-700 delay-300">
              {[
                { q: "Which project was most profitable?", icon: "💰" },
                { q: "Analyze our expense trends this month", icon: "📊" },
                { q: "What's our projected cash flow?", icon: "📈" }
              ].map(item => (
                <button
                  key={item.q}
                  onClick={() => setInput(item.q)}
                  className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl transition-all hover:shadow-lg hover:shadow-indigo-500/10 text-left"
                >
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{item.q}</span>
                  <span className="text-lg opacity-50 group-hover:opacity-100 transition-opacity">{item.icon}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-4 md:gap-6 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${m.role === 'user'
              ? 'bg-indigo-600 shadow-indigo-500/30'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-slate-200/50'
              }`}>
              {m.role === 'user' ? <User className="w-5 h-5 md:w-6 md:h-6 text-white" /> : <Bot className="w-5 h-5 md:w-6 md:h-6 text-indigo-600" />}
            </div>
            <div className={`max-w-[85%] md:max-w-[75%] p-5 md:p-6 rounded-[2rem] relative group ${m.role === 'user'
              ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-100 dark:shadow-none'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm'
              }`}>
              <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                {m.content}
              </div>
              <div className={`mt-3 text-[10px] font-bold uppercase tracking-wider opacity-40 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 animate-bounce" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] rounded-tl-none border border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Input Bar */}
      <div className="p-6 md:p-10 pt-0 relative">
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-900 to-transparent -translate-y-full pointer-events-none"></div>

        <div className="relative group/input flex items-center">
          <div className="absolute left-6 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors pointer-events-none uppercase text-[10px] font-black tracking-widest hidden md:block">
            CHAT
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your business..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl md:rounded-[2.5rem] pl-6 md:pl-20 pr-16 py-6 md:py-8 text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all font-medium text-base md:text-lg shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`absolute right-4 md:right-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl transition-all shadow-lg flex items-center justify-center ${input.trim() && !isLoading ? 'shadow-indigo-500/40 hover:-translate-y-1 active:scale-95' : 'opacity-50'
              }`}
          >
            <Send className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center gap-8 mt-6">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
            NexileIntelliFin AI v2.0
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black hidden md:block">
            Powered by Multi-Token Fallback Cluster
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
