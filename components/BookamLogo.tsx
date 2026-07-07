export function BookamLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ fontSize: size, fontWeight: 800, fontFamily: 'Poppins' }}>
      <span style={{ color: '#6B2D82' }}>B</span>
      <span style={{ color: '#C9A84C' }}>oo</span>
      <span style={{ color: '#6B2D82' }}>kam</span>
    </div>
  );
}
