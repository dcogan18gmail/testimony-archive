# Design System — Testimony Archive

## Product Context
- **What this is:** A transcription tool for Holocaust survivor oral history interviews
- **Who it's for:** Researchers, academics, and a younger/media-focused audience working with oral histories
- **Space/industry:** Oral history, Holocaust education, digital archives
- **Project type:** Web app (Next.js)

## Aesthetic Direction
- **Direction:** Editorial/Refined
- **Decoration level:** Minimal. Typography and whitespace do the work. No gradients, patterns, or decorative elements.
- **Mood:** Reverent, clean, respectful. The interface should feel like opening a well-made book, not a SaaS dashboard. Modern and digital, not institutional or old-fashioned.
- **Reference sites:** USC Shoah Foundation (sfi.usc.edu), Fortunoff Archive (fortunoff.library.yale.edu), USHMM (ushmm.org). These informed the tone but the app is more modern and tool-oriented than these institutional sites.

## Typography
- **Display/Headings:** Libre Baskerville — Clean, authoritative book serif. Sharp and refined, not round or cartoony. Used for interview titles, page headings, and the product name only.
- **Body:** Plus Jakarta Sans — Warm geometric sans-serif with personality. Readable at small sizes, modern feel. Used for everything that isn't a heading: subheadings, body text, labels, buttons, metadata.
- **UI/Labels:** Plus Jakarta Sans (same as body, 600 weight for emphasis, 0.03em letter-spacing for uppercase labels)
- **Data/Tables:** Plus Jakarta Sans (tabular-nums)
- **Code/Mono:** Geist Mono (already loaded via next/font, used for timestamps)
- **Loading:** Google Fonts for Libre Baskerville (400, 700) and Plus Jakarta Sans (300, 400, 500, 600). Geist Mono via next/font.
- **Scale:**
  - Display: 32px Libre Baskerville
  - H1: 28px Libre Baskerville
  - H2: 22px Libre Baskerville
  - H3: 18px Plus Jakarta Sans 600
  - Body: 15px Plus Jakarta Sans 400
  - Small: 13px Plus Jakarta Sans 400
  - Caption: 11px Plus Jakarta Sans 400
  - Mono: 13px Geist Mono
- **Heading letter-spacing:** 0.01em (slightly open, never tight)
- **Body line-height:** 1.7

## Color
- **Approach:** Restrained. Warm stone neutrals with one quiet amber accent. No bright colors.
- **Primary accent:** #B08D57 (warm amber/bronze, for buttons and interactive elements)
- **Accent hover:** #997A4A
- **Neutrals (warm stone scale):**
  - Background: #FAFAF8
  - Card: #FFFFFF
  - Subtle: #F5F3F0
  - Border: #E5E0D8
  - Border hover: #D0C9BF
  - Muted text: #8C8578
  - Faint text: #B5AFA6
  - Body text: #4A4540
  - Heading text: #2C2824
- **Semantic (muted versions):**
  - Success: #5E8C6A
  - Warning: #C4973B
  - Error: #B85C5C
- **Dark mode:** None. The warm light palette is part of the tone and is intentional for this content.

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable. Transcripts need breathing room.
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined. Clean columns, predictable alignment.
- **Max content width:** 900px (single column), 1152px (two-column detail page)
- **Border radius:** sm: 4px, md: 8px, lg: 12px

## Motion
- **Approach:** Minimal-functional only
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms)
- **Rule:** No animated elements, no bouncy transitions. Subtle hover/focus transitions only.

## API Key UX
- First-time visitors see a focused setup screen to enter keys
- After keys are saved, the setup collapses to a small settings icon in the header
- Keys should never dominate the page layout

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-20 | Initial design system created | Created by /design-consultation. Researched Shoah Foundation, Fortunoff Archive, USHMM, TheirStory, and Trint for visual baseline. |
| 2026-03-20 | Libre Baskerville + Plus Jakarta Sans chosen | User rejected Instrument Serif (too round, tight kerning, cartoony). Chose Libre Baskerville headings for authority + Plus Jakarta Sans body for modern warmth. |
| 2026-03-20 | No dark mode | Intentional. The warm light palette is part of the respectful tone for this content. |
| 2026-03-20 | Warm stone neutrals over cool zinc | Every archive/memorial site uses warm tones. Cool grays felt too clinical for oral histories. |
