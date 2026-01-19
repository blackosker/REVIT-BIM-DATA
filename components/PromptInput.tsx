
import React from 'react';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  loadingMessage: string;
}

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const PromptInput: React.FC<PromptInputProps> = ({ prompt, setPrompt, onSubmit, isLoading, loadingMessage }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg flex flex-col h-full">
      <h2 className="text-lg font-semibold text-gray-300 mb-3">Describe el Espacio Arquitectónico</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ej: Una habitación rectangular de 10x15 metros con muros de 3 metros..."
        className="flex-grow w-full bg-gray-900/50 border border-gray-700 rounded-md p-3 text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none transition-colors duration-200"
        rows={10}
        disabled={isLoading}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !prompt.trim()}
        className="mt-4 w-full flex items-center justify-center bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform active:scale-95 shadow-md"
      >
        {isLoading ? (
          <>
            <LoadingSpinner />
            {loadingMessage || 'Generando...'}
          </>
        ) : (
          'Generar Datos BIM'
        )}
      </button>
    </div>
  );
};
