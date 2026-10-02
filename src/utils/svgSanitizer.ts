/**
 * SVG Sanitizer & Boundary Validation Engine for Book Pilot
 * 
 * Rules strictly enforced:
 * 1. SUPPRESSION ABSOLUE DES PANNEAUX/CASES TRANSLUCIDES :
 *    Strips cards, glassmorphism overlays, frosted glass panels, and semi-transparent
 *    boxes that might have been accidentally generated.
 * 2. END-TO-END CANVAS BOUNDARY CONTAINMENT :
 *    Enforces viewBox="0 0 800 1200", overflow="hidden", and clipPath boundary guard.
 * 3. REMOVAL OF ROGUE TEXT TAGS :
 *    Background vector artwork must remain purely graphical; no hardcoded titles or badges.
 * 4. AVOID DOUBLE-CLIPPING :
 *    Prevents multiple nested clipPaths on repeated sanitization passes.
 */

export interface SvgValidationResult {
  isValid: boolean;
  sanitizedSvg: string;
  removedPanelsCount: number;
  removedTextTagsCount: number;
  clippingEnforced: boolean;
}

export function sanitizeCoverSvg(rawSvg: string): string {
  const result = validateAndSanitizeCoverSvg(rawSvg);
  return result.sanitizedSvg;
}

export function validateAndSanitizeCoverSvg(rawSvg: string): SvgValidationResult {
  let cleaned = (rawSvg || '').trim();
  let removedPanelsCount = 0;
  let removedTextTagsCount = 0;

  // 1. Strip markdown fences if present
  if (cleaned.startsWith('```xml')) cleaned = cleaned.replace(/^```xml\s*/i, '').replace(/\s*```$/i, '');
  else if (cleaned.startsWith('```svg')) cleaned = cleaned.replace(/^```svg\s*/i, '').replace(/\s*```$/i, '');
  else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');

  // 2. Extract strictly from <svg to </svg>
  const svgStart = cleaned.indexOf('<svg');
  const svgEnd = cleaned.lastIndexOf('</svg>');
  if (svgStart === -1 || svgEnd === -1) {
    return {
      isValid: false,
      sanitizedSvg: rawSvg,
      removedPanelsCount: 0,
      removedTextTagsCount: 0,
      clippingEnforced: false
    };
  }

  cleaned = cleaned.substring(svgStart, svgEnd + 6);

  // 3. Remove rogue <text> and <tspan> tags from background artwork
  const textMatches = cleaned.match(/<text[\s\S]*?<\/text>/gi);
  if (textMatches) {
    removedTextTagsCount += textMatches.length;
    cleaned = cleaned.replace(/<text[\s\S]*?<\/text>/gi, '');
  }
  const selfClosingText = cleaned.match(/<text[^>]*?\/>/gi);
  if (selfClosingText) {
    removedTextTagsCount += selfClosingText.length;
    cleaned = cleaned.replace(/<text[^>]*?\/>/gi, '');
  }

  // 4. Thorough removal of unwanted translucent boxes/panels (cards, glassmorphism, overlays)
  // Strips any <rect> that is NOT the 100% opaque canvas background, when it has:
  // - Translucency (opacity < 0.95, fill-opacity < 0.95, rgba/hsla fill)
  // - Rounded corners (rx/ry) with card-like dimensions
  // - Explicit card/panel classes or IDs
  cleaned = cleaned.replace(/<rect([^>]*?)(?:\/>|>[\s\S]*?<\/rect>)/gi, (match, attrs) => {
    const isFullCanvas =
      /(?:width=["'](?:100%|800)["'].*?height=["'](?:100%|1200)["'])|(?:x=["']0["'].*?y=["']0["'].*?width=["'](?:100%|800)["'])/i.test(
        attrs
      );

    // If it's the root background covering the full canvas with 100% opacity, preserve it
    const isOpaqueFullBg = isFullCanvas && !attrs.includes('rx=') && !attrs.includes('ry=') &&
      !/opacity=["']0?\.[0-8]/i.test(attrs) && !/fill-opacity=["']0?\.[0-8]/i.test(attrs) &&
      !/fill=["'](?:rgba|hsla)\([^)]*,\s*0?\.[0-8]/i.test(attrs);

    if (isOpaqueFullBg) {
      return match;
    }

    const hasCardClassOrId = /(?:class|id)=["'][^"']*(?:card|panel|overlay|box|glass|backdrop|text-bg|banner|frame|container|modal)[^"']*["']/i.test(attrs);
    
    // Check for translucency in attributes
    const hasTranslucency =
      /opacity=["'](?:0?\.[0-9]+)["']/i.test(attrs) ||
      /fill-opacity=["'](?:0?\.[0-9]+)["']/i.test(attrs) ||
      /fill=["'](?:rgba|hsla)\(/i.test(attrs) ||
      /style=["'][^"']*(?:opacity|fill-opacity)\s*:\s*0?\.[0-9]+/i.test(attrs);

    const hasCardRounding = /r[xy]=["'](?:[4-9]|[1-9][0-9]+)["']/i.test(attrs);

    // If it has rounded corners or translucency and is not the opaque root background, remove it!
    if (hasCardClassOrId || (hasTranslucency && !isFullCanvas) || (hasCardRounding && (hasTranslucency || !isFullCanvas))) {
      removedPanelsCount++;
      return ''; // Strip the translucent panel!
    }

    return match;
  });

  // Also remove <g> groups that have opacity < 0.95 whose sole purpose is a translucent background card
  cleaned = cleaned.replace(/<g[^>]*opacity=["']0?\.[0-9]+["'][^>]*>\s*<rect[^>]*\/>\s*<\/g>/gi, () => {
    removedPanelsCount++;
    return '';
  });

  // 5. Ensure root <svg> has standard viewBox, overflow="hidden", and proper attributes
  const rootTagMatch = cleaned.match(/<svg([^>]*)>/i);
  if (rootTagMatch) {
    let rootAttrs = rootTagMatch[1];

    if (!/viewBox=/i.test(rootAttrs)) {
      rootAttrs += ' viewBox="0 0 800 1200"';
    }

    if (/overflow=["'][^"']*["']/i.test(rootAttrs)) {
      rootAttrs = rootAttrs.replace(/overflow=["'][^"']*["']/i, 'overflow="hidden"');
    } else {
      rootAttrs += ' overflow="hidden"';
    }

    if (/preserveAspectRatio=/i.test(rootAttrs)) {
      rootAttrs = rootAttrs.replace(/preserveAspectRatio=["'][^"']*["']/i, 'preserveAspectRatio="xMidYMid slice"');
    } else {
      rootAttrs += ' preserveAspectRatio="xMidYMid slice"';
    }

    if (!/width=/i.test(rootAttrs)) rootAttrs += ' width="100%"';
    if (!/height=/i.test(rootAttrs)) rootAttrs += ' height="100%"';

    cleaned = cleaned.replace(/<svg[^>]*>/i, `<svg${rootAttrs}>`);
  }

  // 6. Wrap contents in a master clipPath ONLY IF not already clipped
  const alreadyClipped = cleaned.includes('pilot-canvas-clip');
  if (!alreadyClipped) {
    const openTagEnd = cleaned.indexOf('>');
    const closeTagStart = cleaned.lastIndexOf('</svg>');
    if (openTagEnd !== -1 && closeTagStart !== -1 && closeTagStart > openTagEnd) {
      const innerContent = cleaned.substring(openTagEnd + 1, closeTagStart);
      const clipDefId = 'pilot-canvas-clip-' + Math.random().toString(36).substring(2, 7);
      const guardedContent = `
        <defs>
          <clipPath id="${clipDefId}">
            <rect x="0" y="0" width="800" height="1200" />
          </clipPath>
        </defs>
        <g clip-path="url(#${clipDefId})">
          ${innerContent}
        </g>
      `;

      cleaned = cleaned.substring(0, openTagEnd + 1) + guardedContent + '</svg>';
    }
  }

  return {
    isValid: true,
    sanitizedSvg: cleaned,
    removedPanelsCount,
    removedTextTagsCount,
    clippingEnforced: true
  };
}
