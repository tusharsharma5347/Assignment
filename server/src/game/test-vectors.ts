import { createGameEngine, generateCombinedSeed, generateCommit, sha256, Xorshift32 } from './engine';

// Test Vectors from Prompt
const VECTORS = {
    serverSeed: "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc",
    nonce: "42",
    clientSeed: "candidate-hello",
    expectedCommit: "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34",
    expectedCombined: "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0",
    prngFirst5: [0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297],
    expectedPegs: [
        [0.422123], // Row 0
        [0.552503, 0.408786], // Row 1
        [0.491574, 0.468780, 0.436540] // Row 2
    ],
    dropColumn: 6,
    expectedBin: 6
};

function runTest() {
    console.log("Running Plinko Engine Tests...");
    let passed = true;

    // 1. Test Commit
    const commit = generateCommit(VECTORS.serverSeed, VECTORS.nonce);
    if (commit !== VECTORS.expectedCommit) {
        console.error(`[FAIL] Commit mismatch. Got ${commit}, expected ${VECTORS.expectedCommit}`);
        passed = false;
    } else {
        console.log("[PASS] Commit Hex");
    }

    // 2. Test Combined Seed
    const combined = generateCombinedSeed(VECTORS.serverSeed, VECTORS.clientSeed, VECTORS.nonce);
    if (combined !== VECTORS.expectedCombined) {
        console.error(`[FAIL] Combined Seed mismatch. Got ${combined}, expected ${VECTORS.expectedCombined}`);
        passed = false;
    } else {
        console.log("[PASS] Combined Seed");
    }

    // 3. Test PRNG Sequence
    const buffer = Buffer.from(combined, 'hex');
    const seedInt = buffer.readUInt32BE(0);
    const prng = new Xorshift32(seedInt);

    // Check first 5
    // Note: JS floats might have slight precision diffs in printing, but direct comparison should be close
    // Spec says "First 5 rand() in [0,1): 0.1106166649..."
    // We'll check tolerance
    const epsilon = 1e-9;
    for (let i = 0; i < 5; i++) {
        const val = prng.nextFloat();
        const startState = seedInt;

        if (Math.abs(val - VECTORS.prngFirst5[i]) > epsilon) {
            console.error(`[FAIL] PRNG value ${i} mismatch. Got ${val}, expected ${VECTORS.prngFirst5[i]}`);
            passed = false;
        }
    }
    if (passed) console.log("[PASS] PRNG Sequence");

    // 4. Test Game Engine (Peg Map)
    // Need to reset engine or create new one to match state
    const engine = createGameEngine(combined);

    // Check Row 0
    if (Math.abs(engine.pegMap[0][0].leftBias - VECTORS.expectedPegs[0][0]) > 0.000001) {
        console.error(`[FAIL] Row 0 Peg 0 Bias. Got ${engine.pegMap[0][0].leftBias}, expected ${VECTORS.expectedPegs[0][0]}`);
        passed = false;
    }
    // Check Row 1
    if (Math.abs(engine.pegMap[1][0].leftBias - VECTORS.expectedPegs[1][0]) > 0.000001) {
        console.error(`[FAIL] Row 1 Peg 0 Bias. Got ${engine.pegMap[1][0].leftBias}, expected ${VECTORS.expectedPegs[1][0]}`);
        passed = false;
    }
    if (Math.abs(engine.pegMap[1][1].leftBias - VECTORS.expectedPegs[1][1]) > 0.000001) {
        console.error(`[FAIL] Row 1 Peg 1 Bias. Got ${engine.pegMap[1][1].leftBias}, expected ${VECTORS.expectedPegs[1][1]}`);
        passed = false;
    }

    console.log("[PASS] Peg Map generation (partial check)");

    // 5. Run Drop
    const result = engine.run(VECTORS.dropColumn);
    if (result.binIndex !== VECTORS.expectedBin) {
        console.error(`[FAIL] Bin Index. Got ${result.binIndex}, expected ${VECTORS.expectedBin}`);
        passed = false;
    } else {
        console.log(`[PASS] Path Outcome (Bin ${result.binIndex})`);
    }

    if (passed) {
        console.log("\nALL TESTS PASSED ✅");
    } else {
        console.error("\nSOME TESTS FAILED ❌");
        process.exit(1);
    }
}

runTest();
