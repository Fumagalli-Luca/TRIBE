const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

const PURPLE = '#7C3AED';
const BLUE = '#38BDF8';
const BG = '#0B0B0F';

// Monogramma "T" geometrico: gambo verticale + barra orizzontale, angoli
// arrotondati, coerente con il wordmark usato nelle email (TRI viola / BE blu).
function monogram({ fill, size = 1024, scale = 1 }) {
  const s = size * scale; // altezza totale del glifo
  const cx = size / 2;
  const top = size / 2 - s / 2;
  const barW = s * 0.66;
  const barH = s * 0.2;
  const stemW = s * 0.2;
  const overlap = barH * 0.35; // lo stelo si infila leggermente sotto la barra, niente cuciture visibili
  const stemY = top + barH - overlap;
  const stemH = s - barH + overlap;
  return `
    <g>
      <rect x="${cx - barW / 2}" y="${top}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${fill}" />
      <rect x="${cx - stemW / 2}" y="${stemY}" width="${stemW}" height="${stemH}" rx="${stemW / 2}" fill="${fill}" />
    </g>
  `;
}

function writePng(svg, outFile, width = 1024) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const png = resvg.render().asPng();
  fs.writeFileSync(outFile, png);
  console.log('wrote', outFile);
}

// 1) icon.png — icona principale (iOS/generic), sfondo pieno + monogramma bianco
writePng(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${PURPLE}"/>
        <stop offset="100%" stop-color="${BLUE}"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
    ${monogram({ fill: '#FFFFFF', size: 1024, scale: 0.72 })}
  </svg>`,
  path.join(ASSETS, 'icon.png')
);

// 2) android-icon-background.png — solo sfondo sfumato
writePng(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${PURPLE}"/>
        <stop offset="100%" stop-color="${BLUE}"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#g)"/>
  </svg>`,
  path.join(ASSETS, 'android-icon-background.png')
);

// 3) android-icon-foreground.png — solo monogramma, trasparente, dentro la safe zone (~66%)
writePng(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    ${monogram({ fill: '#FFFFFF', size: 1024, scale: 0.42 })}
  </svg>`,
  path.join(ASSETS, 'android-icon-foreground.png')
);

// 4) android-icon-monochrome.png — silhouette singolo colore (per icone tematizzate Android 13+)
writePng(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    ${monogram({ fill: '#FFFFFF', size: 1024, scale: 0.42 })}
  </svg>`,
  path.join(ASSETS, 'android-icon-monochrome.png')
);

// 5) splash-icon.png — monogramma sfumato, trasparente (usato da expo-splash-screen)
writePng(
  `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${PURPLE}"/>
        <stop offset="100%" stop-color="${BLUE}"/>
      </linearGradient>
    </defs>
    ${monogram({ fill: 'url(#g)', size: 1024, scale: 0.6 })}
  </svg>`,
  path.join(ASSETS, 'splash-icon.png')
);

// 6) favicon.png — versione piccola per web
writePng(
  `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${PURPLE}"/>
        <stop offset="100%" stop-color="${BLUE}"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" fill="url(#g)"/>
    ${monogram({ fill: '#FFFFFF', size: 256, scale: 0.72 })}
  </svg>`,
  path.join(ASSETS, 'favicon.png'),
  256
);

console.log('Done.');
