
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Eres un Arquitecto Computacional experto y un generador de datos API para Autodesk Revit. Tu único objetivo es interpretar descripciones en lenguaje natural de espacios arquitectónicos y convertirlos en un objeto JSON estructurado y válido que un script de Python pueda leer para generar geometría BIM. Tu salida DEBE conformarse al esquema JSON proporcionado.

### REGLAS DE ORO DE LÓGICA Y GEOMETRÍA:
1.  **Proceso de Generación en Dos Pasos (CRÍTICO)**: Tu proceso mental debe seguir estos dos pasos obligatorios:
    -   **Paso A: Definir Límites Interiores Claros**: Primero, para cada habitación, define el array \`clear_boundary_points\`. Este es un bucle cerrado de puntos [x,y,z] en el plano z=0 que representa EXACTAMENTE las dimensiones interiores libres solicitadas por el usuario.
    -   **Paso B: Derivar Geometría de Muros**: Segundo, y solo después de definir los límites claros, genera los \`wall_segments\`. La ubicación de cada muro se calcula a partir de los \`clear_boundary_points\`. Para un muro interior (compartido), su \`geometry_reference\` se encuentra exactamente a mitad de camino entre los dos \`clear_boundary_points\` paralelos de las habitaciones adyacentes.
2.  **Regla del Muro Compartido / Adyacencia (CRÍTICO)**: Si dos habitaciones comparten un muro, DEBES crear **un único** \`wall_segment\` para ese tabique. Ambas habitaciones DEBEN entonces referenciar el ID de este segmento único. Está estrictamente **PROHIBIDO** crear dos segmentos de muro superpuestos o duplicados para representar una única partición interior.
3.  **Contornos de Habitación**: La lista \`boundary_segments\` para cada habitación debe estar ordenada para formar un bucle cerrado y contiguo en sentido antihorario (CCW). Usa el flag \`is_reversed: true\` si es necesario.
4.  **IDs**: Asigna IDs únicos y secuenciales a cada elemento (ej. 'R1', 'WS1', 'F1').
5.  **Coordenadas**: Redondea todos los valores flotantes a la \`precision\` definida.
6.  **Modo Estricto y Sugerencias**: Por defecto, \`project_info.strict_mode\` es \`true\`. En este modo, está **PROHIBIDO** generar elementos (puertas, ventanas, suelos) que no sean explícitamente solicitados en el prompt. Si crees que un elemento es implícito pero no explícito (ej. un suelo para una habitación cerrada), NO lo generes. En su lugar, añade una descripción de tu sugerencia al array raíz \`suggestions\` y establece el \`status\` global a \`'needs_confirmation'\`.

### REGLAS DE INTERPRETACIÓN DE LENGUAJE NATURAL (PLANTILLAS):
1.  **"una al lado de la otra"**: A menos que se especifique una orientación (ej. "una al norte de la otra"), esta frase implica adyacencia a lo largo del eje X positivo. La primera habitación mencionada se coloca a la izquierda (menores coordenadas X).
2.  **"comparten un muro de L metros"**: La longitud explícita del muro compartido (\`L\`) tiene prioridad. Si las profundidades de las habitaciones especificadas no coinciden con esta longitud, DEBES establecer el \`status\` en \`'needs_clarification'\` y preguntar cuál dimensión debe ser ajustada. No asumas ni corrijas la discrepancia.

### GEOMETRY QA CHECKS (MANDATORY BEFORE OUTPUT):
Antes de finalizar y emitir el JSON, DEBES realizar las siguientes validaciones internas y reportar cada una en el array \`qa_checks\`.
1.  **Conservación de Dimensiones Libres**: Para cada dimensión clave solicitada por el usuario (ej: "habitación de 4x5m"), crea un check. Calcula el \`actual_m\` midiendo la distancia entre los puntos correspondientes en \`clear_boundary_points\`. Compara con el \`expected_m\` del prompt. El check pasa si están dentro de \`tolerance_m\`.
2.  **Suma de Dimensiones Compuestas**: Para habitaciones adyacentes, verifica la dimensión total. Por ejemplo, \`expected_m\` sería \`ancho_hab1 + espesor_muro + ancho_hab2\`. El \`actual_m\` es la distancia total entre las caras exteriores de los \`clear_boundary_points\`. El check pasa si están dentro de tolerancia.
3.  **Integridad de Bucles**: Para cada habitación (\`clear_boundary_points\` y \`boundary_segments\`) y cada suelo (\`boundary_loops\`), verifica que el bucle esté cerrado (punto inicial == punto final) y no se auto-intersecte.

### POLÍTICA DE ESTATUS FINAL (CRÍTICO):
-   El \`status\` global solo puede ser **"ok"** si **TODOS** los chequeos en el array \`qa_checks\` tienen **"pass": true**.
-   Si **UN SOLO** chequeo tiene **"pass": false**, el \`status\` global **DEBE** ser **"error"** y debes añadir un mensaje descriptivo al array \`errors\`.
-   Usa **"needs_clarification"** si el prompt es ambiguo o viola las \`generation_constraints\`. Usa **"needs_confirmation"** si has añadido sugerencias.
-   **NO intentes "arreglar" la geometría inválida; tu trabajo es reportarla.**`;

const baseParametersSchema = {
    type: Type.OBJECT,
    description: "Parámetros BIM clave-valor para este elemento.",
    properties: {
        Mark: { type: Type.STRING, description: "Identificador único de instancia (ej. W-01, D-01)." },
        Comments: { type: Type.STRING, description: "Comentarios sobre el elemento." }
    }
};

const wallParametersSchema = {
    type: Type.OBJECT,
    description: "Parámetros BIM clave-valor para este elemento.",
    properties: {
        Mark: { type: Type.STRING, description: "Identificador único de instancia (ej. W-01)." },
        Comments: { type: Type.STRING, description: "Comentarios sobre el elemento." },
        RoomBounding: { type: Type.BOOLEAN, description: "Indica si el muro delimita habitaciones." }
    }
};

const qaCheckSchema = {
    type: Type.OBJECT,
    description: "Un chequeo de validación geométrica interna.",
    properties: {
        check_type: { type: Type.STRING, description: "'DimensionConservation', 'CompositeDimension', 'LoopIntegrity', 'Adjacency'" },
        description: { type: Type.STRING, description: "Descripción legible del chequeo." },
        element_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs de los elementos involucrados." },
        expected_m: { type: Type.NUMBER, description: "El valor dimensional esperado según el prompt." },
        actual_m: { type: Type.NUMBER, description: "El valor dimensional medido en la geometría generada." },
        pass: { type: Type.BOOLEAN, description: "True si el chequeo pasó, false si falló." }
    },
    required: ['check_type', 'description', 'pass']
};

const bimSchema = {
    type: Type.OBJECT,
    properties: {
        schema_version: { type: Type.STRING },
        qa_checks: {
            type: Type.ARRAY,
            description: "Resultados de las validaciones geométricas internas realizadas por el modelo.",
            items: qaCheckSchema
        },
        status: { type: Type.STRING, description: "Puede ser 'ok', 'needs_clarification', 'needs_confirmation', o 'error'. Solo 'ok' si todos los qa_checks pasaron." },
        errors: { type: Type.ARRAY, items: { type: Type.STRING } },
        warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        suggestions: {
            type: Type.ARRAY,
            description: "Sugerencias de elementos implícitos que el modelo puede añadir si el usuario confirma.",
            items: { type: Type.STRING }
        },
        project_info: {
            type: Type.OBJECT,
            properties: {
                description: { type: Type.STRING },
                base_level_name: { type: Type.STRING },
                units: { type: Type.STRING },
                tolerance_m: { type: Type.NUMBER },
                precision: { type: Type.INTEGER },
                strict_mode: { type: Type.BOOLEAN, description: "Si es true, no se deben generar elementos no solicitados explícitamente." },
                dimension_reference: { type: Type.STRING, description: "Define qué miden las dimensiones del prompt. 'InteriorClear', 'Centerline', 'ExteriorBoundary'" },
                geometry_reference: { type: Type.STRING, description: "Línea de referencia para la geometría del muro. 'WallCenterline', 'FinishFaceInterior', 'FinishFaceExterior'" },
                axis_convention: { type: Type.STRING, description: "Convención de ejes usada. Debería ser 'X=East, Y=North, Z=Up'." },
                project_north_angle_deg: { type: Type.NUMBER, description: "Ángulo en grados desde el eje Y positivo (Norte del Proyecto) hacia el Norte Real. Opcional." },
                rotation_deg: { type: Type.NUMBER, description: "Rotación global del layout en grados alrededor del origen. Opcional." },
                origin_mode: { type: Type.STRING, description: "'auto' si el origen es asumido, 'user_defined' si fue especificado." },
                generation_constraints: {
                    type: Type.OBJECT,
                    properties: {
                        orthogonal_only: { type: Type.BOOLEAN },
                        supported_shapes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        max_segments_per_loop: { type: Type.INTEGER },
                        min_wall_length_m: { type: Type.NUMBER },
                    },
                    required: ['orthogonal_only', 'supported_shapes', 'max_segments_per_loop', 'min_wall_length_m']
                }
            },
            required: ['description', 'base_level_name', 'units', 'dimension_reference', 'geometry_reference', 'axis_convention', 'origin_mode', 'generation_constraints']
        },
        elements: {
            type: Type.OBJECT,
            properties: {
                rooms: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            number: { type: Type.STRING },
                            location_point: { type: Type.ARRAY, items: { type: Type.NUMBER }, description:"Array [x,y,z]" },
                            clear_boundary_points: {
                                type: Type.ARRAY,
                                description: "Bucle cerrado de puntos [x,y,z] que define el contorno interior claro de la habitación en z=0.",
                                items: {
                                    type: Type.ARRAY,
                                    items: { type: Type.NUMBER }
                                }
                            },
                            base_level_name: { type: Type.STRING },
                            boundary_segments: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        segment_id: { type: Type.STRING },
                                        is_reversed: { type: Type.BOOLEAN }
                                    },
                                    required: ['segment_id', 'is_reversed']
                                }
                            },
                            parameters: baseParametersSchema
                        },
                        required: ['id', 'name', 'number', 'location_point', 'clear_boundary_points', 'base_level_name', 'boundary_segments']
                    }
                },
                wall_segments: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            start_point: { type: Type.ARRAY, items: { type: Type.NUMBER }, description:"Array [x,y,z]" },
                            end_point: { type: Type.ARRAY, items: { type: Type.NUMBER }, description:"Array [x,y,z]" },
                            height: { type: Type.NUMBER },
                            thickness_m: { type: Type.NUMBER },
                            function: { type: Type.STRING, description: "'Exterior' o 'Interior'" },
                            fire_rating_min: { type: Type.NUMBER, description: "Clasificación de resistencia al fuego en minutos. Opcional." },
                            base_level_name: { type: Type.STRING },
                            base_offset_m: { type: Type.NUMBER },
                            top_constraint: { type: Type.STRING },
                            parameters: wallParametersSchema
                        },
                        required: ['id', 'start_point', 'end_point', 'height', 'thickness_m', 'function', 'base_level_name']
                    }
                },
                floors: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            room_id: { type: Type.STRING },
                            boundary_loops: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        points: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } }, description:"Array de puntos [[x,y,z], ...]" },
                                        winding: { type: Type.STRING, description: "'CCW' o 'CW'" },
                                        closed: { type: Type.BOOLEAN }
                                    },
                                    required: ['points', 'winding', 'closed']
                                }
                            },
                            type: { type: Type.STRING },
                            base_level_name: { type: Type.STRING },
                            base_offset_m: { type: Type.NUMBER },
                            parameters: baseParametersSchema
                        },
                        required: ['id', 'boundary_loops', 'type', 'base_level_name']
                    }
                },
                doors: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            host_wall_segment_id: { type: Type.STRING },
                            offset_from_start_m: { type: Type.NUMBER },
                            width_m: { type: Type.NUMBER },
                            height_m: { type: Type.NUMBER },
                            type: { type: Type.STRING },
                            base_level_name: { type: Type.STRING },
                            base_offset_m: { type: Type.NUMBER },
                            parameters: baseParametersSchema
                        },
                        required: ['id', 'host_wall_segment_id', 'offset_from_start_m', 'width_m', 'height_m', 'type', 'base_level_name']
                    }
                },
                windows: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            host_wall_segment_id: { type: Type.STRING },
                            offset_from_start_m: { type: Type.NUMBER },
                            width_m: { type: Type.NUMBER },
                            height_m: { type: Type.NUMBER },
                            sill_height_m: { type: Type.NUMBER },
                            type: { type: Type.STRING },
                            base_level_name: { type: Type.STRING },
                            parameters: baseParametersSchema
                        },
                        required: ['id', 'host_wall_segment_id', 'offset_from_start_m', 'width_m', 'height_m', 'sill_height_m', 'type', 'base_level_name']
                    }
                },
            }
        }
    },
    required: ['schema_version', 'qa_checks', 'status', 'project_info', 'elements']
};

const getAi = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateBimJson = async (userPrompt: string): Promise<string | undefined> => {
  const ai = getAi();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: bimSchema,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API for generation:", error);
    throw new Error("Failed to communicate with the Gemini API during generation.");
  }
};


const REPAIR_INSTRUCTION = `Eres un asistente experto en depuración de datos BIM. Tu única tarea es corregir el objeto JSON proporcionado para resolver la lista de errores geométricos o de esquema. NO debes alterar la intención de diseño original. Tu respuesta debe ser únicamente el objeto JSON corregido, sin texto conversacional y adhiriéndose estrictamente al esquema original.`;

export const repairBimJson = async (faultyJson: string, errors: string[]): Promise<string | undefined> => {
    const ai = getAi();
    const repairPrompt = `Por favor, corrige el siguiente JSON para solucionar estos errores:
ERRORES DETECTADOS:
- ${errors.join('\n- ')}

JSON A CORREGIR:
\`\`\`json
${faultyJson}
\`\`\`
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: repairPrompt,
            config: {
                systemInstruction: REPAIR_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: bimSchema, 
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for repair:", error);
        throw new Error("Failed to communicate with the Gemini API during repair.");
    }
};
