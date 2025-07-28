import { Vec3 } from "vec3";

export const SPRINT_SPEED = 4.3;
export const SPRINT_AND_EAT = 3.82;

// Coordinate type for cleaner code
export type Coordinate = [number, number, number];

// Math helper functions
export function coordinateToVec3(coordinate: Coordinate): Vec3 {
    return new Vec3(coordinate[0], coordinate[1], coordinate[2]);
}

export function vec3ToCoordinate(vec3: Vec3): Coordinate {
    return [vec3.x, vec3.y, vec3.z];
}

export function addVec3(v1: Vec3, v2: Vec3): Vec3 {
    return new Vec3(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
}

export function subtractVec3(v1: Vec3, v2: Vec3): Vec3 {
    return new Vec3(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
}

export function invertVec3(v1: Vec3): Vec3 {
    return new Vec3(-v1.x, -v1.y, -v1.z);
}

export function lengthVec3(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

// Minecraft coordinate system helpers
export function rotateLeft(v: Vec3): Vec3 {
    return new Vec3(v.z, 0, -v.x);
}

export function rotateRight(v: Vec3): Vec3 {
    return new Vec3(-v.z, 0, v.x);
}

export function directionString(v: Vec3): string {
    if (Math.abs(v.x) > Math.abs(v.z)) {
        return v.x > 0 ? "East" : "West";
    } else {
        return v.z > 0 ? "South" : "North";
    }
}

export function stringToDirection(directionStr: string): Vec3 | null {
    const d = directionStr.toLowerCase()[0];
    switch (d) {
        case 'n': return new Vec3(0, 0, -1);
        case 's': return new Vec3(0, 0, 1);
        case 'e': return new Vec3(1, 0, 0);
        case 'w': return new Vec3(-1, 0, 0);
        default: return null;
    }
}

export function distanceVec3(v1: Vec3, v2: Vec3): number | null {
    if (!v1) {
        console.error("Error: v1 in distanceVec3() is null.");
        return null;
    }
    if (!v2) {
        console.error("Error: v2 in distanceVec3() is null.");
        return null;
    }
    const dv = subtractVec3(v1, v2);
    return lengthVec3(dv);
}

export function walkTime(v1: Vec3, v2: Vec3, stopAndEat = false): number | null {
    if (!v1) {
        console.error("Error: v1 in walkTime() is null.");
        return null;
    }
    if (!v2) {
        console.error("Error: v2 in walkTime() is null.");
        return null;
    }
    const distance = distanceVec3(v1, v2);
    if (distance === null) return null;
    
    const moveRate = stopAndEat ? SPRINT_AND_EAT : SPRINT_SPEED;
    return distance / moveRate + 0.1;
}

export function getViewVector(pitch: number, yaw: number): Vec3 {
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    
    return new Vec3(-sinYaw * cosPitch, sinPitch, -cosYaw * cosPitch);
}

// Generator function for rectangle border iteration
export function* rectangleBorder(w: number, h: number): Generator<[number, number]> {
    if (w === 0 && h === 0) {
        yield [0, 0];
    } else if (h === 0) {
        for (let dx = -w; dx <= w; dx++) {
            yield [dx, 0];
        }
    } else if (w === 0) {
        for (let dy = -h; dy <= h; dy++) {
            yield [0, dy];
        }
    } else {
        for (let dx = -w; dx <= w; dx++) {
            yield [dx, h];
        }
        for (let dy = h - 1; dy >= -h; dy--) {
            yield [w, dy];
        }
        for (let dx = w - 1; dx >= -w; dx--) {
            yield [dx, -h];
        }
        for (let dy = -h + 1; dy < h; dy++) {
            yield [-w, dy];
        }
    }
}