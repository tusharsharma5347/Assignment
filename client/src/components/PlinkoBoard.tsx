import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import './PlinkoBoard.css';

const ROWS = 12;
const PEG_RADIUS = 8;
const BALL_RADIUS = 12;
const ROW_SPACING = 50;
const COL_SPACING = 40;
const BIN_WIDTH = 60;
const BIN_HEIGHT = 40;

interface PlinkoBoardProps {
  dropColumn: number;
  path?: ('Left' | 'Right')[];
  binIndex?: number;
  isDropping: boolean;
  goldenBall: boolean;
  debugGrid: boolean;
  onAnimationComplete: () => void;
  onPegCollision: () => void;
}

export function PlinkoBoard({
  dropColumn,
  path,
  binIndex,
  isDropping,
  goldenBall,
  debugGrid,
  onAnimationComplete,
  onPegCollision,
}: PlinkoBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const onCompleteRef = useRef(onAnimationComplete);
  const onPegRef = useRef(onPegCollision);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRow, setCurrentRow] = useState(-1);
  const [pulseBin, setPulseBin] = useState<number | null>(null);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
    onPegRef.current = onPegCollision;
  }, [onAnimationComplete, onPegCollision]);

  // Calculate board dimensions
  const boardWidth = (ROWS + 1) * COL_SPACING;
  const boardHeight = ROWS * ROW_SPACING + 100;
  const canvasWidth = boardWidth + 200;
  const canvasHeight = boardHeight + 200;

  // Generate peg positions
  const pegPositions: { row: number; col: number; x: number; y: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    const startX = (canvasWidth - (row + 1) * COL_SPACING) / 2;
    for (let col = 0; col <= row; col++) {
      pegPositions.push({
        row,
        col,
        x: startX + col * COL_SPACING,
        y: 100 + row * ROW_SPACING,
      });
    }
  }

  // Calculate bin positions
  const binPositions: { x: number; y: number; index: number }[] = [];
  const binStartX = (canvasWidth - 13 * BIN_WIDTH) / 2;
  for (let i = 0; i < 13; i++) {
    binPositions.push({
      x: binStartX + i * BIN_WIDTH,
      y: canvasHeight - 100,
      index: i,
    });
  }

  // Calculate drop position
  const dropX = binStartX + dropColumn * BIN_WIDTH + BIN_WIDTH / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw bins
      binPositions.forEach((bin, idx) => {
        const isPulsing = pulseBin === idx;
        ctx.fillStyle = isPulsing ? 'rgba(74, 158, 255, 0.5)' : 'rgba(45, 55, 72, 0.8)';
        ctx.strokeStyle = isPulsing ? 'var(--accent)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isPulsing ? 3 : 1;
        ctx.beginPath();
        ctx.rect(bin.x, bin.y, BIN_WIDTH, BIN_HEIGHT);
        ctx.fill();
        ctx.stroke();

        // Bin number
        ctx.fillStyle = 'var(--text-primary)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(idx.toString(), bin.x + BIN_WIDTH / 2, bin.y + BIN_HEIGHT / 2 + 5);
      });

      // Draw pegs
      pegPositions.forEach((peg) => {
        ctx.fillStyle = 'var(--peg-color)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Debug grid
        if (debugGrid && currentRow === peg.row) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.fill();
        }
      });

      // Draw ball
      if (ballPos) {
        const gradient = ctx.createRadialGradient(
          ballPos.x,
          ballPos.y,
          0,
          ballPos.x,
          ballPos.y,
          BALL_RADIUS
        );
        
        if (goldenBall) {
          gradient.addColorStop(0, '#ffd700');
          gradient.addColorStop(0.5, '#ffed4e');
          gradient.addColorStop(1, '#ffa500');
        } else {
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.5, '#e0e0e0');
          gradient.addColorStop(1, '#b0b0b0');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ballPos.x, ballPos.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw drop indicator
      if (!isDropping && !ballPos) {
        ctx.strokeStyle = 'var(--accent)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(dropX, 50);
        ctx.lineTo(dropX, 100);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    draw();
  }, [ballPos, currentRow, pulseBin, dropColumn, goldenBall, debugGrid, isDropping]);

  // Animate ball drop
  useEffect(() => {
    // Capture current values at effect start
    const currentPath = path || [];
    const currentBinIndex = binIndex;
    
    // Don't start animation if not dropping or path not ready
    if (!isDropping) {
      setBallPos(null);
      setCurrentRow(-1);
      return;
    }
    
    // Wait for path to be available
    if (currentPath.length === 0) {
      return;
    }

    let pos = dropColumn;
    let currentX = dropX;
    let currentY = 50;
    let rowIndex = 0;
    let lastPegTime = 0;
    let animationStopped = false;
    let frameCount = 0;

    // Set initial ball position
    setBallPos({ x: currentX, y: currentY });

    // Safety timeout - force completion after 10 seconds
    const safetyTimeout = setTimeout(() => {
      if (!animationStopped) {
        console.warn('Animation timeout - forcing completion');
        animationStopped = true;
        onCompleteRef.current();
      }
    }, 10000);

    const animate = (timestamp: number) => {
      if (animationStopped) return;
      
      frameCount++;
      // Safety check - if we've been animating for too long, force completion
      if (frameCount > 1000) {
        console.warn('Animation frame limit reached - forcing completion');
        animationStopped = true;
        clearTimeout(safetyTimeout);
        onCompleteRef.current();
        return;
      }

      if (rowIndex >= currentPath.length) {
        // Ball reached bottom - use binIndex from props if available, otherwise use pos
        const finalBin = currentBinIndex !== undefined ? currentBinIndex : pos;
        const targetBin = binPositions[finalBin];
        if (!targetBin) {
          console.error('Invalid bin index:', finalBin);
          animationStopped = true;
          onCompleteRef.current();
          return;
        }

        const targetX = targetBin.x + BIN_WIDTH / 2;
        const targetY = targetBin.y - BALL_RADIUS;

        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 2) {
          // Reached bin
          animationStopped = true;
          setBallPos({ x: targetX, y: targetY });
          setPulseBin(finalBin);
          setCurrentRow(ROWS);

          // Confetti
          if (currentBinIndex !== undefined) {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { x: targetX / canvasWidth, y: targetY / canvasHeight },
              colors: ['#4a9eff', '#9f7aea', '#48bb78'],
            });
          }

          clearTimeout(safetyTimeout);
          setTimeout(() => {
            setPulseBin(null);
            setBallPos(null);
            setCurrentRow(-1);
            onCompleteRef.current();
          }, 1000);

          return;
        }

        // Move towards bin
        const speed = 5;
        currentX += (dx / distance) * speed;
        currentY += (dy / distance) * speed;
        setBallPos({ x: currentX, y: currentY });
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // Moving through rows
      const targetRow = rowIndex;
      const targetY = 100 + targetRow * ROW_SPACING;
      
      // Check if we've passed this row - if so, advance
      if (currentY >= targetY + 15) {
        // Apply path decision
        if (currentPath[rowIndex] === 'Right') {
          pos++;
        }
        setCurrentRow(rowIndex);
        rowIndex++;
        setBallPos({ x: currentX, y: currentY });
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const rowPegs = pegPositions.filter(p => p.row === targetRow);
      
      // Find current peg based on position
      const currentPegIndex = Math.min(pos, targetRow);
      const targetPeg = rowPegs[currentPegIndex];
      
      if (!targetPeg) {
        // No peg found, just move down
        currentY += 4;
        setBallPos({ x: currentX, y: currentY });
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const targetX = targetPeg.x;
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < PEG_RADIUS + BALL_RADIUS + 2) {
        // Hit peg - bounce off
        if (timestamp - lastPegTime > 50) {
          onPegRef.current();
          lastPegTime = timestamp;
        }

        // Bounce off peg with slight downward bias
        const angle = Math.atan2(dy, dx);
        const bounceAngle = angle + Math.PI + (Math.random() - 0.5) * 0.3; // Add slight randomness
        const speed = 3;
        currentX += Math.cos(bounceAngle) * speed;
        currentY += Math.sin(bounceAngle) * speed + 1; // Always move down slightly
      } else {
        // Move towards peg with downward bias
        const speed = 4;
        const moveX = (dx / distance) * speed;
        const moveY = Math.max((dy / distance) * speed, 2); // Ensure downward movement
        currentX += moveX;
        currentY += moveY;
      }

      setBallPos({ x: currentX, y: currentY });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      animationStopped = true;
      clearTimeout(safetyTimeout);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // Include path length to trigger when path becomes available
  }, [isDropping, dropColumn, path?.length || 0]);

  return (
    <div className="plinko-board">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="board-canvas"
      />
      {debugGrid && (
        <div className="debug-info">
          <div>Row: {currentRow >= 0 ? currentRow : 'Waiting'}</div>
          {path && <div>Path: {path.slice(0, currentRow + 1).join(' → ')}</div>}
        </div>
      )}
    </div>
  );
}

