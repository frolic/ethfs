import { gzipSync } from 'fflate';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestScript {
  content: string;
  type: 'umd' | 'esm';
  path?: string;
  name?: string;
}

export function createGzippedDataUri(content: string): string {
  const buffer = new TextEncoder().encode(content);
  const gzipped = gzipSync(buffer);
  const base64 = Buffer.from(gzipped).toString('base64');
  return `data:application/gzip;base64,${base64}`;
}

export function generateTestHtml(
  scripts: TestScript[],
  options: {
    title?: string;
    gunzipVersion?: 'default' | 'esm';
    additionalHead?: string;
    additionalBody?: string;
  } = {}
): string {
  const {
    title = 'Test gunzipScripts',
    gunzipVersion = 'esm',
    additionalHead = '',
    additionalBody = ''
  } = options;

  const scriptTags = scripts.map(script => {
    const dataUri = createGzippedDataUri(script.content);

    if (script.type === 'umd') {
      return `<script type="text/javascript+gzip" src="${dataUri}"></script>`;
    } else {
      const pathAttr = script.path ? `data-path="${script.path}"` : '';
      const nameAttr = script.name ? `data-name="${script.name}"` : '';
      const attrs = [pathAttr, nameAttr].filter(Boolean).join(' ');
      return `<script type="text/javascript+gzip;module" ${attrs} src="${dataUri}"></script>`;
    }
  }).join('\n    ');

  return `<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    ${additionalHead}
</head>
<body>
    <h1>${title}</h1>

    ${scriptTags}

    <!-- Load gunzipScripts -->
    <script src="../../dist/gunzipScripts${gunzipVersion === 'default' ? '' : '-' + gunzipVersion}.js"></script>

    ${additionalBody}
</body>
</html>`;
}

export function writeTestFile(filename: string, content: string): string {
  const testDir = join(__dirname, 'generated');
  mkdirSync(testDir, { recursive: true });
  const filepath = join(testDir, filename);
  writeFileSync(filepath, content);
  return filepath;
}