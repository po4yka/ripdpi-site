/**
 * The story as line drawings, one for each chapter after the first, for pages without WebGL and without JavaScript.
 * They retell the stations of the 3D landscape in thin lines on the night: shapes are filled with the night so that
 * they hide what stands behind them, and the signal and the danger colours are the only hues (`.story-drawing` in
 * app.css). GSAP moves the parts marked `data-bob` and `data-sweep`.
 */

const W = 480;
const GROUND = 250;

function Ground() {
  return <path d={`M8 ${GROUND + 2}Q${W / 2} ${GROUND - 4} ${W - 8} ${GROUND + 2}`} opacity={0.45} />;
}

/** The ghost of the app icon: a sheet with a wavy hem and two tall eyes. Its hem sits at (x, y). */
function Ghost({ x, y, s = 1, outline = false }: { x: number; y: number; s?: number; outline?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g data-bob>
        <path
          d="M-14 0C-14-24-11-34 0-34S14-24 14 0q-2.33 3.4-4.67 0t-4.67 0-4.67 0-4.67 0-4.67 0-4.65 0Z"
          strokeDasharray={outline ? "3 4" : undefined}
          fill={outline ? "none" : undefined}
        />
        <ellipse className="ink" cx={-4.5} cy={-20} rx={1.6} ry={3.4} />
        <ellipse className="ink" cx={4.5} cy={-20} rx={1.6} ry={3.4} />
      </g>
    </g>
  );
}

/** A brick wall standing on the ground. */
function Wall({ x, top, w = 50 }: { x: number; top: number; w?: number }) {
  const rows = Math.floor((GROUND - top) / 20);
  let lines = "";
  for (let r = 1; r <= rows; r++) {
    const y = top + r * 20;
    if (r < rows) lines += `M${x} ${y}h${w}`;
    const shift = r % 2 ? w / 2 : w / 4;
    lines += `M${x + shift} ${y - 20}v20`;
    if (!(r % 2)) lines += `M${x + shift + w / 2} ${y - 20}v20`;
  }
  return (
    <g>
      <rect x={x} y={top} width={w} height={GROUND - top} rx={2} />
      <path d={lines} opacity={0.6} />
    </g>
  );
}

/** The open internet: a globe on a stand. */
function Globe({ x, r = 28 }: { x: number; r?: number }) {
  const y = GROUND - 22 - r;
  return (
    <g>
      <path d={`M${x} ${y + r}V${GROUND}M${x - 14} ${GROUND}h28`} />
      <circle cx={x} cy={y} r={r} />
      <ellipse cx={x} cy={y} rx={r * 0.45} ry={r} fill="none" opacity={0.6} />
      <path d={`M${x - r} ${y}h${2 * r}M${x - r * 0.87} ${y - r / 2}h${r * 1.74}M${x - r * 0.87} ${y + r / 2}h${r * 1.74}`} opacity={0.6} />
    </g>
  );
}

/** The device: a phone standing on the ground. Children sit on its screen, around (0, 0) at its middle. */
function Phone({ x, w = 44, h = 84, children }: { x: number; w?: number; h?: number; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${GROUND - h / 2})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={7} />
      {children}
    </g>
  );
}

function WallDrawing() {
  return (
    <>
      <Ground />
      {[
        [44, 150],
        [74, 128],
        [70, 176],
      ].map(([x, y]) => (
        <rect key={`${x}`} x={x} y={y} width={20} height={20} rx={5} opacity={0.7} />
      ))}
      <rect x={120} y={GROUND - 13} width={12} height={12} />
      <rect x={152} y={GROUND - 13} width={12} height={12} />
      {/* The scanner's beam sweeps the ground in front of the wall; the packet it caught turns red. */}
      <path data-sweep className="danger beam" d="M214 62L156 250h52Z" />
      <rect className="danger" x={188} y={GROUND - 13} width={12} height={12} />
      <Wall x={220} top={70} />
      <circle className="danger lit" cx={214} cy={62} r={6} />
      <Ghost x={245} y={176} outline />
      <Ghost x={330} y={160} s={1.2} />
      <Globe x={420} />
    </>
  );
}

function CheckpointDrawing() {
  return (
    <>
      <Ground />
      <path d="M190 250V112M290 250V112M176 112h128" />
      <rect x={160} y={62} width={160} height={40} rx={2} />
      <text x={240} y={88} textAnchor="middle">
        #%&amp;*@!?$#%&amp;
      </text>
      {/* The censor's stamp is down: it went through the ghost and marked only the ground. */}
      <path className="danger" d="M240 112V232" />
      <rect className="danger lit" x={220} y={232} width={40} height={14} rx={2} />
      <Ghost x={240} y={246} s={1.5} outline />
      <Ghost x={382} y={236} s={1.5} />
    </>
  );
}

function TroubleDrawing() {
  const posts = [120, 190, 260, 330, 400];
  return (
    <>
      <Ground />
      <Phone x={50}>
        <circle className="danger lit" r={6} />
      </Phone>
      {/* The line carries the signal as far as the break. */}
      <path className="signal" d="M72 196Q98 204 120 178M120 178Q155 198 190 178M190 178Q225 198 260 178M260 178Q274 196 284 228" />
      <path d="M330 178Q316 196 306 228M330 178Q365 198 400 178M400 178Q436 196 472 186" />
      {posts.map((x, i) => (
        <g key={x}>
          <path d={`M${x} ${GROUND}V182`} />
          <circle className={i < 3 ? "signal lit" : i === 3 ? "danger lit" : undefined} cx={x} cy={175} r={7} />
        </g>
      ))}
      <Ghost x={300} y={142} />
      <circle cx={322} cy={150} r={9} fill="none" />
      <path d="M316 157l-7 8" />
    </>
  );
}

function ConnectDrawing() {
  const arc = "M62 150C110 54 200 62 246 86S372 110 420 172";
  return (
    <>
      <Ground />
      <Phone x={62} w={56} h={100}>
        <circle className="signal" r={13} cy={-8} fill="none" strokeWidth={4} />
        <path className="signal" d="M-12 26h24" />
      </Phone>
      <Wall x={222} top={110} w={48} />
      {/* The tunnel goes from the device through the wall to the open internet. */}
      <path className="signal tunnel" d={arc} />
      <path className="signal" d={arc} fill="none" />
      <Ghost x={140} y={96} s={0.7} />
      <Ghost x={246} y={98} s={0.7} outline />
      <Ghost x={345} y={124} s={0.7} />
      <Globe x={420} />
    </>
  );
}

function BarrierDrawing() {
  return (
    <>
      <Ground />
      {[110, 210, 310].map((x, i) => (
        <g key={x}>
          <rect x={x} y={150} width={40} height={GROUND - 150} rx={3} />
          {/* The eye of a passed barrier turns to the signal, and the barrier cracks. */}
          <circle className={i < 2 ? "signal lit" : "danger lit"} cx={x + 20} cy={166} r={5} />
          {i < 2 && <path d={`M${x + 20} 176l6 14-9 16 8 16`} opacity={0.6} />}
        </g>
      ))}
      <Ghost x={62} y={236} s={1.1} />
      <Ghost x={230} y={236} s={1.1} outline />
      <Globe x={424} />
    </>
  );
}

function RelayDrawing() {
  return (
    <>
      <Ground />
      {/* The crate, with its lid open away from the device. */}
      <rect x={40} y={196} width={76} height={GROUND - 196} rx={2} />
      <path d="M58 196v54M98 196v54M40 196l-22-46" />
      {/* A route on its way from the crate to its row. */}
      <path d="M96 176C120 110 170 96 214 132" strokeDasharray="3 5" opacity={0.6} />
      <g transform="translate(150 112)">
        <path d="M-12 0h24" />
        <circle cx={-12} r={4} />
        <circle cx={12} r={4} />
      </g>
      <Phone x={250} w={70} h={128}>
        <rect x={-24} y={-48} width={24} height={14} rx={2} />
        <circle className="signal lit" cx={20} cy={-41} r={4} />
        <path d="M-24-26h48M-24 14h48M-24 54h48" opacity={0.45} />
      </Phone>
      <Ghost x={388} y={244} s={1.5} />
    </>
  );
}

function NightDrawing({ phone = true }: { phone?: boolean }) {
  return (
    <>
      <Ground />
      <path d="M404 34A28 28 0 1 0 430 82A22 22 0 1 1 404 34Z" />
      {[
        [60, 50],
        [130, 28],
        [210, 64],
        [300, 36],
        [352, 92],
        [460, 120],
      ].map(([x, y]) => (
        <circle key={`${x}`} className="ink" cx={x} cy={y} r={1.2} />
      ))}
      {phone && (
        <>
          <Phone x={56}>
            <path className="signal" d="M-9 0h18" />
          </Phone>
          <text x={84} y={150} fontSize={12}>
            z
          </text>
          <text x={94} y={134} fontSize={15}>
            z
          </text>
        </>
      )}
      <path d="M306 250V158A42 42 0 0 1 390 158V250ZM294 250h108" />
      <path d="M352 118l-8 22 10 10-6 18" opacity={0.6} />
      <text x={348} y={206} textAnchor="middle" fontSize={15}>
        R.I.P.
      </text>
      <Ghost x={196} y={244} s={1.7} />
      {/* The lantern the ghost carries is the signal: it stays lit all night. */}
      <g data-bob>
        <path d="M222 196l22-12v8" />
        <circle className="signal glow" cx={244} cy={200} r={22} />
        <rect className="signal lit" x={238} y={192} width={12} height={16} rx={2} />
      </g>
    </>
  );
}

const DRAWINGS: Record<string, () => React.ReactNode> = {
  wall: WallDrawing,
  checkpoint: CheckpointDrawing,
  trouble: TroubleDrawing,
  connect: ConnectDrawing,
  barrier: BarrierDrawing,
  relay: RelayDrawing,
  night: () => <NightDrawing />,
  // The last chapter stands at the same place as the night watch. The download button takes the phone's corner.
  get: () => <NightDrawing phone={false} />,
};

export function Drawing({ id }: { id: string }) {
  const Scene = DRAWINGS[id];
  if (!Scene) return null;
  return (
    <svg className="story-drawing" viewBox={`0 0 ${W} 300`} aria-hidden="true">
      <Scene />
    </svg>
  );
}
