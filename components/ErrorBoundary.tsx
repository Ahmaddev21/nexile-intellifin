
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
                    <div className="bg-slate-800 p-8 rounded-3xl border border-rose-500/30 max-w-lg w-full shadow-2xl">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                        <p className="text-slate-400 mb-6">The application encountered a critical error properly starting.</p>

                        <div className="bg-black/50 p-4 rounded-xl text-left overflow-auto max-h-48 mb-6 border border-white/10">
                            <code className="text-rose-400 text-sm font-mono block">
                                {this.state.error && this.state.error.toString()}
                            </code>
                            {this.state.error?.message?.includes('Supabase') && (
                                <div className="mt-4 pt-4 border-t border-rose-500/20">
                                    <p className="text-amber-400 text-xs uppercase font-bold tracking-wider mb-2">Likely Fix:</p>
                                    <p className="text-slate-300 text-sm">
                                        You are missing environment variables. Please add <code className="text-white bg-white/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="text-white bg-white/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your Vercel/Netlify deployment settings.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
