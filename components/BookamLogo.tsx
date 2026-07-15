import Image from 'next/image';

export function BookamLogo({ size = 28 }: { size?: number }) {
  // The symbol image is transparent gold on a wide (roughly 2:1) canvas —
  // sized here relative to `size` so it visually matches the cap-height
  // of the "B"/"kam" text on either side, same treatment as the mobile
  // app's wordmark.
  const symbolHeight = size * 0.62;
  const symbolWidth = symbolHeight * 2;

  return (
    <div className="flex items-center" style={{ fontSize: size, fontWeight: 800, fontFamily: 'Poppins' }}>
      <span style={{ color: '#6B2D82' }}>B</span>
      <Image
        src="/bookam-symbol.png"
        alt=""
        width={symbolWidth}
        height={symbolHeight}
        style={{ width: symbolWidth, height: symbolHeight, margin: '0 1px' }}
        priority
      />
      <span style={{ color: '#6B2D82' }}>kam</span>
    </div>
  );
}