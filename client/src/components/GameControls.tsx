import './GameControls.css';

interface GameControlsProps {
  dropColumn: number;
  onDropColumnChange: (col: number) => void;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  clientSeed: string;
  onClientSeedChange: (seed: string) => void;
  onCommit: () => void;
  onDrop: () => void;
  isDropping: boolean;
  hasRound: boolean;
}

export function GameControls({
  dropColumn,
  onDropColumnChange,
  betAmount,
  onBetAmountChange,
  clientSeed,
  onClientSeedChange,
  onCommit,
  onDrop,
  isDropping,
  hasRound,
}: GameControlsProps) {
  return (
    <div className="game-controls">
      <h2>Controls</h2>

      <div className="control-group">
        <label htmlFor="drop-column">
          Drop Column: {dropColumn}
          <span className="keyboard-hint">(← → arrows)</span>
        </label>
        <input
          id="drop-column"
          type="range"
          min="0"
          max="12"
          value={dropColumn}
          onChange={(e) => onDropColumnChange(Number(e.target.value))}
          disabled={isDropping}
          className="slider"
        />
        <div className="column-indicators">
          {Array.from({ length: 13 }).map((_, i) => (
            <button
              key={i}
              className={`column-btn ${dropColumn === i ? 'active' : ''}`}
              onClick={() => onDropColumnChange(i)}
              disabled={isDropping}
              aria-label={`Select column ${i}`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="bet-amount">Bet Amount (cents)</label>
        <input
          id="bet-amount"
          type="number"
          min="1"
          value={betAmount}
          onChange={(e) => onBetAmountChange(Number(e.target.value))}
          disabled={isDropping}
          className="input"
        />
      </div>

      <div className="control-group">
        <label htmlFor="client-seed">
          Client Seed (optional)
          <span className="hint">Leave empty for auto-generated</span>
        </label>
        <input
          id="client-seed"
          type="text"
          value={clientSeed}
          onChange={(e) => onClientSeedChange(e.target.value)}
          disabled={isDropping}
          placeholder="Enter custom seed..."
          className="input"
        />
      </div>

      <div className="control-buttons">
        {!hasRound && (
          <button
            onClick={onCommit}
            disabled={isDropping}
            className="btn btn-primary"
          >
            Start Round
          </button>
        )}
        {hasRound && (
          <button
            onClick={onDrop}
            disabled={isDropping}
            className="btn btn-primary btn-drop"
          >
            {isDropping ? 'Dropping...' : 'Drop Ball'}
            <span className="keyboard-hint">(Space)</span>
          </button>
        )}
      </div>

      <div className="keyboard-help">
        <h3>Keyboard Controls</h3>
        <ul>
          <li><kbd>←</kbd> <kbd>→</kbd> Select drop column</li>
          <li><kbd>Space</kbd> Drop ball</li>
          <li><kbd>T</kbd> Toggle TILT mode</li>
          <li><kbd>G</kbd> Toggle debug grid</li>
        </ul>
      </div>
    </div>
  );
}

