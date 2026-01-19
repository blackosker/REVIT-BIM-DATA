
import React from 'react';

interface GoldenPromptsProps {
    onSelectPrompt: (prompt: string) => void;
}

const prompts = [
    {
        name: "Habitación Rectangular Simple",
        prompt: "Crea una habitación rectangular de 6x4 metros. La altura de los muros es de 2.7 metros. Los muros exteriores son de 20cm y los interiores de 10cm. Las dimensiones dadas son a caras interiores."
    },
    {
        name: "Habitación en Forma de L",
        prompt: "Diseña una habitación en forma de L. El lado largo mide 8 metros, el corto 5 metros. El ancho de cada ala de la L es de 3 metros. La altura es de 3 metros y los muros son de 20cm."
    },
    {
        name: "Dos Habitaciones Adyacentes",
        prompt: "Genera dos habitaciones, una al lado de la otra. La Habitación 1 es de 4x4m. La Habitación 2 es de 3x4m. Comparten un muro interior de 4m de largo y 10cm de espesor. Los muros exteriores son de 20cm. Altura total 2.5m."
    },
    {
        name: "Pasillo Conectando Dos Espacios",
        prompt: "Crea un pasillo de 1.5m de ancho y 7m de largo. Conecta dos habitaciones en sus extremos, cada una de 5x5m. El pasillo y las habitaciones tienen una altura de 2.8m."
    },
    {
        name: "Habitación con Puerta",
        prompt: "Una oficina de 5x5 metros con muros de 3m de alto y 15cm de espesor. Coloca una puerta de 90cm de ancho y 2.1m de alto en el centro de uno de los muros."
    },
    {
        name: "Layout Complejo (Oficina Pequeña)",
        prompt: "Diseña una oficina que consiste en un área de recepción de 4x3m y una oficina privada adyacente de 4x4m. Deben compartir un muro. La oficina privada tiene una puerta que da a la recepción. La recepción tiene una puerta de entrada principal en el muro opuesto."
    },
     {
        name: "Caso de Aclaración (Curvo)",
        prompt: "Quiero un auditorio con un muro trasero curvo."
    }
];

export const GoldenPrompts: React.FC<GoldenPromptsProps> = ({ onSelectPrompt }) => {
    return (
        <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-300 mb-3">Casos de Prueba / Ejemplos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {prompts.map((item, index) => (
                    <button
                        key={index}
                        onClick={() => onSelectPrompt(item.prompt)}
                        className="text-left text-sm bg-gray-700/50 hover:bg-gray-700/80 text-cyan-300 font-medium py-2 px-3 rounded-md transition-colors duration-200"
                        title={item.prompt}
                    >
                        {item.name}
                    </button>
                ))}
            </div>
        </div>
    );
};
