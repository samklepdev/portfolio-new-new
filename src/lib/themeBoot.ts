import { THEME_STORAGE_KEY } from "./themeApply";

// Body of a blocking inline <script> that applies the visitor's saved public
// theme before first paint. Reads the embedded JSON (#__themes__) and sets each
// --* custom property on <html>. Self-contained (cannot import at runtime), so
// it duplicates the tiny var-setting loop. No-ops on an unknown/absent id.
export function buildThemeBootScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{` +
    `var id=localStorage.getItem(${JSON.stringify(storageKey)});if(!id)return;` +
    `var el=document.getElementById('__themes__');if(!el)return;` +
    `var themes=JSON.parse(el.textContent||'[]');` +
    `var t=themes.find(function(x){return String(x.id)===String(id);});` +
    `if(!t||!t.style)return;var root=document.documentElement;` +
    `Object.keys(t.style).forEach(function(k){root.style.setProperty(k,t.style[k]);});` +
    `}catch(e){}})();`;
}
