
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PromptInput } from './components/PromptInput';
import { JsonViewer } from './components/JsonViewer';
import { Footer } from './components/Footer';
import { GenerationStatus } from './components/GenerationStatus';
import { generateBimJson, repairBimJson } from './services/geminiService';
import { validateBimData } from './services/validationService';
import { GoldenPrompts } from './components/GoldenPrompts';

// Define an interface for the quality assurance checks
export interface QaCheck {
  check_type: string;
  description: string;
  element_ids?: string[];
  expected_m?: number;
  actual_m?: number;
  pass: boolean;
}

// Define an interface for the expected JSON structure
export interface BimData {
  schema_version: string;
  qa_checks: QaCheck[];
  status: 'ok' | 'needs_clarification' | 'error' | 'needs_confirmation';
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
  assumptions?: string[];
  project_info: any;
  elements: any;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('Crea una sala de conferencias circular con un diámetro de 10 metros.');
  const [bimData, setBimData] = useState<BimData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null); // For API/network errors
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const [repairAttempted, setRepairAttempted] = useState<boolean>(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setLoadingMessage('Generando modelo geométrico...');
    setError(null);
    setBimData(null);
    setValidationErrors(null);
    setRepairAttempted(false);

    try {
      // Step 1: Initial Generation
      const initialResult = await generateBimJson(prompt);
      if (!initialResult) {
        throw new Error('La API devolvió una respuesta vacía en la generación inicial.');
      }

      let parsedJson = JSON.parse(initialResult) as BimData;
      let validationResults = validateBimData(parsedJson);

      // Step 2: If client-side validation fails, attempt a single repair
      if (validationResults.length > 0 && parsedJson.status !== 'error') {
        setLoadingMessage('Validación fallida. Intentando corrección automática...');
        setRepairAttempted(true);
        console.warn("Validation failed, attempting auto-repair.", validationResults);

        const repairedResult = await repairBimJson(initialResult, validationResults);

        if (repairedResult) {
          const repairedJson = JSON.parse(repairedResult) as BimData;
          const newValidationResults = validateBimData(repairedJson);
          
          setBimData(repairedJson); // Show the repaired JSON regardless of success
          
          if (newValidationResults.length === 0) {
            console.log("Auto-repair successful!");
            setValidationErrors(null);
          } else {
            console.warn("Repaired JSON still has validation errors.", newValidationResults);
            setValidationErrors(newValidationResults);
          }
        } else {
          console.error("Repair attempt returned empty response. Showing original errors.");
          setBimData(parsedJson);
          setValidationErrors(validationResults);
        }
      } else {
        // Initial generation was valid or had a model-reported error.
        setBimData(parsedJson);
        setValidationErrors(validationResults.length > 0 ? validationResults : null);
      }
    } catch (err) {
      console.error(err);
      let detailedMessage = 'An unknown error occurred.';
      if (err instanceof Error) {
        if (err.message.includes("API key not valid")) {
          detailedMessage = "La clave de API no es válida. Por favor, verifica tu configuración.";
        } else if (err.message.includes("429")) {
          detailedMessage = "Límite de peticiones excedido. Por favor, espera un momento antes de volver a intentarlo.";
        } else if (err.message.includes("500") || err.message.includes("503")) {
          detailedMessage = "Ocurrió un error en el servidor de la API. Por favor, inténtalo de nuevo más tarde.";
        } else {
          detailedMessage = err.message;
        }
      }
      setError(`Fallo al generar datos BIM. ${detailedMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [prompt, isLoading]);

  const jsonString = bimData ? JSON.stringify(bimData, null, 2) : '';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        <div className="md:w-1/3 flex flex-col gap-6">
          <PromptInput
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleGenerate}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
          />
          <GoldenPrompts onSelectPrompt={(p) => setPrompt(p)} />
        </div>
        <div className="md:w-2/3 flex flex-col">
           {(bimData || validationErrors) && (
            <GenerationStatus 
              status={bimData?.status}
              qaChecks={bimData?.qa_checks}
              errors={bimData?.errors}
              warnings={bimData?.warnings}
              suggestions={bimData?.suggestions}
              assumptions={bimData?.assumptions}
              validationErrors={validationErrors}
              repairAttempted={repairAttempted}
            />
          )}
          <JsonViewer
            jsonString={jsonString}
            isLoading={isLoading}
            error={error}
            loadingMessage={loadingMessage}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
