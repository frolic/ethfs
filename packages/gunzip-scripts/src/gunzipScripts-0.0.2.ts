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


// Normalize path by removing redundant segments
function normalizePath(path: string): string {
  const parts = path.split('/');
  const normalized = [];
  
  for (const part of parts) {
    if (part === '' || part === '.') {
      // Skip empty parts and current directory references
      continue;
    } else if (part === '..') {
      // Go up one directory
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '..') {
        normalized.pop();
      } else {
        normalized.push('..');
      }
    } else {
      normalized.push(part);
    }
  }
  
  // Ensure we maintain the ./ prefix for relative paths
  if (path.startsWith('./') && normalized.length > 0) {
    return './' + normalized.join('/');
  } else if (normalized.length === 0) {
    return './';
  } else {
    return normalized.join('/');
  }
}

// Resolve relative path imports
function resolveRelativePath(relPath: string, parentPath: string): string {
  // Strip query parameters and fragments from the import path
  const cleanPath = relPath.split('?')[0].split('#')[0];
  
  // Handle non-relative paths
  if (!cleanPath.startsWith('./') && !cleanPath.startsWith('../')) {
    return cleanPath;
  }
  
  // Get parent directory
  const parentDir = parentPath.substring(0, parentPath.lastIndexOf('/')) || '.';
  
  // Join the parent directory with the clean relative path
  const combinedPath = parentDir + '/' + cleanPath;
  
  // Normalize the combined path to remove redundant segments
  return normalizePath(combinedPath);
}

// Rewrite import statements in module content using es-module-lexer
async function rewriteImports(content: string, modulePath: string, importMap: Record<string, string>): Promise<string> {
  try {
    // Initialize es-module-lexer if needed
    await init;
    
    // Parse the module to find imports
    const [imports] = parse(content, modulePath);
    
    if (imports.length === 0) {
      return content;
    }
    
    // Process imports from end to start to maintain correct indices
    let rewrittenContent = content;
    for (let i = imports.length - 1; i >= 0; i--) {
      const imp = imports[i];
      const importUrl = content.slice(imp.s, imp.e);
      
      // Skip non-relative imports
      if (!importUrl.startsWith('./') && !importUrl.startsWith('../')) {
        continue;
      }
      
      // Resolve relative import to absolute path
      const resolvedPath = resolveRelativePath(importUrl, modulePath);
      
      // Check if we have this resolved path in our import map and rewrite to absolute specifier
      let finalUrl = importUrl; // Start with original
      for (const [key, value] of Object.entries(importMap)) {
        if (key === resolvedPath) {
          // Found exact match - rewrite to version without ./
          finalUrl = key.startsWith('./') ? key.substring(2) : key;
          break;
        }
      }
      
      // Always rewrite relative imports to absolute specifiers
      if (finalUrl !== importUrl) {
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
  const umdScripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="text/javascript+gzip"][src]'
  );
  const esmScripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="text/javascript+gzip;module"][src]'
  );

  const modules: ModuleInfo[] = [];
  const importMap: { imports: Record<string, string> } = { imports: {} };

  const processScript = (script: HTMLScriptElement, isESM: boolean): ModuleInfo | null => {
    try {
      const parsed = script.src.match(/^data:(.*?)(?:;(base64))?,(.*)$/);
      if (!parsed) return null;

      const [_, _type, encoding, data] = parsed;
      const buffer = Uint8Array.from(
        encoding ? atob(data) : decodeURIComponent(data),
        (c) => c.charCodeAt(0)
      );
      const decoder = new TextDecoder();
      const content = decoder.decode(gunzipSync(buffer));

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
      const newScript = document.createElement("script");
      newScript.textContent = moduleInfo.content;
      script.parentNode?.replaceChild(newScript, script);
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
    // First pass: create import map entries for each module
    for (const moduleInfo of modules.filter(m => m.isESM)) {
      if (moduleInfo.path) {
        importMap.imports[moduleInfo.path] = 'placeholder';
        
        // Also add version without ./ prefix for rewritten imports
        if (moduleInfo.path.startsWith('./')) {
          const withoutDot = moduleInfo.path.substring(2);
          importMap.imports[withoutDot] = 'placeholder';
        }
      }
    }
    
    // Second pass: rewrite imports and create blob URLs
    for (const moduleInfo of modules.filter(m => m.isESM)) {
      try {
        // Rewrite imports in the module content using the module's actual path
        const rewrittenContent = await rewriteImports(moduleInfo.content, moduleInfo.path || '', importMap.imports);
        
        // Create blob URL with rewritten content
        const blob = new Blob([rewrittenContent], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        // Update import map with actual blob URL
        if (moduleInfo.path) {
          importMap.imports[moduleInfo.path] = blobUrl;
          
          // Also update version without ./ prefix
          if (moduleInfo.path.startsWith('./')) {
            const withoutDot = moduleInfo.path.substring(2);
            importMap.imports[withoutDot] = blobUrl;
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

  }

  if (modules.some(m => m.isESM)) {
    if (!window.importShim) {
      const base64Data = ES_MODULE_SHIMS_GZIPPED.split(',')[1];
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const shimsCode = new TextDecoder().decode(gunzipSync(buffer));
      
      const shimScript = document.createElement("script");
      shimScript.textContent = shimsCode;
      document.head.appendChild(shimScript);
      
      // Wait for es-module-shims to be ready, then add import map
      const waitForShims = () => {
        if (window.importShim) {
          if (Object.keys(importMap.imports).length > 0) {
            window.importShim.addImportMap(importMap);
          }
          window.gunzipScriptsReady = true;
          document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
        } else {
          // Retry after a short delay
          setTimeout(waitForShims, 10);
        }
      };
      waitForShims();
    } else {
      if (Object.keys(importMap.imports).length > 0) {
        window.importShim.addImportMap(importMap);
      }
      window.gunzipScriptsReady = true;
      document.dispatchEvent(new CustomEvent('gunzipScriptsReady'));
    }
  } else {
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