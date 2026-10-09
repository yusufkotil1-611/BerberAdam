/**
 * Önce/Sonra galerisi için stilize SVG portre çizimleri.
 * Gerçek müşteri fotoğrafları eklendiğinde (bkz. Gallery.tsx → GALLERY) bu çizimlerin yerini alır.
 */
export type HairStyle = "messy" | "long" | "fade" | "classic";
export type BeardStyle = "none" | "patchy" | "overgrown" | "sculpted";

interface PortraitProps {
  hair: HairStyle;
  beard: BeardStyle;
  skin: string;
  hairColor: string;
  mood: "before" | "after";
  id: string;
}

// Sabit tohumlu sözde-rastgele (SSR ile istemci aynı çıktıyı üretsin)
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const HAIR_PATHS: Record<HairStyle, string> = {
  messy:
    "M98 240 C78 170 92 96 170 66 C205 52 258 58 292 96 C322 130 322 190 302 240 C296 206 286 178 268 160 C240 168 214 150 196 158 C172 150 148 168 130 160 C112 180 104 212 98 240 Z",
  long: "M96 310 C68 200 84 100 160 66 C205 50 262 60 296 100 C332 140 332 236 304 310 C296 266 292 224 282 192 C262 152 232 138 200 138 C168 138 138 152 118 192 C108 224 104 266 96 310 Z",
  fade: "M128 178 C124 132 146 100 200 94 C254 100 276 132 272 178 C262 152 240 138 200 136 C160 138 138 152 128 178 Z",
  classic:
    "M114 204 C102 140 134 84 204 78 C270 76 302 128 286 204 C280 170 262 146 236 140 C210 134 160 140 138 168 C128 182 120 194 114 204 Z",
};

const BEARD_PATHS: Record<Exclude<BeardStyle, "none" | "patchy">, string> = {
  overgrown:
    "M108 214 C102 300 138 376 200 392 C262 376 298 300 292 214 C280 260 266 290 244 304 C226 294 174 294 156 304 C134 290 120 260 108 214 Z",
  sculpted:
    "M119 232 C121 300 154 338 200 343 C246 338 279 300 281 232 L271 238 C267 280 245 307 200 309 C155 307 133 280 129 238 Z",
};

export function Portrait({ hair, beard, skin, hairColor, mood, id }: PortraitProps) {
  const after = mood === "after";
  const rnd = lcg(id.length * 97 + (after ? 7 : 3));
  const stubble = beard === "patchy" ? Array.from({ length: 70 }, () => ({ x: 130 + rnd() * 140, y: 262 + rnd() * 78, r: 0.8 + rnd() * 1.3 })) : [];
  const tufts = hair === "messy" ? [[104, 118, -26, -10], [150, 70, -8, -22], [250, 62, 14, -20], [300, 104, 24, -8], [284, 80, 18, -16]] : [];

  return (
    <svg viewBox="0 0 400 500" className="h-full w-full" role="img" aria-label={after ? "Sonra" : "Önce"} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={after ? "#2a2417" : "#1a1d24"} />
          <stop offset="1" stopColor={after ? "#0f0d08" : "#0c0e12"} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="38%" r="55%">
          <stop offset="0" stopColor={after ? "#f2c35a" : "#8a91a0"} stopOpacity={after ? 0.32 : 0.12} />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={skin} />
          <stop offset="1" stopColor={skin} stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id={`${id}-fadeL`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={hairColor} stopOpacity="0.75" />
          <stop offset="1" stopColor={hairColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="500" fill={`url(#${id}-bg)`} />
      <rect width="400" height="500" fill={`url(#${id}-glow)`} />

      {/* Omuzlar + boyun */}
      <path d="M30 500 C44 424 108 396 160 386 L240 386 C292 396 356 424 370 500 Z" fill={after ? "#232a36" : "#1b202a"} />
      <path d="M160 386 L200 440 L240 386" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <path d="M164 326 L164 394 C180 414 220 414 236 394 L236 326 Z" fill={skin} opacity="0.88" />
      <path d="M164 360 C184 378 216 378 236 360 L236 394 C220 414 180 414 164 394 Z" fill="#000" opacity="0.16" />

      {/* Uzun saç arka katman */}
      {hair === "long" && <path d={HAIR_PATHS.long} fill={hairColor} />}

      {/* Kulaklar */}
      <ellipse cx="117" cy="234" rx="13" ry="23" fill={skin} />
      <ellipse cx="283" cy="234" rx="13" ry="23" fill={skin} />

      {/* Yüz */}
      <path
        d="M200 118 C140 118 118 170 120 232 C122 300 156 346 200 348 C244 346 278 300 280 232 C282 170 260 118 200 118 Z"
        fill={`url(#${id}-skin)`}
      />
      {/* Işık / gölge: sonra halinde parlak ve sağlıklı cilt, önce halinde mat */}
      {after ? (
        <>
          <ellipse cx="168" cy="190" rx="30" ry="20" fill="#fff" opacity="0.1" />
          <ellipse cx="232" cy="262" rx="26" ry="16" fill="#fff" opacity="0.08" />
        </>
      ) : (
        <>
          <ellipse cx="165" cy="238" rx="16" ry="6" fill="#000" opacity="0.18" />
          <ellipse cx="235" cy="238" rx="16" ry="6" fill="#000" opacity="0.18" />
          <circle cx="152" cy="262" r="2" fill="#8a4b3a" opacity="0.45" />
          <circle cx="240" cy="190" r="1.8" fill="#8a4b3a" opacity="0.4" />
          <circle cx="214" cy="204" r="1.5" fill="#8a4b3a" opacity="0.35" />
        </>
      )}

      {/* Sakal */}
      {beard === "patchy" && (
        <g>
          <path d="M122 250 C126 306 156 340 200 344 C244 340 274 306 278 250 C262 290 240 306 200 308 C160 306 138 290 122 250 Z" fill={hairColor} opacity="0.42" />
          {stubble.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={hairColor} opacity="0.75" />
          ))}
          <path d="M120 300 q-6 14 4 26 M280 304 q8 12 -2 26 M200 346 q-4 12 6 20" stroke={hairColor} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
        </g>
      )}
      {(beard === "overgrown" || beard === "sculpted") && (
        <g>
          <path d={BEARD_PATHS[beard]} fill={hairColor} />
          <path
            d="M170 296 C184 286 194 291 200 296 C206 291 216 286 230 296 C220 306 208 306 200 303 C192 306 180 306 170 296 Z"
            fill={hairColor}
          />
          {beard === "sculpted" && (
            <path d="M129 238 C133 280 155 307 200 309 C245 307 267 280 271 238" fill="none" stroke="#f2c35a" strokeOpacity="0.55" strokeWidth="1.4" />
          )}
          {beard === "overgrown" && (
            <path d="M118 300 q-8 16 2 30 M282 300 q10 16 0 32 M170 380 q-2 10 6 14 M226 384 q6 8 12 6" stroke={hairColor} strokeWidth="4" strokeLinecap="round" fill="none" />
          )}
        </g>
      )}

      {/* Yüz hatları */}
      <path d="M200 226 L195 272 Q200 280 209 273" fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="165" cy="222" rx="10" ry="5.5" fill="#f4efe8" />
      <ellipse cx="235" cy="222" rx="10" ry="5.5" fill="#f4efe8" />
      <circle cx="166" cy="222" r="3.8" fill="#2a1d14" />
      <circle cx="236" cy="222" r="3.8" fill="#2a1d14" />
      <circle cx="167.5" cy="220.5" r="1.1" fill="#fff" />
      <circle cx="237.5" cy="220.5" r="1.1" fill="#fff" />
      <path d={after ? "M147 203 Q165 194 183 203" : "M146 206 Q163 194 184 200"} fill="none" stroke={hairColor} strokeWidth={after ? 5 : 6.5} strokeLinecap="round" />
      <path d={after ? "M217 203 Q235 194 253 203" : "M216 200 Q237 194 254 207"} fill="none" stroke={hairColor} strokeWidth={after ? 5 : 6.5} strokeLinecap="round" />
      <path
        d={beard === "none" ? "M178 308 Q200 322 222 308" : "M180 316 Q200 324 220 316"}
        fill="none"
        stroke={beard === "none" ? "#7a3f33" : "#d9a89a"}
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Saç */}
      {hair !== "long" && <path d={HAIR_PATHS[hair]} fill={hairColor} />}
      {hair === "long" && <path d="M118 192 C138 152 168 138 200 138 C232 138 262 152 282 192 C262 168 232 156 200 156 C168 156 138 168 118 192 Z" fill={hairColor} />}
      {hair === "fade" && (
        <>
          <path d="M120 236 C117 208 121 192 128 178 C139 192 141 214 143 240 Z" fill={`url(#${id}-fadeL)`} />
          <path d="M280 236 C283 208 279 192 272 178 C261 192 259 214 257 240 Z" fill={`url(#${id}-fadeL)`} />
          <path d="M132 176 C148 148 172 140 200 140 C228 140 252 148 268 176" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="2" />
        </>
      )}
      {hair === "classic" && (
        <>
          <path d="M172 96 C180 116 176 134 160 146" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M200 90 C230 96 262 112 276 150" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {hair === "messy" && (
        <>
          {tufts.map(([x, y, dx, dy], i) => (
            <path key={i} d={`M${x} ${y} q${dx} ${dy} ${dx * 1.6} ${dy * 0.4} q${-Math.abs(dx) * 0.2} ${Math.abs(dy) * 0.8} ${-dx * 1.2} ${Math.abs(dy) * 1.2} Z`} fill={hairColor} />
          ))}
          <path d="M130 120 q20 -26 48 -30 M200 76 q30 -6 52 10 M262 110 q16 14 22 40" stroke="#fff" strokeOpacity="0.1" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Sonra halinde pırıltılar */}
      {after && (
        <g fill="#f2c35a">
          <path d="M338 118 l4 12 12 4 -12 4 -4 12 -4 -12 -12 -4 12 -4 Z" />
          <path d="M62 188 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3 Z" opacity="0.8" />
          <path d="M312 330 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 Z" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}
