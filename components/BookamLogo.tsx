import { BookamSymbol } from './BookamSymbol';

export function BookamLogo({ size = 28 }: { size?: number }) {
  const symbolHeight = size * 0.62;
  const symbolWidth = symbolHeight * 2;

  return (
    <div className="flex items-center" style={{ fontSize: size, fontWeight: 800, fontFamily: 'Poppins' }}>
      <span style={{ color: '#6B2D82' }}>B</span>
      <span style={{ margin: '0 1px', display: 'inline-flex' }}>
        <BookamSymbol width={symbolWidth} height={symbolHeight} />
      </span>
      <span style={{ color: '#6B2D82' }}>kam</span>
    </div>
  );
}