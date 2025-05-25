import { gunzipSync } from "fflate";
import { ES_MODULE_SHIMS_GZIPPED } from "./embedded-shims";
import { init, parse } from "es-module-lexer";

declare global {
  interface Window {
    gunzipSync: typeof gunzipSync;
    gunzipScripts: () => void;
    gunzipScriptsReady?: boolean;
    importShim?: {
      addImportMap(map: any): void;
      (specifier: string): Promise<any>;
    };
  }
}

interface ModuleInfo {
  content: string;
  path: string;
  isESM: boolean;
}

// Simplified URL resolution function adapted from es-module-shims
function resolveUrl(relUrl: string, parentUrl: string): string {
  // Handle absolute URLs
  if (relUrl.includes('://') || relUrl.startsWith('//')) {
    return relUrl;
  }
  
  // Handle relative URLs
  const parentBase = parentUrl.split('/').slice(0, -1).join('/');
  
  if (relUrl.startsWith('./')) {
    return parentBase + '/' + relUrl.slice(2);
  }
  
  if (relUrl.startsWith('../')) {
    const segments = parentBase.split('/');
    const relSegments = relUrl.split('/');
    
    let i = 0;
    while (relSegments[i] === '..' && segments.length > 0) {
      segments.pop();
      i++;
    }
    
    return segments.join('/') + '/' + relSegments.slice(i).join('/');
  }
  
  // Handle root-relative URLs
  if (relUrl.startsWith('/')) {
    const parentOrigin = parentUrl.split('/').slice(0, 3).join('/');
    return parentOrigin + relUrl;
  }
  
  // Default relative resolution
  return parentBase + '/' + relUrl;
}

// Rewrite import statements in module content using es-module-lexer
async function rewriteImports(content: string, moduleUrl: string, importMap: Record<string, string>): Promise<string> {
  try {
    // Initialize es-module-lexer if needed
    await init;
    
    // Parse the module to find imports
    const [imports] = parse(content, moduleUrl);
    
    if (imports.length === 0) {
      console.log('No imports found in module');
      return content;
    }
    
    console.log('Found', imports.length, 'imports to process');
    
    // Process imports from end to start to maintain correct indices
    let rewrittenContent = content;
    for (let i = imports.length - 1; i >= 0; i--) {
      const imp = imports[i];
      const importUrl = content.slice(imp.s, imp.e);
      
      console.log('Processing import:', importUrl);
      
      // Skip non-relative imports
      if (!importUrl.startsWith('./') && !importUrl.startsWith('../')) {
        console.log('Skipping non-relative import:', importUrl);
        continue;
      }
      
      // Resolve relative import to absolute
      const resolvedUrl = resolveUrl(importUrl, moduleUrl);
      console.log('Resolved', importUrl, '->', resolvedUrl);
      
      // Check if we have this resolved URL in our import map and rewrite to absolute specifier
      let finalUrl = importUrl; // Start with original
      for (const [key, value] of Object.entries(importMap)) {
        if (key === resolvedUrl || key === importUrl) {
          // Rewrite to the absolute key that import map can resolve
          if (key.startsWith('./')) {
            finalUrl = key.substring(2); // "./three.core.js" -> "three.core.js"
          } else {
            finalUrl = key;
          }
          console.log('Found in import map:', key, 'rewriting to absolute:', finalUrl);
          break;
        }
        // Also check if the filename matches
        const fileName = resolvedUrl.split('/').pop();
        if (key === fileName || key === './' + fileName) {
          finalUrl = fileName; // Use just the filename as absolute specifier
          console.log('Found filename match in import map:', key, 'rewriting to:', finalUrl);
          break;
        }
      }
      
      // Always rewrite relative imports to absolute specifiers
      if (finalUrl !== importUrl) {
        console.log('Rewriting import:', importUrl, '->', finalUrl);
        rewrittenContent = rewrittenContent.slice(0, imp.s) + finalUrl + rewrittenContent.slice(imp.e);
      }
    }
    
    return rewrittenContent;
  } catch (error) {
    console.error('Failed to rewrite imports:', error);
    return content; // Return original content if rewriting fails
  }
}

const gunzipScripts = async () => {
  console.log('gunzipScripts starting...');
  
  const umdScripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="text/javascript+gzip"][src]'
  );
  const esmScripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="text/javascript+gzip;module"][src]'
  );

  console.log('Found scripts:', { umd: umdScripts.length, esm: esmScripts.length });

  const modules: ModuleInfo[] = [];
  const importMap: { imports: Record<string, string>; scopes?: Record<string, Record<string, string>> } = { imports: {}, scopes: {} };

  const processScript = (script: HTMLScriptElement, isESM: boolean): ModuleInfo | null => {
    try {
      console.log('Processing script:', script.src.substring(0, 50) + '...');
      const parsed = script.src.match(/^data:(.*?)(?:;(base64))?,(.*)$/);
      if (!parsed) {
        console.log('Failed to parse data URI');
        return null;
      }

      const [_, _type, encoding, data] = parsed;
      const buffer = Uint8Array.from(
        encoding ? atob(data) : decodeURIComponent(data),
        (c) => c.charCodeAt(0)
      );
      const decoder = new TextDecoder();
      const content = decoder.decode(gunzipSync(buffer));

      console.log('Decompressed content length:', content.length);

      const dataPath = script.getAttribute('data-path') || script.getAttribute('data-name');
      const path = dataPath || (isESM ? `module-${Date.now()}-${Math.random()}` : '');

      return { content, path, isESM };
    } catch (e) {
      console.error("Could not gunzip script", script, e);
      return null;
    }
  };

  for (const script of umdScripts) {
    const moduleInfo = processScript(script, false);
    if (moduleInfo) {
      modules.push(moduleInfo);
      console.log('Creating UMD script with content:', moduleInfo.content.substring(0, 100) + '...');
      const newScript = document.createElement("script");
      newScript.textContent = moduleInfo.content;
      script.parentNode?.replaceChild(newScript, script);
      console.log('UMD script replaced');
    }
  }

  // Process ESM scripts and store for later rewriting
  for (const script of esmScripts) {
    const moduleInfo = processScript(script, true);
    if (moduleInfo) {
      modules.push(moduleInfo);
      script.remove();
    }
  }

  // Now process all ESM modules with import rewriting
  if (modules.some(m => m.isESM)) {
    console.log('Processing ESM modules with import rewriting...');
    
    // First pass: create basic import map entries
    for (const moduleInfo of modules.filter(m => m.isESM)) {
      if (moduleInfo.path) {
        // We'll use the path as the key for now, update with blob URL later
        importMap.imports[moduleInfo.path] = 'placeholder';
        
        // Add mapping for relative imports
        if (!moduleInfo.path.startsWith('./') && !moduleInfo.path.startsWith('/')) {
          importMap.imports['./' + moduleInfo.path] = 'placeholder';
        }
        
        // For files like "./three.core.js", also map without the "./" prefix
        if (moduleInfo.path.startsWith('./')) {
          const absolutePath = moduleInfo.path.substring(2);
          importMap.imports[absolutePath] = 'placeholder'; // Add absolute version for rewritten imports
        }
      }
    }
    
    // Second pass: rewrite imports and create blob URLs
    for (const moduleInfo of modules.filter(m => m.isESM)) {
      try {
        // Create a fake URL for this module to use as base for relative resolution
        const moduleUrl = moduleInfo.path || `module-${Date.now()}`;
        const fakeBaseUrl = `https://example.com/${moduleUrl}`;
        
        console.log('Rewriting imports for module:', moduleUrl);
        
        // Rewrite imports in the module content
        const rewrittenContent = await rewriteImports(moduleInfo.content, fakeBaseUrl, importMap.imports);
        
        // Create blob URL with rewritten content
        const blob = new Blob([rewrittenContent], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        console.log('Creating ESM module blob with rewritten imports:', { path: moduleInfo.path, blobUrl });

        // Update import map with actual blob URL
        if (moduleInfo.path) {
          importMap.imports[moduleInfo.path] = blobUrl;
          
          if (!moduleInfo.path.startsWith('./') && !moduleInfo.path.startsWith('/')) {
            importMap.imports['./' + moduleInfo.path] = blobUrl;
          }
          
          if (moduleInfo.path.startsWith('./')) {
            const absolutePath = moduleInfo.path.substring(2);
            importMap.imports[absolutePath] = blobUrl; // Add absolute version for rewritten imports
          }
        }
      } catch (error) {
        console.error('Failed to process module:', moduleInfo.path, error);
        // Fallback to original content
        const blob = new Blob([moduleInfo.content], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        if (moduleInfo.path) {
          importMap.imports[moduleInfo.path] = blobUrl;
        }
      }
    }

    console.log('Final import map:', JSON.stringify(importMap, null, 2));
  }

  if (modules.some(m => m.isESM)) {
    console.log('Setting up ESM support...');
    if (!window.importShim) {
      console.log('Loading es-module-shims...');
      const base64Data = ES_MODULE_SHIMS_GZIPPED.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const shimsCode = new TextDecoder().decode(gunzipSync(buffer));
      
      const shimScript = document.createElement("script");
      shimScript.textContent = shimsCode;
      document.head.appendChild(shimScript);
      
      // Wait for es-module-shims to be ready, then add import map
      const waitForShims = () => {
        if (window.importShim) {
          console.log('Setting import map after shims load...', JSON.stringify(importMap, null, 2));
          if (Object.keys(importMap.imports).length > 0) {
            window.importShim.addImportMap(importMap);
            console.log('Import map added successfully - gunzipScripts ready!');
            // Signal that gunzipScripts is complete
            window.gunzipScriptsReady = true;
            document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
          } else {
            console.log('No imports to add to map');
            window.gunzipScriptsReady = true;
            document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
          }
        } else {
          // Retry after a short delay
          // setTimeout(waitForShims, 10);
        }
      };
      waitForShims();
    } else if (Object.keys(importMap.imports).length > 0) {
      console.log('Adding import map to existing shims...', JSON.stringify(importMap, null, 2));
      window.importShim.addImportMap(importMap);
      console.log('Import map added to existing shims - gunzipScripts ready!');
      window.gunzipScriptsReady = true;
      document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
    } else {
      console.log('No ESM modules found - gunzipScripts ready!');
      window.gunzipScriptsReady = true;
      document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
    }
  } else {
    console.log('No ESM modules found - gunzipScripts ready!');
    window.gunzipScriptsReady = true;
    document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
  }
}

// Run after DOM is loaded to ensure all script tags are available
if (document.readyState !== 'complete') {
  document.addEventListener('DOMContentLoaded', () => gunzipScripts());
} else {
  gunzipScripts();
}

window.gunzipSync = gunzipSync;
window.gunzipScripts = gunzipScripts;

export { gunzipScripts, gunzipSync };