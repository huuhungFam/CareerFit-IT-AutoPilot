# Design System Specification: The Architectural Career Portal
 
## 1. Overview & Creative North Star
**Creative North Star: "The Editorial Authority"**
 
To move beyond the generic "job board" aesthetic, this design system adopts an editorial approach to career management. We are not just building a database; we are crafting a professional legacy. The system breaks the traditional rigid grid by utilizing **intentional asymmetry**, **tonal layering**, and **expansive white space**. 
 
By prioritizing typographic scale and subtle depth over harsh lines, we create an environment that feels like a high-end business journal—authoritative, calm, and meticulously organized. This system is designed to build deep trust with candidates and employers alike through "Sophisticated Utility."
 
---
 
## 2. Colors: Tonal Depth & Soul
We move away from flat, "web-app" blues and whites. Instead, we use a palette that mimics physical materials—frosted glass, fine paper, and deep-inked accents.
 
### Color Tokens (Material Design 3 Logic)
- **Primary (The Authority):** `#00446e` (Core branding) | `#1e5c8b` (Container)
- **Secondary (The Catalyst):** `#006a62` (Action) | `#72f8e8` (Container)
- **Neutral Surface:** `#f7fafd` (Background) | `#ffffff` (Surface Lowest)
- **Status:** `#ba1a1a` (Error) | `#414141` (Tertiary/Neutral)
 
### The "No-Line" Rule
**Prohibition:** Designers are strictly prohibited from using 1px solid borders (`#CCCCCC` or similar) for sectioning. 
**The Solution:** Define boundaries through background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation a user needs without the visual noise of "boxes."
 
### The "Glass & Gradient" Rule
To inject visual "soul," primary CTAs and Hero sections should utilize subtle linear gradients:
- **Gradient 1 (Hero):** From `primary` (#00446e) to `primary_container` (#1e5c8b) at a 135-degree angle.
- **Glassmorphism:** For floating search bars or navigation overlays, use `surface_container_lowest` with a **24px backdrop-blur** and 80% opacity. This integrates the UI into the background rather than letting it feel "pasted on."
 
---
 
## 3. Typography: Editorial Scale
We pair **Plus Jakarta Sans** (Display/Headlines) with **Inter** (Body/UI) to create a contrast between modern confidence and technical precision.
 
| Role | Font Family | Size | Intent |
| :--- | :--- | :--- | :--- |
| **Display-LG** | Plus Jakarta Sans | 3.5rem | High-impact Hero statements. |
| **Headline-MD** | Plus Jakarta Sans | 1.75rem | Major section headers. |
| **Title-LG** | Inter | 1.375rem | Job titles and card headings. |
| **Body-MD** | Inter | 0.875rem | Default reading text. |
| **Label-SM** | Inter | 0.6875rem | Metadata, tags, and micro-copy. |
 
*Note: Use a 1.5x line-height for body text to ensure professional readability.*
 
---
 
## 4. Elevation & Depth: The Layering Principle
Depth in this system is achieved through **Tonal Layering** rather than structural lines.
 
- **The Stacking Principle:** Treat the UI as sheets of fine paper. 
  - Level 0: `surface` (The desk)
  - Level 1: `surface-container-low` (The workspace)
  - Level 2: `surface-container-lowest` (The active document/card)
- **Ambient Shadows:** When an element must float (e.g., a Job Card on hover), use an extra-diffused shadow: `box-shadow: 0 12px 32px -4px rgba(24, 28, 30, 0.06);`. 
- **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline-variant` token at **15% opacity**. It should be felt, not seen.
 
---
 
## 5. Component Logic
 
### Buttons: The Tactile Call-to-Action
- **Primary:** Gradient background (`primary` to `primary_container`), `xl` (0.75rem) corner radius. Use high-contrast `on_primary` text.
- **Secondary:** `surface_container_lowest` with a 1px "Ghost Border." No fill.
- **Interaction:** On hover, the gradient should shift slightly in saturation, and the element should lift by 2px using an Ambient Shadow.
 
### Cards: The "Containerless" Card
- **Style:** No borders. Background: `surface_container_lowest`.
- **Spacing:** Use 24px (1.5rem) internal padding.
- **Separation:** Never use a horizontal divider. Separate the job title from the company info using a 12px vertical spacing gap.
- **Job Tags:** Use `secondary_container` with `on_secondary_container` text. Keep corners `full` (pill shape).
 
### Input Fields & Search Bars
- **The Search Bar:** Should be treated as a "Signature Component." Use a `surface_container_lowest` background, `xl` corner radius, and a 20% opacity `primary` ghost border. 
- **Active State:** On focus, use a 2px outer glow of `secondary_fixed` at 30% opacity to signal "Ready."
 
### Tooltips & Overlays
- **Logic:** Use Glassmorphism (85% opacity `surface_container_highest` + backdrop blur).
- **Animation:** Elements should "fade and slide" up 8px over 200ms.
 
---
 
## 6. Do’s and Don’ts
 
### Do:
- **Use Asymmetry:** Place a large headline on the left and a floating "glass" card slightly offset to the right.
- **Embrace White Space:** If you think there is enough margin, add 8px more. White space conveys premium quality.
- **Use Tonal Backgrounds:** Use `surface-container-low` to wrap entire sections (like "Related Jobs") to create a natural break in the page flow.
 
### Don’t:
- **No 100% Black:** Never use `#000000`. Use `on_surface` (#181c1e) for text to maintain a soft, professional look.
- **No Sharp Corners:** Avoid `none` or `sm` roundedness unless it's for a technical data table. We prefer `lg` (0.5rem) or `xl` (0.75rem).
- **No Grid Dividers:** Do not use lines to separate list items. Use 16px of vertical space or a very subtle background shift on hover.