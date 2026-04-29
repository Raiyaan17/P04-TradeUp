---
name: Neo-Bauhaus Electric
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c1c6d7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8b90a0'
  outline-variant: '#414754'
  surface-tint: '#adc7ff'
  primary: '#adc7ff'
  on-primary: '#002e68'
  primary-container: '#4a8eff'
  on-primary-container: '#00285b'
  inverse-primary: '#005bc0'
  secondary: '#6fd6ff'
  on-secondary: '#003546'
  secondary-container: '#00bcee'
  on-secondary-container: '#00475c'
  tertiary: '#ffb695'
  on-tertiary: '#571e00'
  tertiary-container: '#ef6719'
  on-tertiary-container: '#4c1a00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#bce9ff'
  secondary-fixed-dim: '#64d3ff'
  on-secondary-fixed: '#001f2a'
  on-secondary-fixed-variant: '#004d63'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7c2e00'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  h1:
    fontFamily: Space Grotesk
    fontSize: 4.5rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  h2:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h3:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Space Grotesk
    fontSize: 1.25rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Space Grotesk
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 0.75rem
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  xxl: 80px
---

## Brand & Style

This design system reimagines the Bauhaus philosophy—where form follows function—through a contemporary digital lens. It merges the structural integrity of early 20th-century modernism with a high-energy, dark-mode aesthetic. The personality is precise, technical, and forward-leaning, aimed at users who value both architectural order and digital vibrancy.

The style is a hybrid of **Minimalism** and **High-Contrast Bold**. It utilizes a strict underlying grid to maintain discipline, while the electric blue accents break the monochromatic charcoal field to provide immediate visual hierarchy and a sense of "active" energy. It avoids unnecessary decoration, relying instead on geometry, purposeful whitespace, and the raw character of the typeface to communicate value.

## Colors

The palette is anchored by a "Charcoal" foundation, using varying depths of matte black and dark grey to create a sense of physical layering without relying on traditional shadows. 

- **Primary:** An "Electric Blue" (#007BFF) used exclusively for primary actions, critical states, and brand identifiers.
- **Secondary:** A lighter "Cyan Spark" (#2ECCFF) used for data visualization or secondary interactive elements to provide depth within the blue spectrum.
- **Neutrals:** A range of charcoal surfaces starting from a true-black background to lighter grey "elevations."
- **Functional:** Success, warning, and error states are handled with desaturated versions of green and red to ensure the primary blue remains the most vibrant element on screen.

## Typography

This design system uses **Space Grotesk** exclusively to maintain a cohesive, technical rhythm. The typeface’s idiosyncratic letterforms provide the "Neo" in the Neo-Bauhaus aesthetic—offering a futuristic feel that balances the rigid grid.

Headlines should be set with tight tracking to emphasize the geometric construction of the characters. For body copy, standard tracking is utilized to ensure legibility against the dark background. The "Label-caps" style is essential for navigational elements and small headers, providing a structural "blueprint" feel to the interface.

## Layout & Spacing

The layout is built on a **12-column fixed-fluid grid**. Content is contained within a max-width for desktop readability but utilizes fluid percentages for smaller breakpoints. 

Spacing is strictly mathematical, based on an 8px base unit. Negative space is used aggressively to separate functional groups rather than using divider lines. Elements should align to the grid's vertical rhythm to evoke the organized, modular feel of Bauhaus posters.

## Elevation & Depth

In this design system, depth is communicated through **Tonal Layers** and **Stroke Definition** rather than shadows. 

1.  **Surfaces:** Higher elevation is represented by lighter charcoal hex codes. A "Surface-High" container (#2D2D2D) sits visually "closer" to the user than the "Background" (#0A0A0A).
2.  **Borders:** Subtle 1px solid borders (using `surface-high` color) are used to define boundaries on low-contrast areas. 
3.  **Active State:** The only "glow" or soft depth allowed is a subtle outer bloom on Primary Blue elements when hovered, simulating a neon tube effect.

## Shapes

The design system uses a **Rounded** language to soften the industrial nature of the charcoal and the sharpness of the grid. 

- **Base Radius:** 0.5rem (8px) for standard buttons and input fields.
- **Large Radius:** 1rem (16px) for cards and main containers.
- **Contextual Shapes:** While corners are rounded, the overall silhouette of components must remain rectangular or square to preserve the Bauhaus architectural influence. Circular elements should be reserved strictly for avatars or status indicators.

## Components

- **Buttons:** Primary buttons use a solid Electric Blue background with white or black text depending on accessibility. Secondary buttons use a thick 2px Electric Blue border with no fill.
- **Inputs:** Dark charcoal fills with a bottom-only 2px border that turns Electric Blue on focus. Labels always sit above the input in the "Label-caps" style.
- **Cards:** Use the "Surface-Low" or "Surface-Mid" color. No shadows. If high emphasis is needed, use a 1px Electric Blue border.
- **Chips/Tags:** Small, pill-shaped elements with a "Surface-High" background and white text. Active tags use the Electric Blue background.
- **Navigation:** Vertical navigation is preferred for complex apps, echoing the structural "beams" of a building. Use high-contrast white for active icons and Electric Blue for a small vertical "indicator" bar.
- **Data Visualization:** Use the Electric Blue as the primary data point, with Cyan and Slate Grey for comparative data.