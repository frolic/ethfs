const fs = require('fs');
const { gzipSync } = require('fflate');

// Read the es-module-shims source
const shimsPath = './node_modules/es-module-shims/dist/es-module-shims.js';
const shimsSource = fs.readFileSync(shimsPath, 'utf8');

// Gzip and base64 encode it
const gzipped = gzipSync(new TextEncoder().encode(shimsSource));
const base64 = Buffer.from(gzipped).toString('base64');

// Create the data URI
const dataUri = `data:application/gzip;base64,${base64}`;

console.log('ES Module Shims size:', shimsSource.length, 'bytes');
console.log('Gzipped size:', gzipped.length, 'bytes');
console.log('Base64 size:', base64.length, 'bytes');
console.log('Compression ratio:', Math.round((1 - gzipped.length / shimsSource.length) * 100) + '%');

// Write to a file that can be imported
const output = `// Auto-generated embedded es-module-shims
export const ES_MODULE_SHIMS_GZIPPED = "${dataUri}";
export const ES_MODULE_SHIMS_SIZE = ${shimsSource.length};
export const ES_MODULE_SHIMS_GZIPPED_SIZE = ${gzipped.length};
`;

fs.writeFileSync('./src/embedded-shims.ts', output);
console.log('Written to src/embedded-shims.ts');