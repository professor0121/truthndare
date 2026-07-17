---
name: Obsidian Neon
colors:
  surface: '#141319'
  surface-dim: '#141319'
  surface-bright: '#3a383f'
  surface-container-lowest: '#0e0d13'
  surface-container-low: '#1c1b21'
  surface-container: '#201f25'
  surface-container-high: '#2b2930'
  surface-container-highest: '#35343b'
  on-surface: '#e5e1ea'
  on-surface-variant: '#d4c0d7'
  inverse-surface: '#e5e1ea'
  inverse-on-surface: '#312f36'
  outline: '#9d8ba0'
  outline-variant: '#504254'
  surface-tint: '#ebb2ff'
  primary: '#ebb2ff'
  on-primary: '#520072'
  primary-container: '#bc13fe'
  on-primary-container: '#ffffff'
  inverse-primary: '#9800d0'
  secondary: '#bdf4ff'
  on-secondary: '#00363d'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#ffb3b5'
  on-tertiary: '#680019'
  tertiary-container: '#e91648'
  on-tertiary-container: '#130002'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f8d8ff'
  primary-fixed-dim: '#ebb2ff'
  on-primary-fixed: '#320047'
  on-primary-fixed-variant: '#74009f'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#ffdada'
  tertiary-fixed-dim: '#ffb3b5'
  on-tertiary-fixed: '#40000c'
  on-tertiary-fixed-variant: '#920027'
  background: '#141319'
  on-background: '#e5e1ea'
  surface-variant: '#35343b'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  stats-code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered for a high-performance multiplayer social environment, blending the immersive depth of spatial computing with the aggressive precision of modern competitive gaming UI. The brand personality is "Electric Premium"—sophisticated yet high-energy.

The visual language utilizes **Glassmorphism** as its core structural principle, employing frosted surfaces and background blurs to create a sense of depth and hierarchy. Drawing inspiration from Apple VisionOS for its material stack and Valorant for its sharp, energetic accents, the system balances organic translucent layers with rigid, high-contrast interactive elements. The goal is to evoke a feeling of being inside a high-tech command center.

## Colors
This design system is natively dark. The foundation is **Deep Obsidian (#0B0A10)**, providing a high-contrast base for neon elements to pop. 

The palette uses a triad of "Hyper-Fluorescents":
- **Neon Purple:** The primary brand color, used for core interactions and brand presence.
- **Electric Blue:** Used for secondary actions, connectivity status, and "cool" UI accents.
- **Vibrant Pink:** Reserved for high-alert notifications, critical health stats, or "hot" social trending moments.

Glass surfaces are defined by a low-opacity white fill with a high-saturation background blur (30px–50px) to ensure legibility over complex gaming backgrounds.

## Typography
The typography strategy creates a clear distinction between "Social/Content" and "Data/Performance."

- **Headlines (Montserrat):** Used for impactful titles and navigation headers. The heavy weight (700-800) provides the "Valorant-style" urgency.
- **Body (Inter):** Used for chat messages, descriptions, and settings. Inter’s tall x-height ensures readability even against translucent, blurred backgrounds.
- **Stats (JetBrains Mono):** Reserved specifically for K/DA ratios, server pings, currency amounts, and technical metadata. This lends a "hacker/dev" aesthetic to the gaming data.

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous safe areas to accommodate floating glass panels. 

- **Desktop:** 12-column grid with 24px gutters. Content is typically centered in a 1440px container, though background "world" elements bleed to the edges.
- **Mobile:** 4-column grid with 16px margins. 
- **Rhythm:** An 8px base unit drives all spacing. Component internal padding should default to 24px (md) to maintain the "airy" feel of the glass panels.

Panels should rarely touch the edge of the screen; they should appear to "float" with at least 12px of margin from the viewport edge.

## Elevation & Depth
Depth is not communicated through traditional black shadows, but through **Luminance and Blur**.

- **Level 1 (Base):** Deep Obsidian solid background.
- **Level 2 (Panels):** Glass fill (5% white) with 40px Backdrop Blur and a 1px solid border (12% white).
- **Level 3 (Floating Modals/Tooltips):** Glass fill (10% white) with a soft outer glow using the primary color at 15% opacity (30px spread).
- **Level 4 (Interactive):** Active buttons and hovered states use a "bloom" effect—a high-intensity outer glow that mimics neon light reflecting off a surface.

## Shapes
The shape language is a mix of hyper-rounded containers and sharp internal accents. 

- **Main Containers:** All glass panels and cards must use a **24px (rounded-xl)** corner radius to feel premium and friendly (Social).
- **Interactive Accents:** Buttons and selection indicators may use smaller radii (8px) or "clipped" corners to inject the aggressive "Gaming" aesthetic.
- **Icons:** Use a consistent 2px stroke weight with slightly rounded ends.

## Components

### Buttons
- **Primary:** Vibrant gradient (Purple to Blue) with white bold Montserrat text. On hover, apply a `box-shadow` bloom of the primary color.
- **Ghost:** 1px glass border with a subtle hover fill.
- **Action Accents:** Use "Valorant-style" diagonal cuts on the corners of small action buttons (e.g., "Ready Up" or "Join").

### Floating Cards
- Cards must use the 24px roundedness.
- Use a 1px top-down inner gradient on the border to simulate a "light source" from above.
- Backgrounds must use `backdrop-filter: blur(30px)`.

### Inputs & Chat
- Input fields are dark glass with a bottom-only 2px border that glows Neon Blue when focused.
- Chat bubbles for the user should be a solid Neon Purple to Blue gradient; recipient bubbles are translucent glass.

### Stats & Chips
- Use JetBrains Mono for all numeric data.
- Chips should be semi-transparent with a high-saturation border of the color representing the stat (e.g., Green for "Online", Red for "In-Match").

### Progress Bars
- Use a "stutter" or segmented design for progress bars to feel more technical.
- The "fill" should be a moving gradient to indicate activity.