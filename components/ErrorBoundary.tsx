import React from 'react';
import { AlertCircle } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.';
    return { hasError: true, errorMessage: message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="flex flex-col items-center p-8 bg-red-50 rounded-3xl border-2 border-red-100 text-center max-w-md w-full">
            <AlertCircle size={48} className="text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">Aduh, ada yang rusak!</h2>
            <p className="text-gray-600 mb-4">{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-500 text-white rounded-full font-bold hover:bg-red-600 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
