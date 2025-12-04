# UI Engineering Practices

This document outlines the core UI engineering practices, conventions, and libraries used in this project's frontend. The goal is to ensure consistency and efficiency in future UI development.

The UI is built using the **Shadcn/ui** methodology. This is not a traditional component library but a collection of reusable, accessible, and composable components built on top of Radix UI and Tailwind CSS.

## 1. Core Technologies

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Component Primitives:** Radix UI (for accessibility and headless logic, e.g., `@radix-ui/react-slot`)

## 2. Styling

Styling is handled exclusively by **Tailwind CSS**.

- **Utility-First:** Styles are applied directly in the JSX using Tailwind's utility classes (e.g., `bg-primary`, `text-lg`, `rounded-md`).
- **No Custom CSS Files:** Do not create separate CSS files for individual components. All styles should be achievable through Tailwind utilities.
- **`cn` Utility Function:** To conditionally apply classes and merge conflicting Tailwind classes, always use the `cn` utility function found in `lib/utils.ts`.

  ```tsx
  // Example from components/ui/button.tsx
  import { cn } from "@/lib/utils"

  <button className={cn("base-styles", { "conditional-class": someCondition })} />
  ```

## 3. Component Architecture

Components follow the Shadcn/ui pattern, emphasizing composability and reusability.

- **Location:** Reusable UI components are located in `components/ui/`.
- **`cva` for Variants:** Component variants (e.g., different sizes or colors for a button) are defined using `cva` (class-variance-authority). This keeps variant logic clean and co-located with the component.
- **Composition with `asChild`:** Components use `<Slot>` from Radix UI and an `asChild` prop to merge their functionality and styles with a child element. This allows for greater flexibility.

## 4. Theming and Visual Style

The design system is managed through **CSS variables** in `app/globals.css` and follows a consistent aesthetic.

### Technical Implementation
- **CSS Variables:** The system is not defined in a `tailwind.config.js` file. All colors, border-radius, and fonts are defined as CSS variables (e.g., `--background`, `--primary`) and consumed by Tailwind utilities. This system supports light and dark modes out of the box.
- **Applying the Theme:** To apply the dark theme to a section of the application, add the `dark` class to a parent container.

### Visual Style Guide
- **Overall Theme:** The application uses a consistent dark theme. The main page background is a very dark gray (`bg-[#111418]`), and primary content sections are placed in lighter charcoal-colored cards (`bg-[#181B20]`).

- **Containers & Structure:** Major UI sections ("cards") should be encapsulated with a large border radius and significant padding (e.g., `rounded-3xl p-7`). The main content area on a page is typically centered and width-constrained (`max-w-7xl mx-auto`).

- **Typography:**
  - Headings are typically large and semi-bold (e.g., `text-2xl font-semibold`).
  - Body text is off-white (`text-[#E4E6EB]`) or a muted light gray (`text-[#9BA1A6]`).
  - All text should be light-on-dark.

- **Interactive Elements:**
  - **Buttons:** Use the reusable `<Button>` component from `components/ui/button`. The primary action button style is green (`bg-[#22c55e]`). Secondary actions, especially within tables, are styled as small, rounded, white-outlined buttons.
  - **Tables:** Tables are minimalist, using a simple bottom border to separate rows (e.g., `border-b border-[#23262A]`).
  - **Inputs:** Use the reusable `<Input>` component, which is designed to follow the theme's styles for background, border, and ring color.

- **Color Usage:**
  - Color is used semantically and purposefully.
  - **Green (`text-emerald-400`)** should be used to indicate positive change, success, or upward trends.
  - **Red (`text-rose-400`)** should be used to indicate negative change, errors, or downward trends.
  - Avoid using default browser blue for any interactive elements.

## Summary for Generation

When generating new UI, adhere to these principles:

1.  **Build with Existing Components:** Whenever possible, compose new UI from the existing primitive components in `components/ui/`.
2.  **Use Theme-Aware Utilities:** Use utilities derived from the CSS variables (`bg-background`, `text-primary`, `text-foreground`) instead of hardcoded colors (`bg-black`, `text-blue-500`).
3.  **Follow the Visual Style:**
    - Encapsulate content in cards styled with `bg-[#181B20]`, `rounded-3xl`, and `p-7`.
    - Use `text-2xl font-semibold` for titles and `text-[#E4E6EB]` or `text-[#9BA1A6]` for body text.
    - Use semantic colors for indicating status (green for positive, red for negative).
4.  **Use `cva` for Variants:** If a new component requires different styles, define them as variants using `cva`.
5.  **Use the `cn` helper** for all `className` attributes to handle conditional and conflicting classes correctly.
