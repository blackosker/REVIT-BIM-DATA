
import type { BimData } from '../App';

type Point = [number, number, number];

interface GenerationConstraints {
    orthogonal_only: boolean;
    max_segments_per_loop: number;
    min_wall_length_m: number;
}

interface WallSegment {
    id: string;
    start_point: Point;
    end_point: Point;
    height: number;
    function: 'Exterior' | 'Interior';
    fire_rating_min?: number;
    parameters?: { [key: string]: any };
}

interface BoundarySegmentRef {
    segment_id: string;
    is_reversed: boolean;
}

interface Room {
    id: string;
    clear_boundary_points: Point[];
    boundary_segments: BoundarySegmentRef[];
    parameters?: { [key: string]: any };
}

interface FloorLoop {
    points: Point[];
}

interface Floor {
    id: string;
    boundary_loops: FloorLoop[];
    parameters?: { [key: string]: any };
}

interface Door {
    id: string;
    parameters?: { [key: string]: any };
}

interface Window {
    id: string;
    parameters?: { [key: string]: any };
}


// --- Helper Functions ---

const distance = (p1: Point, p2: Point): number => {
    return Math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2 + (p1[2] - p2[2])**2);
}

const distanceSq = (p1: Point, p2: Point): number => {
    return (p1[0] - p2[0])**2 + (p1[1] - p2[1])**2 + (p1[2] - p2[2])**2;
}

const pointsAreEqual = (p1: Point, p2: Point, tolerance: number): boolean => {
    return distanceSq(p1, p2) < tolerance**2;
}

// Check for line segment intersection (2D)
const onSegment = (p: Point, q: Point, r: Point): boolean => {
    return (
        q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) &&
        q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1])
    );
};

const orientation = (p: Point, q: Point, r: Point): number => {
    const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    if (Math.abs(val) < 1e-10) return 0; // Collinear
    return (val > 0) ? 1 : 2; // Clockwise or Counter-clockwise
};

const segmentsIntersect = (p1: Point, q1: Point, p2: Point, q2: Point): boolean => {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) {
        return true;
    }
    // Collinear cases are complex and often handled by topology guarantees
    return false;
};

// --- Validation Functions ---
const validateQaChecks = (data: BimData): string[] => {
    const errors: string[] = [];
    if (!data.qa_checks || !Array.isArray(data.qa_checks)) {
        // This check might be redundant if the schema is enforced, but good for safety.
        errors.push("El campo raíz 'qa_checks' es obligatorio y debe ser un array.");
        return errors;
    }

    const hasFailedChecks = data.qa_checks.some(check => !check.pass);

    if (hasFailedChecks && data.status === 'ok') {
        errors.push(`Error de consistencia: Existen QA checks fallidos pero el 'status' global es 'ok'. El status debería ser 'error'.`);
    }

    data.qa_checks.forEach((check, index) => {
        if (typeof check.pass !== 'boolean') {
            errors.push(`QA Check #${index + 1} ('${check.description}'): el campo 'pass' debe ser un booleano.`);
        }
        if (!check.description || typeof check.description !== 'string') {
            errors.push(`QA Check #${index + 1}: falta 'description' o no es un string.`);
        }
         if (!check.check_type || typeof check.check_type !== 'string') {
            errors.push(`QA Check #${index + 1}: falta 'check_type' o no es un string.`);
        }
    });

    return errors;
};


const validateGenerationConstraints = (constraints: any): string[] => {
    const errors: string[] = [];
    if (!constraints) {
        return ["El objeto 'generation_constraints' no existe en 'project_info'."];
    }
    if (typeof constraints.orthogonal_only !== 'boolean') {
        errors.push(`'orthogonal_only' debe ser un booleano.`);
    }
    if (typeof constraints.max_segments_per_loop !== 'number' || !Number.isInteger(constraints.max_segments_per_loop)) {
         errors.push(`'max_segments_per_loop' debe ser un entero.`);
    }
    if (typeof constraints.min_wall_length_m !== 'number') {
        errors.push(`'min_wall_length_m' debe ser un número.`);
    }
    if (!Array.isArray(constraints.supported_shapes)) {
        errors.push(`'supported_shapes' debe ser un array.`);
    }
    return errors;
};


const validateProjectInfo = (projectInfo: any): string[] => {
    const errors: string[] = [];
    if (!projectInfo) {
        return ["El objeto 'project_info' no existe."];
    }
    if (projectInfo.axis_convention !== 'X=East, Y=North, Z=Up') {
        errors.push(`'axis_convention' inválida. Debe ser 'X=East, Y=North, Z=Up', pero se recibió '${projectInfo.axis_convention}'.`);
    }
    if (!['auto', 'user_defined'].includes(projectInfo.origin_mode)) {
        errors.push(`'origin_mode' inválido. Debe ser 'auto' o 'user_defined', pero se recibió '${projectInfo.origin_mode}'.`);
    }
     if (projectInfo.hasOwnProperty('rotation_deg') && typeof projectInfo.rotation_deg !== 'number') {
        errors.push(`'rotation_deg' debe ser un número si existe.`);
    }
    if (projectInfo.hasOwnProperty('project_north_angle_deg') && typeof projectInfo.project_north_angle_deg !== 'number') {
        errors.push(`'project_north_angle_deg' debe ser un número si existe.`);
    }

    const validGeoRefs = ['WallCenterline', 'FinishFaceInterior', 'FinishFaceExterior'];
    if (!projectInfo.geometry_reference || !validGeoRefs.includes(projectInfo.geometry_reference)) {
        errors.push(`'geometry_reference' es obligatorio y debe ser uno de: ${validGeoRefs.join(', ')}.`);
    }

    if (projectInfo.dimension_reference === 'InteriorClear' && projectInfo.geometry_reference !== 'WallCenterline') {
        errors.push(`Conflicto de configuración: Cuando 'dimension_reference' es 'InteriorClear', 'geometry_reference' DEBE ser 'WallCenterline'. Se recibió '${projectInfo.geometry_reference}'.`);
    }
    
    errors.push(...validateGenerationConstraints(projectInfo.generation_constraints));
    return errors;
};

const validateWallSegments = (segments: WallSegment[], constraints: GenerationConstraints, tolerance: number): string[] => {
    const errors: string[] = [];
    segments.forEach(seg => {
        if (seg.hasOwnProperty('parameters') && (seg.parameters === null || typeof seg.parameters !== 'object')) {
            errors.push(`Segmento de Muro [${seg.id}] tiene un objeto 'parameters' inválido.`);
        }
        if (typeof seg.height !== 'number' || seg.height <= 0) {
            errors.push(`Segmento de Muro [${seg.id}] tiene una altura inválida: ${seg.height}. Debe ser > 0.`);
        }
        
        const length = distance(seg.start_point, seg.end_point);
        if (length < constraints.min_wall_length_m) {
             errors.push(`Segmento de Muro [${seg.id}] tiene una longitud (${length.toFixed(3)}m) menor que el mínimo permitido (${constraints.min_wall_length_m}m).`);
        }
        
        if (constraints.orthogonal_only) {
            const isHorizontal = Math.abs(seg.start_point[1] - seg.end_point[1]) < tolerance;
            const isVertical = Math.abs(seg.start_point[0] - seg.end_point[0]) < tolerance;
            if (!isHorizontal && !isVertical) {
                errors.push(`Segmento de Muro [${seg.id}] no es ortogonal, pero 'orthogonal_only' es true.`);
            }
        }

        if (seg.function !== 'Exterior' && seg.function !== 'Interior') {
            errors.push(`Segmento de Muro [${seg.id}] tiene una 'function' inválida: '${seg.function}'. Debe ser 'Exterior' o 'Interior'.`);
        }
        if (seg.hasOwnProperty('fire_rating_min') && (typeof seg.fire_rating_min !== 'number' || seg.fire_rating_min! < 0)) {
            errors.push(`Segmento de Muro [${seg.id}] tiene un 'fire_rating_min' inválido: ${seg.fire_rating_min}. Debe ser un número >= 0.`);
        }
    });
    return errors;
};

const validateRooms = (rooms: Room[], segments: WallSegment[], constraints: GenerationConstraints, tolerance: number): string[] => {
    const errors: string[] = [];
    const segmentMap = new Map(segments.map(s => [s.id, s]));

    for (const room of rooms) {
        // --- Validate new clear_boundary_points ---
        const clearPoints = room.clear_boundary_points;
        if (!clearPoints || !Array.isArray(clearPoints) || clearPoints.length < 4) {
            errors.push(`Habitación [${room.id}] tiene un 'clear_boundary_points' inválido o insuficiente (necesita al menos 4 puntos para un bucle cerrado).`);
        } else {
            const firstZ = clearPoints[0][2];
            if (Math.abs(firstZ) > tolerance) {
                errors.push(`Habitación [${room.id}]: El primer punto de 'clear_boundary_points' no está en z=0 (es ${firstZ}).`);
            }
            if (!clearPoints.every(p => Array.isArray(p) && p.length === 3 && Math.abs(p[2] - firstZ) < tolerance)) {
                errors.push(`Habitación [${room.id}]: Todos los puntos de 'clear_boundary_points' deben ser un array de 3 números y ser coplanares en Z.`);
            }
            const startPoint = clearPoints[0];
            const endPoint = clearPoints[clearPoints.length - 1];
            if (!pointsAreEqual(startPoint, endPoint, tolerance)) {
                errors.push(`Habitación [${room.id}]: El bucle 'clear_boundary_points' no está cerrado.`);
            }
        }

        // --- Validate existing properties ---
        if (room.hasOwnProperty('parameters') && (room.parameters === null || typeof room.parameters !== 'object')) {
            errors.push(`Habitación [${room.id}] tiene un objeto 'parameters' inválido.`);
        }
        if (!room.boundary_segments || room.boundary_segments.length < 2) {
            errors.push(`Habitación [${room.id}] tiene un número insuficiente de segmentos de contorno.`);
            continue;
        }

        if (room.boundary_segments.length > constraints.max_segments_per_loop) {
            errors.push(`Habitación [${room.id}] excede el número máximo de segmentos por bucle (${constraints.max_segments_per_loop}).`);
        }

        const boundaryRefs = room.boundary_segments;
        let currentPoint: Point;
        
        // Initialize with the start point of the first segment
        const firstSegRef = boundaryRefs[0];
        const firstSeg = segmentMap.get(firstSegRef.segment_id);
        if (!firstSeg) {
            errors.push(`Habitación [${room.id}] hace referencia a un ID de segmento de muro inválido: ${firstSegRef.segment_id}.`);
            continue;
        }
        const loopStartPoint = firstSegRef.is_reversed ? firstSeg.end_point : firstSeg.start_point;
        currentPoint = firstSegRef.is_reversed ? firstSeg.start_point : firstSeg.end_point;

        // Iterate through the rest of the segments
        for (let i = 1; i < boundaryRefs.length; i++) {
            const segRef = boundaryRefs[i];
            const segment = segmentMap.get(segRef.segment_id);
            if (!segment) {
                errors.push(`Habitación [${room.id}] hace referencia a un ID de segmento de muro inválido: ${segRef.segment_id}.`);
                continue; // Skip to next room
            }

            const nextStartPoint = segRef.is_reversed ? segment.end_point : segment.start_point;
            if (!pointsAreEqual(currentPoint, nextStartPoint, tolerance)) {
                const prevSegId = boundaryRefs[i-1].segment_id;
                errors.push(`Habitación [${room.id}]: El contorno no es contiguo. El segmento [${prevSegId}] no conecta con [${segRef.segment_id}].`);
            }
            currentPoint = segRef.is_reversed ? segment.start_point : segment.end_point;
        }
        
        // Check if the loop is closed
        if (!pointsAreEqual(currentPoint, loopStartPoint, tolerance)) {
             const lastSegId = boundaryRefs[boundaryRefs.length - 1].segment_id;
             const firstSegId = boundaryRefs[0].segment_id;
             errors.push(`Habitación [${room.id}]: El contorno de muros no está cerrado. El final del segmento [${lastSegId}] no coincide con el inicio de [${firstSegId}].`);
        }
    }
    return errors;
}


const validateFloors = (floors: Floor[], tolerance: number): string[] => {
    const errors: string[] = [];
    floors.forEach(floor => {
        if (floor.hasOwnProperty('parameters') && (floor.parameters === null || typeof floor.parameters !== 'object')) {
            errors.push(`Suelo [${floor.id}] tiene un objeto 'parameters' inválido.`);
        }
        floor.boundary_loops.forEach((loop, loopIndex) => {
            const points = loop.points;
            if (points.length < 4) { // Needs at least 3 vertices + closing point
                 errors.push(`Suelo [${floor.id}], bucle #${loopIndex+1}: El polígono tiene muy pocos puntos para formar un área.`);
                 return;
            }
            const firstZ = points[0][2];
            if (!points.every(p => Math.abs(p[2] - firstZ) < tolerance)) {
                errors.push(`Suelo [${floor.id}], bucle #${loopIndex+1}: Todos los puntos del contorno deben tener la misma coordenada Z.`);
            }
            for (let i = 0; i < points.length - 1; i++) {
                for (let j = i + 2; j < points.length - 1; j++) {
                    if (i === 0 && j === points.length - 2) continue;
                    if (segmentsIntersect(points[i], points[i+1], points[j], points[j+1])) {
                        errors.push(`Suelo [${floor.id}], bucle #${loopIndex+1}: El contorno se auto-intersecta.`);
                        return;
                    }
                }
            }
        });
    });
    return errors;
}

const validateDoors = (doors: Door[]): string[] => {
    const errors: string[] = [];
    doors.forEach(door => {
        if (door.hasOwnProperty('parameters') && (door.parameters === null || typeof door.parameters !== 'object')) {
            errors.push(`Puerta [${door.id}] tiene un objeto 'parameters' inválido.`);
        }
    });
    return errors;
};

const validateWindows = (windows: Window[]): string[] => {
    const errors: string[] = [];
    windows.forEach(win => {
        if (win.hasOwnProperty('parameters') && (win.parameters === null || typeof win.parameters !== 'object')) {
            errors.push(`Ventana [${win.id}] tiene un objeto 'parameters' inválido.`);
        }
    });
    return errors;
};


const validateAllCoordinates = (data: BimData): string[] => {
    const errors: string[] = [];
    const checkPoint = (p: any, elementId: string, pointName: string) => {
        if (!Array.isArray(p) || p.length !== 3 || p.some(coord => typeof coord !== 'number')) {
            errors.push(`Elemento [${elementId}]: La coordenada '${pointName}' es inválida. Debe ser un array de 3 números.`);
        }
    };

    data.elements.rooms?.forEach(room => {
        room.clear_boundary_points?.forEach((p, i) => {
             checkPoint(p, room.id, `clear_boundary_point_${i+1}`);
        });
    });

    data.elements.wall_segments?.forEach(seg => {
        checkPoint(seg.start_point, seg.id, 'start_point');
        checkPoint(seg.end_point, seg.id, 'end_point');
    });

    data.elements.floors?.forEach(floor => {
        floor.boundary_loops.forEach(loop => {
            loop.points.forEach((p, i) => {
                 checkPoint(p, floor.id, `boundary_point_${i+1}`);
            });
        });
    });
    
    return [...new Set(errors)];
}


export const validateBimData = (data: BimData): string[] => {
    const errors: string[] = [];
    if (!data) {
        return ["El objeto JSON es nulo o indefinido."];
    }
    
    errors.push(...validateQaChecks(data));
    errors.push(...validateProjectInfo(data.project_info));
     // Stop early if project info is fundamentally broken
    if (errors.length > 0) return errors;

    if (!data.elements) {
        // If there are no elements, and the status isn't 'needs_clarification', it's an issue.
        if(data.status !== 'needs_clarification') {
            errors.push("El objeto JSON no contiene la clave 'elements' y no indica necesidad de clarificación.");
        }
        return errors;
    }
    
    const tolerance = data.project_info?.tolerance_m ?? 0.001;
    const constraints = data.project_info.generation_constraints;
    
    errors.push(...validateAllCoordinates(data));
    if (errors.length > 0) return errors;

    const { wall_segments, rooms, floors, doors, windows } = data.elements;

    if (wall_segments) {
        errors.push(...validateWallSegments(wall_segments, constraints, tolerance));
    }

    if (rooms && wall_segments) {
        errors.push(...validateRooms(rooms, wall_segments, constraints, tolerance));
    }

    if (floors) {
        errors.push(...validateFloors(floors, tolerance));
    }

    if (doors) {
        errors.push(...validateDoors(doors));
    }

    if (windows) {
        errors.push(...validateWindows(windows));
    }

    return errors;
}
