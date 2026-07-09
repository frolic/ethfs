# gunzip-scripts

An easy way to decompress on-chain, gzipped libraries in the browser with support for both UMD and ES modules.

## Available Versions

- **`gunzipScripts.js`** (4.5KB) - Default version for simple UMD/script injection
- **`gunzipScripts-esm.js`** (49.5KB) - Full ES module support with import rewriting

## How it works

This library looks for `<script>` tags with special type attributes:

- `type="text/javascript+gzip"` - For UMD/regular scripts
- `type="text/javascript+gzip;module"` - For ES modules (ESM version only)

Both use inline source via `src="data:application/gzip;base64,…"`.

> The non-standard `type` attributes prevent the browser from parsing/evaluating immediately, allowing us to handle decompression ourselves.

### Default Version
Decompresses gzipped contents and replaces `<script>` elements with new ones containing the decompressed source.

### ESM Version
Additionally supports ES modules with:
- Import path rewriting for relative imports
- Blob URL generation for modules
- Integration with es-module-shims for full ESM compatibility
- Support for `data-path` and `data-name` attributes for module identification

## How to use

### Default Version (UMD/Scripts)

For traditional libraries and UMD modules:

```html
<!-- gzipped libs -->
<script type="text/javascript+gzip" src="data:application/gzip;base64,..."></script>

<!-- decompress gzipped libs -->
<script src="gunzipScripts.js"></script>

<!-- use decompressed libs -->
<script>
  const scene = new THREE.Scene();
  // ...
</script>
```

### ESM Version (ES Modules)

For ES modules with import/export:

```html
<!-- gzipped ES modules -->
<script type="text/javascript+gzip;module" data-path="./myCode.js" src="data:application/gzip;base64,..."></script>
<script type="text/javascript+gzip;module" data-path="./utils.js" src="data:application/gzip;base64,..."></script>

<!-- decompress and setup module system -->
<script src="gunzipScripts-esm.js"></script>

<!-- entry point - required for execution -->
<script type="module-shim">
  import myCode from './myCode.js';
  myCode.init();
</script>
```

**Important:** You need at least one regular (non-gzipped) `<script type="module-shim">` as an entry point to start execution. The gzipped modules are decompressed and made available for import, but they won't execute automatically.

Both versions run automatically after inclusion. For manual control:

```html
<!-- Manual triggering -->
<script>
  // Wait for processing to complete (ESM version only)
  document.addEventListener('gunzipScriptsReady', () => {
    console.log('All modules processed and ready');
  });

  // Manual re-run (safe to call multiple times)
  gunzipScripts();
</script>
```

## Module Attributes (ESM Version)

- `data-path="./path/to/module.js"` - Relative path for import resolution
- `data-name="moduleName"` - Named module for bare imports

Example:
```html
<script type="text/javascript+gzip;module"
        data-path="./components/Button.js"
        src="data:application/gzip;base64,..."></script>
```

Allows imports like:
```javascript
import { Button } from './components/Button.js';
```
