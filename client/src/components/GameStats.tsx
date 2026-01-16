import './GameStats.css';

interface Round {
  id: string;
  commitHex?: string;
  nonce?: string;
  binIndex?: number;
  payoutMultiplier?: number;
  betCents?: number;
  status?: string;
}

interface GameStatsProps {
  round: Round | null;
  gameHistory: Round[];
}

const PAYTABLE = [10, 5, 2, 1, 0.5, 0.2, 0.2, 0.2, 0.5, 1, 2, 5, 10];

export function GameStats({ round, gameHistory }: GameStatsProps) {
  const totalWinnings = gameHistory.reduce((sum, r) => {
    if (r.betCents && r.payoutMultiplier) {
      return sum + r.betCents * r.payoutMultiplier;
    }
    return sum;
  }, 0);

  const totalBets = gameHistory.reduce((sum, r) => {
    return sum + (r.betCents || 0);
  }, 0);

  return (
    <div className="game-stats">
      <h2>Stats</h2>

      {round && (
        <div className="current-round">
          <h3>Current Round</h3>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className="stat-value">{round.status}</span>
          </div>
          {round.binIndex !== undefined && (
            <div className="stat-item">
              <span className="stat-label">Landed in Bin:</span>
              <span className="stat-value highlight">{round.binIndex}</span>
            </div>
          )}
          {round.payoutMultiplier !== undefined && (
            <div className="stat-item">
              <span className="stat-label">Multiplier:</span>
              <span className="stat-value highlight">{round.payoutMultiplier}x</span>
            </div>
          )}
          {round.betCents && round.payoutMultiplier && (
            <div className="stat-item">
              <span className="stat-label">Payout:</span>
              <span className="stat-value success">
                {(round.betCents * round.payoutMultiplier).toFixed(2)}¢
              </span>
            </div>
          )}
          {round.commitHex && (
            <div className="stat-item">
              <span className="stat-label">Commit:</span>
              <span className="stat-value small">{round.commitHex.slice(0, 16)}...</span>
            </div>
          )}
        </div>
      )}

      <div className="paytable">
        <h3>Paytable</h3>
        <div className="paytable-grid">
          {PAYTABLE.map((mult, idx) => (
            <div key={idx} className={`paytable-item ${round?.binIndex === idx ? 'active' : ''}`}>
              <div className="paytable-bin">{idx}</div>
              <div className="paytable-mult">{mult}x</div>
            </div>
          ))}
        </div>
      </div>

      {gameHistory.length > 0 && (
        <div className="history">
          <h3>History</h3>
          <div className="stat-item">
            <span className="stat-label">Total Rounds:</span>
            <span className="stat-value">{gameHistory.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Bets:</span>
            <span className="stat-value">{totalBets}¢</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Winnings:</span>
            <span className="stat-value success">{totalWinnings.toFixed(2)}¢</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Net:</span>
            <span className={`stat-value ${totalWinnings - totalBets >= 0 ? 'success' : 'error'}`}>
              {(totalWinnings - totalBets).toFixed(2)}¢
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

