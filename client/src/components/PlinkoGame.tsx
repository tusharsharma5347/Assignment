import { useState, useEffect, useRef, useCallback } from 'react';
import { PlinkoBoard } from './PlinkoBoard';
import { GameControls } from './GameControls';
import { GameStats } from './GameStats';
import { SoundManager } from './SoundManager';
import './PlinkoGame.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

interface Round {
  id: string;
  commitHex: string;
  nonce: string;
  status: string;
  binIndex?: number;
  payoutMultiplier?: number;
  path?: ('Left' | 'Right')[];
}

export function PlinkoGame() {
  const [round, setRound] = useState<Round | null>(null);
  const [dropColumn, setDropColumn] = useState(6);
  const [betAmount, setBetAmount] = useState(100);
  const [clientSeed, setClientSeed] = useState('');
  const [isDropping, setIsDropping] = useState(false);
  const [gameHistory, setGameHistory] = useState<Round[]>([]);
  const [muted, setMuted] = useState(false);
  const [tiltMode, setTiltMode] = useState(false);
  const [goldenBall, setGoldenBall] = useState(false);
  const [secretTheme, setSecretTheme] = useState(false);
  const [debugGrid, setDebugGrid] = useState(false);
  const soundManagerRef = useRef<SoundManager | null>(null);
  const lastThreeBinsRef = useRef<number[]>([]);

  // Initialize sound manager
  useEffect(() => {
    soundManagerRef.current = new SoundManager();
    return () => {
      soundManagerRef.current?.cleanup();
    };
  }, []);

  // Check for golden ball (last 3 center bins)
  useEffect(() => {
    if (lastThreeBinsRef.current.length >= 3) {
      const lastThree = lastThreeBinsRef.current.slice(-3);
      if (lastThree.every(bin => bin === 6)) {
        setGoldenBall(true);
      } else {
        setGoldenBall(false);
      }
    }
  }, [gameHistory]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isDropping) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setDropColumn(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setDropColumn(prev => Math.min(12, prev + 1));
          break;
        case ' ':
          e.preventDefault();
          handleDrop();
          break;
        case 't':
        case 'T':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setTiltMode(prev => !prev);
          }
          break;
        case 'g':
        case 'G':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setDebugGrid(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [dropColumn, isDropping]);

  // Secret theme easter egg
  useEffect(() => {
    let typed = '';
    const handleKeyPress = (e: KeyboardEvent) => {
      typed += e.key.toLowerCase();
      if (typed.length > 20) typed = typed.slice(-20);

      if (typed.includes('opensesame')) {
        setSecretTheme(prev => !prev);
        typed = '';
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleCommit = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rounds/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      // Map roundId to id to match the Round interface
      setRound({
        id: data.roundId,
        commitHex: data.commitHex,
        nonce: data.nonce,
        status: 'CREATED',
      });
      setClientSeed(''); // Reset client seed for new round
    } catch (error) {
      console.error('Failed to commit round:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start round. Please try again.';
      alert(`Failed to start round: ${errorMessage}`);
    }
  };

  const handleDrop = async () => {
    if (!round || isDropping) {
      if (!round) {
        alert('Please start a round first by clicking "Start Round"');
      }
      return;
    }

    if (!round.id) {
      console.error('Round missing id:', round);
      alert('Round data is invalid. Please start a new round.');
      return;
    }

    const seed = clientSeed || `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setIsDropping(true);

    try {
      // Start the round
      const startResponse = await fetch(`${API_BASE}/api/rounds/${round.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSeed: seed,
          betCents: betAmount,
          dropColumn,
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server error: ${startResponse.status}`);
      }

      const startData = await startResponse.json();

      // Update round with results
      const updatedRound = {
        ...round,
        ...startData,
        status: 'STARTED',
      };
      setRound(updatedRound);

      // Wait for animation to complete (handled by PlinkoBoard)
      // The board will call onAnimationComplete when done

    } catch (error) {
      console.error('Failed to drop ball:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to drop ball. Please try again.';
      alert(`Failed to drop ball: ${errorMessage}`);
      setIsDropping(false);
    }
  };

  const handleAnimationComplete = useCallback(async () => {
    // Use ref to get current round to avoid stale closure
    const currentRound = round;
    if (!currentRound) {
      setIsDropping(false);
      return;
    }

    try {
      // Reveal the server seed
      const revealResponse = await fetch(`${API_BASE}/api/rounds/${currentRound.id}/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (revealResponse.ok) {
        await revealResponse.json();
        const finalRound = await fetch(`${API_BASE}/api/rounds/${currentRound.id}`).then(r => r.json());

        setRound(finalRound);
        setGameHistory(prev => [finalRound, ...prev.slice(0, 19)]);

        if (finalRound.binIndex !== undefined) {
          lastThreeBinsRef.current.push(finalRound.binIndex);
          if (lastThreeBinsRef.current.length > 3) {
            lastThreeBinsRef.current.shift();
          }
        }

        // Play landing sound
        if (!muted && soundManagerRef.current) {
          soundManagerRef.current.playLanding();
        }
      }
    } catch (error) {
      console.error('Failed to reveal round:', error);
    } finally {
      setIsDropping(false);
      // Auto-commit next round
      handleCommit();
    }
  }, [round, muted]);

  const handlePegCollision = useCallback(() => {
    if (!muted && soundManagerRef.current) {
      soundManagerRef.current.playPegTick();
    }
  }, [muted]);

  return (
    <div className={`plinko-game ${secretTheme ? 'secret-theme' : ''} ${tiltMode ? 'tilt-mode' : ''}`}>
      <div className="game-header">
        <h1>Plinko Game</h1>
        <div className="header-controls">
          <button
            className="mute-toggle"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <div className="game-layout">
        <div className="game-board-container">
          <PlinkoBoard
            dropColumn={dropColumn}
            path={round?.path}
            binIndex={round?.binIndex}
            isDropping={isDropping}
            goldenBall={goldenBall}
            debugGrid={debugGrid}
            onAnimationComplete={handleAnimationComplete}
            onPegCollision={handlePegCollision}
          />
        </div>

        <div className="game-sidebar">
          <GameControls
            dropColumn={dropColumn}
            onDropColumnChange={setDropColumn}
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            clientSeed={clientSeed}
            onClientSeedChange={setClientSeed}
            onCommit={handleCommit}
            onDrop={handleDrop}
            isDropping={isDropping}
            hasRound={!!round}
          />

          <GameStats
            round={round}
            gameHistory={gameHistory}
          />
        </div>
      </div>

      <div className="easter-egg-indicators">
        {tiltMode && <span className="indicator">🎰 TILT MODE</span>}
        {goldenBall && <span className="indicator">✨ GOLDEN BALL</span>}
        {secretTheme && <span className="indicator">🔦 SECRET THEME</span>}
        {debugGrid && <span className="indicator">🔍 DEBUG GRID</span>}
      </div>
    </div>
  );
}

