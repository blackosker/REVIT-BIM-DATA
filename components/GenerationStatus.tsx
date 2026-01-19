
import React from 'react';
import type { QaCheck } from '../App';

interface GenerationStatusProps {
  status?: 'ok' | 'needs_clarification' | 'error' | 'needs_confirmation';
  qaChecks?: QaCheck[];
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
  assumptions?: string[];
  validationErrors?: string[] | null;
  repairAttempted?: boolean;
}

// --- Icon Components ---
const InfoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const WarningIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const ErrorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ShieldErrorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2L3 7v6c0 5 4 9 9 9s9-4 9-9V7l-9-5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l-6 6M9 9l6 6" />
    </svg>
);
const GearIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const CheckCircleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const XCircleIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ConfirmationIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);


// --- Reusable Block Components ---
const StatusBlock: React.FC<{ title: string; items: string[]; type: 'error' | 'warning' | 'info' | 'confirmation'; icon: React.ReactNode }> = ({ title, items, type, icon }) => {
    if (!items || items.length === 0) return null;
    
    const colors = {
        error: 'bg-red-900/30 border-red-500/50 text-red-300',
        warning: 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300',
        info: 'bg-blue-900/30 border-blue-500/50 text-gray-300',
        confirmation: 'bg-purple-900/30 border-purple-500/50 text-purple-300'
    };

    return (
        <div className={`p-3 rounded-md border ${colors[type]}`}>
            <h3 className="font-semibold flex items-center text-sm">
                {icon}
                {title}
            </h3>
            <ul className="list-disc list-inside pl-3 mt-1 text-xs space-y-1">
                {items.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
    );
}

const QaChecksBlock: React.FC<{ qaChecks: QaCheck[] }> = ({ qaChecks }) => {
    if (!qaChecks || qaChecks.length === 0) return null;

    const allPassed = qaChecks.every(c => c.pass);
    const borderColor = allPassed ? 'border-green-500/50' : 'border-red-500/50';
    const bgColor = allPassed ? 'bg-green-900/20' : 'bg-red-900/20';
    const textColor = allPassed ? 'text-green-300' : 'text-red-300';
    
    return (
        <div className={`p-3 rounded-md border ${borderColor} ${bgColor}`}>
            <h3 className={`font-semibold flex items-center text-sm ${textColor}`}>
                <GearIcon />
                Resultados de Quality Assurance Geométrico
            </h3>
            <ul className="mt-2 text-xs space-y-1 text-gray-300">
                {qaChecks.map((check, index) => (
                    <li key={index} className="flex items-start">
                        {check.pass ? <CheckCircleIcon /> : <XCircleIcon />}
                        <div>
                            <span>{check.description}</span>
                            {check.expected_m !== undefined && check.actual_m !== undefined && (
                                <span className="ml-2 text-gray-400 font-mono">
                                    (esperado: {check.expected_m.toFixed(3)}m, real: {check.actual_m.toFixed(3)}m)
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const GenerationStatus: React.FC<GenerationStatusProps> = ({ status, qaChecks, errors, warnings, assumptions, validationErrors, suggestions, repairAttempted }) => {
    const hasContent = (qaChecks && qaChecks.length > 0) ||
                       (errors && errors.length > 0) || 
                       (warnings && warnings.length > 0) || 
                       (suggestions && suggestions.length > 0) ||
                       (assumptions && assumptions.length > 0) ||
                       (validationErrors && validationErrors.length > 0);

    if (!hasContent) {
        return null;
    }
    
    const validationErrorTitle = repairAttempted && validationErrors && validationErrors.length > 0 
        ? "Errores Tras Intento de Auto-Corrección"
        : "Errores de Validación del Cliente";


    return (
        <div className="space-y-3 mb-4">
            <QaChecksBlock qaChecks={qaChecks!} />
            <StatusBlock title={validationErrorTitle} items={validationErrors!} type="error" icon={<ShieldErrorIcon />} />
            <StatusBlock title="Errores Reportados por el Modelo" items={errors!} type="error" icon={<ErrorIcon />} />
            <StatusBlock title="Sugerencias / Requiere Confirmación" items={suggestions!} type="confirmation" icon={<ConfirmationIcon />} />
            <StatusBlock title="Advertencias / Necesita Clarificación" items={warnings!} type="warning" icon={<WarningIcon />} />
            <StatusBlock title="Asunciones Realizadas" items={assumptions!} type="info" icon={<InfoIcon />} />
        </div>
    );
};
