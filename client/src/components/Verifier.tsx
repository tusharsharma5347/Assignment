import { useState } from 'react';
import './Verifier.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface VerifyResult {
  valid: boolean;
  commitHex: string;
  combinedSeed: string;
  pegMapHash: string;
  binIndex: number;
  path: ('Left' | 'Right')[];
}

export function Verifier() {
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('');
  const [dropColumn, setDropColumn] = useState(6);
  const [roundId, setRoundId] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed || !nonce) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const params = new URLSearchParams({
        serverSeed,
        clientSeed,
        nonce,
        dropColumn: dropColumn.toString(),
      });

      const response = await fetch(`${API_BASE}/api/verify?${params}`);
      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data: VerifyResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRound = async () => {
    if (!roundId) {
      setError('Please enter a round ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/rounds/${roundId}`);
      if (!response.ok) {
        throw new Error('Round not found');
      }

      const round = await response.json();
      
      if (round.status !== 'REVEALED') {
        setError('Round not yet revealed. Server seed is not available.');
        setLoading(false);
        return;
      }

      setServerSeed(round.serverSeed || '');
      setClientSeed(round.clientSeed || '');
      setNonce(round.nonce || '');
      setDropColumn(round.dropColumn || 6);

      // Auto-verify
      setTimeout(() => {
        handleVerify();
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load round');
      setLoading(false);
    }
  };

  return (
    <div className="verifier">
      <h1>Plinko Verifier</h1>
      <p className="verifier-description">
        Verify the fairness of any Plinko round by recomputing the outcome from the seeds.
        All randomness is deterministic and verifiable.
      </p>

      <div className="verifier-layout">
        <div className="verifier-form">
          <div className="form-section">
            <h2>Load Round by ID</h2>
            <div className="form-group">
              <label htmlFor="round-id">Round ID</label>
              <input
                id="round-id"
                type="text"
                value={roundId}
                onChange={(e) => setRoundId(e.target.value)}
                placeholder="Enter round ID..."
                className="input"
              />
              <button
                onClick={handleLoadRound}
                disabled={loading}
                className="btn btn-secondary"
              >
                Load Round
              </button>
            </div>
          </div>

          <div className="form-section">
            <h2>Or Enter Manually</h2>
            
            <div className="form-group">
              <label htmlFor="server-seed">Server Seed *</label>
              <input
                id="server-seed"
                type="text"
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                placeholder="Hex string..."
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="client-seed">Client Seed *</label>
              <input
                id="client-seed"
                type="text"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                placeholder="Any string..."
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="nonce">Nonce *</label>
              <input
                id="nonce"
                type="text"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                placeholder="Hex string..."
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="drop-col">Drop Column (0-12)</label>
              <input
                id="drop-col"
                type="number"
                min="0"
                max="12"
                value={dropColumn}
                onChange={(e) => setDropColumn(Number(e.target.value))}
                className="input"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || !serverSeed || !clientSeed || !nonce}
              className="btn btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="verifier-result">
            <h2>Verification Result</h2>
            
            <div className="result-status">
              <span className={`status-badge ${result.valid ? 'valid' : 'invalid'}`}>
                {result.valid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>

            <div className="result-details">
              <div className="detail-item">
                <span className="detail-label">Commit Hex:</span>
                <span className="detail-value code">{result.commitHex}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Combined Seed:</span>
                <span className="detail-value code">{result.combinedSeed}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Peg Map Hash:</span>
                <span className="detail-value code">{result.pegMapHash}</span>
              </div>

              <div className="detail-item highlight">
                <span className="detail-label">Final Bin:</span>
                <span className="detail-value large">{result.binIndex}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Path:</span>
                <div className="path-visualization">
                  {result.path.map((direction, idx) => (
                    <span key={idx} className="path-step">
                      Row {idx}: {direction}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="verifier-info">
        <h3>How It Works</h3>
        <ol>
          <li>
            <strong>Commit:</strong> Server generates a random serverSeed and nonce, then publishes
            commitHex = SHA256(serverSeed + ":" + nonce) before the round starts.
          </li>
          <li>
            <strong>Play:</strong> Client provides a clientSeed. Server computes combinedSeed = 
            SHA256(serverSeed + ":" + clientSeed + ":" + nonce) and uses it to seed a deterministic PRNG.
          </li>
          <li>
            <strong>Reveal:</strong> After the round, server reveals serverSeed. Anyone can verify
            the outcome by recomputing with the same inputs.
          </li>
          <li>
            <strong>Fairness:</strong> Since the commit is published before the round, the server
            cannot change the outcome after seeing the client's seed.
          </li>
        </ol>
      </div>
    </div>
  );
}

