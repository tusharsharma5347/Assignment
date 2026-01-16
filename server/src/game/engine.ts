import crypto from 'crypto';

// --- Constants ---
export const ROWS = 12;
export const DROP_COLUMNS = 13; // 0..12

/**
 * Xorshift32 implementation slightly modified or standard.
 * The test vectors say: "PRNG = xorshift32 seeded from first 4 bytes of combinedSeed (big‐endian)"
 * 
 * Standard Xorshift32:
 * x ^= x << 13;
 * x ^= x >> 17;
 * x ^= x << 5;
 * return x;
 */
export class Xorshift32 {
    state: number;

    constructor(seed: number) {
        // Ensure non-zero seed is best, but 0 is allowed mostly though effectively dead in pure xorshift.
        // If seed is 0, we might want to default to something, but let's stick to raw interpretation first.
        this.state = seed >>> 0; // unsigned 32-bit
        if (this.state === 0) {
           this.state = 1; // Fallback to avoid stuck generator if seed is 0
        }
    }

    /* Returns a float in [0, 1) */
    nextFloat(): number {
        // xorshift32
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x >>> 0;
        
        // Convert to float [0, 1)
        return (this.state >>> 0) / 4294967296;
    }
}

/**
 * Hash helpers
 */
export function sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateCommit(serverSeed: string, nonce: string): string {
    return sha256(`${serverSeed}:${nonce}`);
}

export function generateCombinedSeed(serverSeed: string, clientSeed: string, nonce: string): string {
    return sha256(`${serverSeed}:${clientSeed}:${nonce}`);
}

/**
 * Game Engine
 */
export interface Peg {
    leftBias: number; // 0.4 to 0.6 usually
}

export type PegMap = Peg[][]; // Row -> Col -> Peg

export interface PathResult {
    pegMapHash: string;
    path: ('Left' | 'Right')[];
    binIndex: number;
    pegMap: PegMap; // For debug/verification
}

export function createGameEngine(combinedSeedHex: string) {
    // 1. Seed PRNG
    // "PRNG = xorshift32 seeded from first 4 bytes of combinedSeed (big‐endian)"
    // If combinedSeedHex is not a valid hex string or too short, hash it first
    let buffer: Buffer;
    try {
        buffer = Buffer.from(combinedSeedHex, 'hex');
        // Ensure we have at least 4 bytes
        if (buffer.length < 4) {
            buffer = Buffer.from(sha256(combinedSeedHex), 'hex');
        }
    } catch {
        // If not valid hex, hash it
        buffer = Buffer.from(sha256(combinedSeedHex), 'hex');
    }
    const seedInt = buffer.readUInt32BE(0);
    const prng = new Xorshift32(seedInt);

    // 2. Generate Peg Map
    const pegMap: PegMap = [];
    for (let r = 0; r < ROWS; r++) {
        const rowPegs: Peg[] = [];
        // row r has r+1 pegs (0..r)
        for (let c = 0; c <= r; c++) {
            // "leftBias = 0.5 + (rand() - 0.5) * 0.2"
            const rnd = prng.nextFloat();
            const leftBias = 0.5 + (rnd - 0.5) * 0.2;
            
            // "round to ~6 decimals for stable hashing"
            // We use 6 fractional digits: 0.123456
            const roundedBias = Math.round(leftBias * 1000000) / 1000000;
            
            rowPegs.push({ leftBias: roundedBias });
        }
        pegMap.push(rowPegs);
    }

    // 3. Compute Peg Map Hash
    // "SHA256(JSON.stringify(pegMap))"
    const pegMapHash = sha256(JSON.stringify(pegMap));

    // 4. Engine Function
    return {
        pegMap,
        pegMapHash,
        run(dropColumn: number): PathResult {
            // Re-use the SAME PRNG stream order.
            // "Use the same PRNG stream order every time: first for peg map generation, then for row decisions."
            // So we continue using `prng` from where it left off.
            
            const path: ('Left' | 'Right')[] = [];
            let pos = 0; // "Maintain a counter pos (number of Right moves so far), pos ∈ [0..R]"
            // NOTE: The spec says "pos (number of Right moves so far)". 
            // Also need to track the actual current peg index to check bias.
            // Wait, standard discrete Plinko: 
            // At row r, you are at some horizontal index.
            // Spec says: "index min(pos, r)"
            
            // "Drop column influence: player picks dropColumn ∈ [0..12]"
            // "bias' = clamp(leftBias + adj, 0, 1)"
            
            for (let r = 0; r < ROWS; r++) {
                // "at row r, use the peg at index min(pos, r)"
                const pegIndex = Math.min(pos, r); 
                // Wait, if pos is "number of right moves", then at row 0, pos=0. Peg index 0. CORRECT.
                
                const peg = pegMap[r][pegIndex];
                
                // "adj = (dropColumn - floor(R/2)) * 0.01"
                // R = 12, floor(12/2) = 6.
                const adj = (dropColumn - Math.floor(ROWS / 2)) * 0.01;
                
                let biasPrime = peg.leftBias + adj;
                // clamp
                if (biasPrime < 0) biasPrime = 0;
                if (biasPrime > 1) biasPrime = 1;

                // Decision
                const rnd = prng.nextFloat();
                if (rnd < biasPrime) {
                    path.push('Left');
                    // pos stays same? 
                    // "If rnd < bias' choose Left, else Right (then pos += 1)"
                } else {
                    path.push('Right');
                    pos += 1;
                }
            }

            return {
                pegMapHash,
                pegMap,
                path,
                binIndex: pos,
            };
        }
    };
}
