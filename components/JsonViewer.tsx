
import React, { useState, useEffect } from 'react';

interface JsonViewerProps {
  jsonString: string;
  isLoading: boolean;
  error: string | null;
  loadingMessage: string;
}

const CopyIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

export const JsonViewer: React.FC<JsonViewerProps> = ({ jsonString, isLoading, error, loadingMessage }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    if (jsonString) {
      navigator.clipboard.writeText(jsonString);
      setCopied(true);
    }
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <svg className="animate-spin h-8 w-8 text-cyan-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p>{loadingMessage || 'Generando modelo geométrico...'}</p>
        </div>
      );
    }
    
    if (error) {
        return (
            <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-lg h-full">
                <h3 className="font-bold mb-2">Error</h3>
                <p className="text-sm">{error}</p>
            </div>
        )
    }

    if (jsonString) {
      return (
          <pre className="h-full overflow-auto p-4 text-sm bg-gray-900/70 rounded-b-lg">
            <code>{jsonString}</code>
          </pre>
      );
    }
    
    return (
        <div className="flex items-center justify-center h-full text-gray-500">
            <p>Los datos JSON para Revit aparecerán aquí.</p>
        </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col flex-grow">
      <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-t-lg border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-300">Salida de Datos BIM (JSON)</h2>
        {jsonString && (
          <button onClick={handleCopy} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-gray-200 px-3 py-1.5 rounded-md text-sm transition-colors">
            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        )}
      </div>
      <div className="flex-grow p-1">
          {renderContent()}
      </div>
    </div>
  );
};
