import { Router } from 'express';
import { prisma } from './db';
import { generateCommit, generateCombinedSeed, createGameEngine, sha256 } from './game/engine';
import crypto from 'crypto';
import { z } from 'zod';

export const router = Router();

// Validation schemas
const StartRoundSchema = z.object({
    clientSeed: z.string().min(1),
    betCents: z.number().int().min(1), // simple bet
    dropColumn: z.number().min(0).max(12),
});

// --- Proven Fairness Endpoints ---

// 1. POST /rounds/commit
// Server generates secret seed + nonce, returns commit hash. Round is created in CREATED state.
router.post('/rounds/commit', async (req, res, next) => {
    try {
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const nonce = crypto.randomBytes(8).toString('hex'); // simple nonce
        const commitHex = generateCommit(serverSeed, nonce);

        const round = await prisma.round.create({
            data: {
                nonce,
                commitHex,
                serverSeed, // Store serverSeed but don't reveal it in response
                status: 'CREATED',
            }
        });

        // Ensure serverSeed is stored (shouldn't be needed but double-check)
        if (!round.serverSeed) {
            await prisma.round.update({
                where: { id: round.id },
                data: { serverSeed }
            });
        }

        res.json({
            roundId: round.id,
            commitHex,
            nonce
        });
    } catch (error) {
        next(error);
    }
});

// 2. POST /rounds/:id/start
// Client sends clientSeed + dropColumn. Server computes outcome.
router.post('/rounds/:id/start', async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = StartRoundSchema.parse(req.body);

        const round = await prisma.round.findUnique({ where: { id } });
        if (!round) {
            return res.status(404).json({ error: 'Round not found' });
        }
        if (round.status !== 'CREATED') {
            return res.status(400).json({ error: 'Round already started or finished' });
        }
        if (!round.serverSeed) {
            console.error(`Round ${id} missing serverSeed. Round data:`, round);
            return res.status(500).json({ error: 'Server seed missing internally. Please try starting a new round.' });
        }

        const combinedSeed = generateCombinedSeed(round.serverSeed, body.clientSeed, round.nonce);

        // Execute Engine
        const engine = createGameEngine(combinedSeed);
        const result = engine.run(body.dropColumn);

        // Calculate Payout (Simple Symmetric Paytable)
        // Bins 0..12. 
        // Example Multipliers: High at edges, low at center.
        // Center is 6.
        // 0,12: 10x
        // 1,11: 5x
        // 2,10: 2x
        // 3,9: 1x
        // 4,8: 0.5x
        // 5,7: 0.2x
        // 6: 0.2x
        const multipliers = [10, 5, 2, 1, 0.5, 0.2, 0.2, 0.2, 0.5, 1, 2, 5, 10];
        const payoutMultiplier = multipliers[result.binIndex];

        // Update Round
        const updated = await prisma.round.update({
            where: { id },
            data: {
                status: 'STARTED', // or REVEALED depending on if we want auto-reveal. 
                // "Computes combinedSeed... does not reveal serverSeed."
                // So status STARTED.
                clientSeed: body.clientSeed,
                combinedSeed,
                pegMapHash: result.pegMapHash,
                dropColumn: body.dropColumn,
                binIndex: result.binIndex,
                payoutMultiplier,
                betCents: body.betCents,
                pathJson: JSON.stringify(result.path)
            }
        });

        res.json({
            roundId: updated.id,
            pegMapHash: result.pegMapHash,
            binIndex: result.binIndex,
            payoutMultiplier,
            path: result.path,
            // serverSeed NOT revealed yet
        });

    } catch (error) {
        console.error('Error in /rounds/:id/start:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.issues });
        }
        next(error);
    }
});

// 3. POST /rounds/:id/reveal
// Moves to REVEALED, returns serverSeed.
router.post('/rounds/:id/reveal', async (req, res, next) => {
    try {
        const { id } = req.params;
        const round = await prisma.round.findUnique({ where: { id } });
        if (!round) return res.status(404).json({ error: 'Round not found' });

        if (round.status === 'CREATED') {
            return res.status(400).json({ error: 'Round not started yet' });
        }

        const updated = await prisma.round.update({
            where: { id },
            data: {
                status: 'REVEALED',
                revealedAt: new Date()
            }
        });

        res.json({
            serverSeed: updated.serverSeed,
            clientSeed: updated.clientSeed,
            nonce: updated.nonce,
            combinedSeed: updated.combinedSeed
        });

    } catch (error) {
        next(error);
    }
});

// 4. GET /rounds/:id
router.get('/rounds/:id', async (req, res, next) => {
    try {
        const round = await prisma.round.findUnique({ where: { id: req.params.id } });
        if (!round) return res.status(404).json({ error: 'Round not found' });

        // If not REVEALED, mask serverSeed?
        // Actually, typically GET returns what's public. 
        // If I am the user playing, I might know it if I called reveal.
        // But to be safe, if status != REVEALED, mask serverSeed.

        const safeRound = { ...round };
        if (round.status !== 'REVEALED') {
            safeRound.serverSeed = null;
            safeRound.combinedSeed = null;
        }
        res.json(safeRound);
    } catch (e) { next(e); }
});

// 5. GET /verify
// Stateless verification
router.get('/verify', (req, res, next) => {
    try {
        const { serverSeed, clientSeed, nonce, dropColumn } = req.query;

        if (!serverSeed || !clientSeed || !nonce || dropColumn === undefined) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const dropColNum = Number(dropColumn);
        const commitHex = generateCommit(serverSeed as string, nonce as string);
        const combinedSeed = generateCombinedSeed(serverSeed as string, clientSeed as string, nonce as string);

        const engine = createGameEngine(combinedSeed);
        const result = engine.run(dropColNum);

        res.json({
            valid: true, // Just by virtue of computation succeeding
            commitHex,
            combinedSeed,
            pegMapHash: result.pegMapHash,
            binIndex: result.binIndex,
            path: result.path
        });

    } catch (e) { next(e); }
});
