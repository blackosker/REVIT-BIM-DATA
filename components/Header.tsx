
import React from 'react';

const BuildingIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16" />
    <path d="M6 18V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
    <path d="M10 18v-4" />
    <path d="M14 18v-4" />
    <path d="M10 10h4" />
    <path d="M10 6h4" />
  </svg>
);

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <BuildingIcon />
        <div>
          <h1 className="text-xl font-bold text-cyan-400 tracking-wider">BIM Data Generator</h1>
          <p className="text-sm text-gray-400">Natural Language to Revit JSON</p>
        </div>
      </div>
    </header>
  );
};
