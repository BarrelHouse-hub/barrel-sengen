// アプリアイコン：暗い木の地に、紙の札と琥珀色の樽の線
export function IconArt({ size }: { size: number }) {
  const u = size / 100
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#17120e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 58 * u,
          height: 70 * u,
          background: '#f4ecdf',
          borderRadius: 4 * u,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 9 * u,
          padding: `0 ${10 * u}px`,
          transform: 'rotate(-6deg)',
        }}
      >
        <div style={{ height: 5 * u, background: '#2b211a', borderRadius: 3 * u, width: '100%' }} />
        <div style={{ height: 5 * u, background: '#2b211a', borderRadius: 3 * u, width: '75%' }} />
        <div style={{ height: 5 * u, background: '#e0a34e', borderRadius: 3 * u, width: '55%' }} />
      </div>
    </div>
  )
}
