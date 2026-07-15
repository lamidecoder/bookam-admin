export function BookamLogo({ size = 28 }: { size?: number }) {
  // Plain <img>, not next/image — these are small, already-optimized
  // static assets, and next/image's server-side optimization pipeline
  // is unnecessary overhead here and a possible point of failure in
  // some deployment environments. A plain <img> has no such dependency.
  const symbolHeight = size * 0.62;
  const symbolWidth = symbolHeight * 2;

  return (
    <div className="flex items-center" style={{ fontSize: size, fontWeight: 800, fontFamily: 'Poppins' }}>
      <span style={{ color: '#6B2D82' }}>B</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bookam-symbol.png"
        alt=""
        width={symbolWidth}
        height={symbolHeight}
        style={{ width: symbolWidth, height: symbolHeight, margin: '0 1px', display: 'inline-block' }}
      />
      <span style={{ color: '#6B2D82' }}>kam</span>
    </div>
  );
}