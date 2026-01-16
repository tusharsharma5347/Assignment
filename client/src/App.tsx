import { useState, useEffect } from 'react';
import { PlinkoGame } from './components/PlinkoGame';
import { Verifier } from './components/Verifier';
import './App.css';

type View = 'game' | 'verifier';

function App() {
  const [view, setView] = useState<View>('game');

  return (
    <div className="app">
      <nav className="nav">
        <button 
          className={view === 'game' ? 'active' : ''}
          onClick={() => setView('game')}
        >
          Play Plinko
        </button>
        <button 
          className={view === 'verifier' ? 'active' : ''}
          onClick={() => setView('verifier')}
        >
          Verifier
        </button>
      </nav>
      <main>
        {view === 'game' ? <PlinkoGame /> : <Verifier />}
      </main>
    </div>
  );
}

export default App;
