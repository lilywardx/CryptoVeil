import '../styles/game.css';

type Position = {
  x: number;
  y: number;
};

type GameBoardProps = {
  position: Position | null;
  joined: boolean;
};

export function GameBoard({ position, joined }: GameBoardProps) {
  const highlightKey = position ? `${position.x}-${position.y}` : null;

  const cells = [];
  for (let row = 10; row >= 1; row--) {
    for (let column = 1; column <= 10; column++) {
      const isActive = highlightKey === `${column}-${row}`;
      cells.push(
        <div
          key={`${column}-${row}`}
          className={`board-cell ${isActive ? 'active' : ''}`}
          aria-label={`Cell ${column},${row}`}
        >
          <span className="cell-coordinate">
            {column},{row}
          </span>
          {isActive ? <span className="cell-badge">You</span> : null}
        </div>
      );
    }
  }

  return (
    <div className="board-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Encrypted map</p>
          <h3 className="card-title">10 × 10 grid</h3>
          <p className="muted">Positions are hidden until you decrypt with your keypair.</p>
        </div>
        <div className="chip">1 - 10 on both axes</div>
      </div>

      <div className="board-grid">{cells}</div>

      <div className="board-footer">
        {!joined && <span className="muted">Join the game to receive a hidden coordinate.</span>}
        {joined && !position && (
          <span className="muted">Decrypt to reveal your tile. Moving without decrypting keeps it hidden.</span>
        )}
        {position && (
          <span className="muted">
            Current decrypted position: ({position.x}, {position.y})
          </span>
        )}
      </div>
    </div>
  );
}
