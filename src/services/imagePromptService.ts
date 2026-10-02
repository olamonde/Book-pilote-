/**
 * Image Prompt Intelligence Service for Book Pilot
 * 
 * Analyzes user prompts with precision to extract:
 * 1. Intent: General Image / Illustration VS Book Cover
 * 2. Visual Style: Natural, Smartphone Photo, Realistic Photo, 3D, Drawing/Sketch,
 *    Children's Book Illustration, Oil Painting, Watercolor, Cartoon/Anime, Pixel Art, Minimalist Icon, etc.
 * 3. Simplicity level: simple, standard, detailed
 * 4. Scene components: subject, action, environment, lighting, chromatic palette
 * 5. Strict Anti-Translucent-Panel enforcement
 */

export interface ImagePromptAnalysis {
  isCoverRequest: boolean;
  visualStyle: 
    | 'natural_scene'
    | 'photo_realistic'
    | 'photo_smartphone'
    | 'drawing_sketch'
    | 'three_d'
    | 'children_illustration'
    | 'oil_painting'
    | 'watercolor'
    | 'cartoon_anime'
    | 'pixel_art'
    | 'minimalist_icon'
    | 'futuristic_cinematic'
    | 'book_cover';
  styleLabel: string;
  isSimple: boolean;
  subject: string;
  action?: string;
  environment?: string;
  suggestedColors: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
    backgroundType: 'light' | 'dark' | 'natural' | 'colorful';
  };
}

export function analyzeImagePrompt(userPrompt: string, bookContext?: any): ImagePromptAnalysis {
  const text = (userPrompt || '').trim();
  const lower = text.toLowerCase();

  // 1. Detect if the user EXPLICITLY wants a book cover
  const explicitCoverKeywords = [
    'couverture de livre',
    'couverture pour mon livre',
    'couverture professionnelle',
    'book cover',
    'cover de livre',
    'première de couverture',
    'page de garde'
  ];
  const isExplicitCover = explicitCoverKeywords.some(kw => lower.includes(kw));

  // Single word "couverture" when used as the main intention
  const isCoverWord = /\b(couverture|cover)\b/i.test(lower);
  const isCoverRequest = isExplicitCover || (isCoverWord && !lower.includes('couverture de survie') && !lower.includes('sous la couverture'));

  // 2. Detect Simplicity constraint ("simple", "minimaliste", "basique")
  const isSimple = /\b(simple|très simple|minimal|minimaliste|épuré|basique|croquis simple|dépouillé)\b/i.test(lower);

  // 3. Detect Visual Style
  let visualStyle: ImagePromptAnalysis['visualStyle'] = 'natural_scene';
  let styleLabel = 'Scène naturelle';

  if (isCoverRequest) {
    visualStyle = 'book_cover';
    styleLabel = 'Couverture de livre';
  } else if (/\b(smartphone|téléphone|mobile|pris avec un téléphone|prise avec un téléphone|photo de portable|snapshot|photo amateur|sur le vif)\b/i.test(lower)) {
    visualStyle = 'photo_smartphone';
    styleLabel = 'Photo smartphone naturelle';
  } else if (/\b(3d|trois dimensions|blender|cgi|rendu 3d|personnage en 3d|personnage 3d|claymation|figurine 3d)\b/i.test(lower)) {
    visualStyle = 'three_d';
    styleLabel = 'Rendu 3D';
  } else if (/\b(enfant|enfants|jeunesse|illustration pour enfant|livre d'enfant|conte|dragon pour enfant|storybook|mignon|cute)\b/i.test(lower)) {
    visualStyle = 'children_illustration';
    styleLabel = 'Illustration pour enfant';
  } else if (/\b(dessin|croquis|sketch|crayon|fusain|esquisse|line art|dessiné|doodle)\b/i.test(lower)) {
    visualStyle = 'drawing_sketch';
    styleLabel = 'Dessin / Croquis';
  } else if (/\b(peinture à l'huile|peinture a l huile|huile sur toile|tableau à l'huile|oil painting)\b/i.test(lower)) {
    visualStyle = 'oil_painting';
    styleLabel = 'Peinture à l\'huile';
  } else if (/\b(aquarelle|watercolor|lavis|peinture aquarelle)\b/i.test(lower)) {
    visualStyle = 'watercolor';
    styleLabel = 'Aquarelle';
  } else if (/\b(dessin animé|cartoon|manga|anime|bande dessinée|bande dessinee|bd|comics)\b/i.test(lower)) {
    visualStyle = 'cartoon_anime';
    styleLabel = 'Dessin animé / Manga';
  } else if (/\b(pixel art|8-bit|16-bit|pixel)\b/i.test(lower)) {
    visualStyle = 'pixel_art';
    styleLabel = 'Pixel art';
  } else if (/\b(icône|icone|pictogramme|logo simple|symbole simple|silhouette simple|minimalist icon)\b/i.test(lower)) {
    visualStyle = 'minimalist_icon';
    styleLabel = 'Icône minimaliste';
  } else if (/\b(photo|photographie|réaliste|photo réaliste|photorealistic|portrait photo)\b/i.test(lower)) {
    visualStyle = 'photo_realistic';
    styleLabel = 'Photo réaliste';
  } else if (/\b(futuriste|cinématique|cinematic|hollywood|cyberpunk|sci-fi|dramatique|épique|film)\b/i.test(lower)) {
    visualStyle = 'futuristic_cinematic';
    styleLabel = 'Cinématique / Futuriste';
  } else if (isSimple) {
    visualStyle = 'minimalist_icon';
    styleLabel = 'Illustration épurée';
  }

  // 4. Determine Contextual Color Palette tailored to content (NOT forcing dark luxury!)
  let suggestedColors = {
    primaryColor: '#1e293b',
    secondaryColor: '#3b82f6',
    accentColor: '#10b981',
    textColor: '#ffffff',
    backgroundType: 'natural' as 'light' | 'dark' | 'natural' | 'colorful'
  };

  if (visualStyle === 'drawing_sketch') {
    suggestedColors = {
      primaryColor: '#fafafa',
      secondaryColor: '#18181b',
      accentColor: '#52525b',
      textColor: '#18181b',
      backgroundType: 'light'
    };
  } else if (visualStyle === 'children_illustration') {
    suggestedColors = {
      primaryColor: '#fef3c7',
      secondaryColor: '#f43f5e',
      accentColor: '#06b6d4',
      textColor: '#1e293b',
      backgroundType: 'colorful'
    };
  } else if (visualStyle === 'three_d') {
    suggestedColors = {
      primaryColor: '#0f172a',
      secondaryColor: '#6366f1',
      accentColor: '#f59e0b',
      textColor: '#f8fafc',
      backgroundType: 'colorful'
    };
  } else if (visualStyle === 'photo_smartphone') {
    suggestedColors = {
      primaryColor: '#78350f',
      secondaryColor: '#d97706',
      accentColor: '#059669',
      textColor: '#ffffff',
      backgroundType: 'natural'
    };
  } else if (visualStyle === 'oil_painting') {
    suggestedColors = {
      primaryColor: '#1c1917',
      secondaryColor: '#b45309',
      accentColor: '#84cc16',
      textColor: '#fef3c7',
      backgroundType: 'natural'
    };
  } else if (visualStyle === 'minimalist_icon') {
    suggestedColors = {
      primaryColor: '#f8fafc',
      secondaryColor: '#0f172a',
      accentColor: '#2563eb',
      textColor: '#0f172a',
      backgroundType: 'light'
    };
  } else if (visualStyle === 'futuristic_cinematic') {
    suggestedColors = {
      primaryColor: '#050714',
      secondaryColor: '#7c3aed',
      accentColor: '#06b6d4',
      textColor: '#f8fafc',
      backgroundType: 'dark'
    };
  } else if (visualStyle === 'natural_scene') {
    // Check subject keywords
    if (/parc|chien|herbe|arbre|jardin|fleur|nature/i.test(lower)) {
      suggestedColors = {
        primaryColor: '#14532d',
        secondaryColor: '#84cc16',
        accentColor: '#38bdf8',
        textColor: '#ffffff',
        backgroundType: 'natural'
      };
    } else if (/cuisine|femme|manger|repas|plat/i.test(lower)) {
      suggestedColors = {
        primaryColor: '#7c2d12',
        secondaryColor: '#ea580c',
        accentColor: '#fbbf24',
        textColor: '#ffffff',
        backgroundType: 'natural'
      };
    }
  }

  return {
    isCoverRequest,
    visualStyle,
    styleLabel,
    isSimple,
    subject: text,
    suggestedColors
  };
}

/**
 * Builds a tailored, highly specific SVG generation prompt for Gemini.
 * Strictly respects the user's aesthetic intent without adding unrequested luxury/cinematic bloat.
 */
export function buildTailoredSvgPrompt(
  userPrompt: string,
  analysis: ImagePromptAnalysis,
  bookContext?: any
): string {
  const cleanPrompt = userPrompt.trim();

  let styleInstructions = '';

  switch (analysis.visualStyle) {
    case 'drawing_sketch':
      styleInstructions = `Visual Style: CLEAN SKETCH / DRAWING.
- Pure vector line art, delicate pencil or ink stroke contours, fine cross-hatching.
- Neutral paper or off-white soft background (#fcfbf9 or clean light neutral).
- Clean, focused depiction of the subject. No heavy gradients, no dramatic cinematic effects.
${analysis.isSimple ? '- Keep the drawing simple, clear, and charming without unnecessary clutter.' : ''}`;
      break;

    case 'three_d':
      styleInstructions = `Visual Style: 3D CHARACTER / 3D SCENE.
- Rich 3D volume, rounded shapes, playful geometry with smooth specular highlights.
- Ambient occlusion, soft volumetric shadows, vibrant studio/room lighting.
- Render the 3D character/objects with joyful expression and solid dimensional depth.`;
      break;

    case 'children_illustration':
      styleInstructions = `Visual Style: CHILDREN'S BOOK ILLUSTRATION.
- Storybook aesthetic with soft, rounded, friendly shapes and whimsical curves.
- Warm, cheerful, inviting pastel color palette (soft blues, warm sunshine yellows, gentle greens, coral).
- Friendly character expressions (e.g. friendly dragon, smiling child), enchanting storybook feeling.
- No scary, dark, or overly complex elements.`;
      break;

    case 'photo_smartphone':
      styleInstructions = `Visual Style: AUTHENTIC SMARTPHONE PHOTO LOOK.
- Natural daylight, candid street-level perspective, spontaneous slice-of-life atmosphere.
- Authentic everyday colors (sunlight, ambient reflections, lively environment details).
- Avoid looking like a staged commercial luxury ad; focus on real, authentic warmth and human life.`;
      break;

    case 'photo_realistic':
      styleInstructions = `Visual Style: REALISTIC PHOTOGRAPHIC COMPOSITION.
- Natural proportions, authentic indoor or outdoor lighting, realistic scene setting.
- Plausible depth of field and natural shadows, true-to-life tones.`;
      break;

    case 'oil_painting':
      styleInstructions = `Visual Style: CLASSICAL OIL PAINTING.
- Rich, visible vector brushstroke textures, warm painterly blends, impressionistic or classical lighting.
- Deep, harmonious pigments (ochres, cadmium, deep greens, warm earth tones).
- Artistic canvas feeling with dappled lighting and organic textures.`;
      break;

    case 'watercolor':
      styleInstructions = `Visual Style: WATERCOLOR PAINTING.
- Soft transparent pigment washes, fluid edges, delicate color bleeding, organic brush textures.
- Light, luminous paper backdrop with pastel washes.`;
      break;

    case 'cartoon_anime':
      styleInstructions = `Visual Style: CARTOON / ANIME ART.
- Clean vector outlines, cel-shading with bold highlight and shadow cuts.
- Expressive stylized character design, lively energetic pose.`;
      break;

    case 'pixel_art':
      styleInstructions = `Visual Style: PIXEL ART.
- Distinct square grid pixel aesthetic, retro 16-bit color palette.
- Isometric or frontal pixel art staging with crisp digital edges.`;
      break;

    case 'minimalist_icon':
      styleInstructions = `Visual Style: MINIMALIST ICON / SYMBOL.
- Clean, crisp geometric silhouette with generous negative space.
- Highly readable, elegant simplicity. No cluttered patterns.
- Harmonious 2-tone or 3-tone color harmony.`;
      break;

    case 'futuristic_cinematic':
      styleInstructions = `Visual Style: FUTURISTIC CINEMATIC SCENE.
- Atmospheric lighting, neon or metallic reflections, futuristic architecture or sci-fi elements.
- Cinematic widescreen perspective and dramatic rim light.`;
      break;

    case 'book_cover':
      styleInstructions = `Visual Style: PROFESSIONAL BOOK COVER COMPOSITION.
- Elegant vertical composition suitable for a book cover background.
- Respect the book theme: "${bookContext?.title || cleanPrompt}".
- Genre: ${bookContext?.genre || 'General'}. Tone: ${bookContext?.tone || 'Harmonious'}.
- Leave balanced open space for typography while creating an engaging visual hook.`;
      break;

    case 'natural_scene':
    default:
      styleInstructions = `Visual Style: NATURAL & AUTHENTIC SCENE.
- Coherent, natural visual rendering matching the requested subject and setting.
- Natural lighting (e.g. bright day for an outdoor park, warm indoor lighting for a kitchen).
- Appropriate, authentic colors matching reality. Do NOT force dark luxury or dramatic movie lighting unless requested.`;
      break;
  }

  return `Generate high-quality vector graphic SVG code (viewBox="0 0 800 1200", width="100%", height="100%", overflow="hidden").

User Request: "${cleanPrompt}"
${styleInstructions}

CRITICAL ABSOLUTE REQUIREMENTS:
1. STRICT ANTI-TRANSLUCENT-PANEL MANDATE:
   - NEVER draw any semi-transparent rectangles, white/grey/black overlays, glassmorphism panels, floating cards, or text-backing boxes.
   - The scene must fill the canvas naturally without any artificial translucent UI card or placeholder rectangle.
2. NO EMBEDDED TEXT:
   - Do NOT draw any titles, subtitles, author names, badges, "EDITION I", or logos inside the SVG graphic. Keep the visual purely artistic.
3. VECTOR EXECUTION:
   - Use well-formed SVG elements (<path>, <circle>, <polygon>, <g>, <linearGradient>, <radialGradient>).
   - Ensure all coordinates stay within the 0 0 800 1200 viewBox bounds.
4. OUTPUT FORMAT:
   - Output ONLY valid, parseable SVG XML code.
   - Do NOT include any markdown code fences (like \`\`\`xml or \`\`\`), explanations, or comments before or after the SVG tag.`;
}

export interface NeutralPromptOptions {
  userPrompt: string;
  explicitStyle?: string;
  format?: 'square' | 'portrait' | 'landscape' | '1:1' | '3:4' | '16:9';
  mode?: 'image' | 'cover';
  bookContext?: {
    title?: string;
    subtitle?: string;
    author?: string;
    genre?: string;
    tone?: string;
    description?: string;
  };
}

export interface BuiltImagePrompt {
  finalPrompt: string;
  geminiAspectRatio: '1:1' | '3:4' | '16:9';
  dimensions: { width: number; height: number };
  detectedStyle: string;
  styleLabel: string;
  isCover: boolean;
  isRealisticPhoto: boolean;
}

/**
 * Builds a 100% neutral, prompt-first instruction for Gemini Image Generation / Fallback.
 * 
 * STRICT RULES:
 * 1. User prompt is KING.
 * 2. NO automatic "editorial", "luxury", "cinematic", "premium", "dramatic lighting" unless requested.
 * 3. Exact structure: [USER REQUEST] + [EXPLICIT STYLE] + [FORMAT] + [TECHNICAL CONSTRAINTS].
 * 4. Distinct isolation between Mode Image (pure artwork, 0 text, 0 frames) and Mode Cover.
 */
export function buildNeutralImagePrompt(options: NeutralPromptOptions): BuiltImagePrompt {
  const userText = (options.userPrompt || '').trim();
  const lower = userText.toLowerCase();
  const explicitStyle = (options.explicitStyle || '').trim();
  const explicitLower = explicitStyle.toLowerCase();

  // 1. Determine Cover VS Image Mode
  const isCover = options.mode === 'cover' || (
    options.mode !== 'image' && (
      lower.includes('couverture de livre') ||
      lower.includes('couverture pour mon livre') ||
      lower.includes('book cover')
    )
  );

  // 2. Determine Format / Aspect Ratio
  const rawFormat = options.format || (isCover ? 'portrait' : 'portrait');
  let geminiAspectRatio: '1:1' | '3:4' | '16:9' = '3:4';
  let dimensions = { width: 768, height: 1024 };

  if (rawFormat === 'square' || rawFormat === '1:1') {
    geminiAspectRatio = '1:1';
    dimensions = { width: 1024, height: 1024 };
  } else if (rawFormat === 'landscape' || rawFormat === '16:9') {
    geminiAspectRatio = '16:9';
    dimensions = { width: 1024, height: 576 };
  } else {
    geminiAspectRatio = '3:4';
    dimensions = { width: 768, height: 1024 };
  }

  // 3. Detect Style from explicit input OR from prompt text
  let detectedStyle = 'natural';
  let styleLabel = 'Naturel';
  let styleDirective = '';
  let isRealisticPhoto = false;

  const combinedStyleContext = `${explicitLower} ${lower}`;

  if (/\b(photo réaliste|photographie réaliste|photoréaliste|photorealistic|vraie photo|photo naturelle|photo pro|portrait photo)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'photo_realistic';
    styleLabel = 'Photographie réaliste';
    isRealisticPhoto = true;
    styleDirective = 'Realistic photography, natural lighting, photorealistic textures, authentic skin tones and human anatomy, sharp focus, real-world depth of field.';
  } else if (/\b(smartphone|téléphone|mobile|photo de portable|snapshot|sur le vif)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'photo_smartphone';
    styleLabel = 'Photo smartphone';
    isRealisticPhoto = true;
    styleDirective = 'Candid natural smartphone photo snapshot, ambient daylight, authentic everyday life perspective, realistic unstaged scene.';
  } else if (/\b(dessin|croquis|sketch|crayon|fusain|line art|pencil)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'drawing_sketch';
    styleLabel = 'Dessin / Croquis';
    const isSimple = /\b(simple|basique|épuré)\b/i.test(combinedStyleContext);
    styleDirective = isSimple
      ? 'Clean simple pencil sketch drawing, fine line art, minimal delicate graphite strokes, clean paper background.'
      : 'Detailed hand-drawn pencil sketch, expressive linework, cross-hatching, fine artistic graphite art.';
  } else if (/\b(3d|blender|cgi|rendu 3d|personnage 3d|trois dimensions)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'three_d';
    styleLabel = 'Rendu 3D';
    styleDirective = 'High-end 3D digital CGI render, smooth volumetric geometry, soft studio ambient lighting, polished character and object modeling.';
  } else if (/\b(enfant|enfants|jeunesse|illustration pour enfant|livre d'enfant|conte|storybook)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'children_illustration';
    styleLabel = 'Illustration enfant';
    styleDirective = 'Charming children\'s book storybook illustration, whimsical friendly character design, gentle warm color harmony, inviting storybook atmosphere.';
  } else if (/\b(peinture à l'huile|peinture a l huile|huile sur toile|oil painting)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'oil_painting';
    styleLabel = 'Peinture à l\'huile';
    styleDirective = 'Classical fine art oil painting, rich visible textured impasto brushstrokes, artistic painterly lighting and palette on canvas.';
  } else if (/\b(aquarelle|watercolor)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'watercolor';
    styleLabel = 'Aquarelle';
    styleDirective = 'Delicate watercolor painting, transparent color washes, soft pigment bleeding, natural textured art paper.';
  } else if (/\b(pixel art|8-bit|16-bit)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'pixel_art';
    styleLabel = 'Pixel art';
    styleDirective = 'Crisp retro pixel art, 16-bit nostalgic game style, distinct pixel grid.';
  } else if (/\b(cinématique|cinematic|film|hollywood)\b/i.test(combinedStyleContext)) {
    detectedStyle = 'cinematic';
    styleLabel = 'Cinématique';
    styleDirective = 'Cinematic composition, atmospheric wide lighting, motion picture mood.';
  } else if (explicitStyle) {
    detectedStyle = 'custom_style';
    styleLabel = explicitStyle;
    styleDirective = `Specific requested style: ${explicitStyle}.`;
  } else {
    detectedStyle = 'natural';
    styleLabel = 'Naturel';
    styleDirective = '';
  }

  // 4. Mode-specific constraints (strict separation between image and cover!)
  let modeDirective = '';
  if (isCover) {
    const title = options.bookContext?.title;
    modeDirective = `Vertical book cover visual composition${title ? ` for a book titled "${title}"` : ''}. Leave clean balanced space for title typography.`;
  } else {
    modeDirective = 'Pure standalone visual artwork. STRICT: Do NOT add any book cover borders, author text, titles, badges, or card frames.';
  }

  // 5. Anti-translucent card & quality constraints
  const technicalConstraints = 'STRICT: Clean cohesive scene, no semi-transparent overlay cards, no floating grey/white boxes, no watermark, sharp focus and high definition.';

  // 6. Assemble the NEUTRAL prompt: [DEMANDE] + [STYLE EXPLICITE] + [FORMAT] + [CONTRAINTES]
  const promptParts = [
    userText,
    styleDirective ? `Visual Style: ${styleDirective}` : null,
    modeDirective,
    technicalConstraints
  ].filter(Boolean);

  const finalPrompt = promptParts.join('. ');

  return {
    finalPrompt,
    geminiAspectRatio,
    dimensions,
    detectedStyle,
    styleLabel,
    isCover,
    isRealisticPhoto
  };
}
