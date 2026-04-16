# Rochester DWI "Map My Minnesota DWI Path" Tool

**A microsite for K&H Minnesota Law's Rochester office** | [Main Site](https://khmnlaw.com) | [Contact](https://khmnlaw.com/contact-us/)

> Interactive, progressive-disclosure DWI triage tool for rochesterdwi.com. A mobile-first, step-by-step decision engine providing personalized legal next steps at the critical moment after arrest.

---

## Overview

This is a production-ready **interactive DWI case-path tool** for individuals who have just been arrested or cited for a DWI in Rochester, Minnesota. It is NOT a calculator or static form — it is a **smart assistant** that:

- Walks users through their situation one step at a time
- Adapts its tone and content based on the user's answers
- Shows a live, animated **visual roadmap** (STOP → TEST → LICENSE → COURT → OUTCOME → NEXT MOVE)
- Updates a **live risk meter** in real time as answers are provided
- Delivers a **premium results reveal** with personalized action plan, risk scorecard, timeline, and county-specific guidance

### Why This Approach?

At the moment of a DWI arrest, people are stressed, confused, and overwhelmed. A traditional form or calculator creates friction. This tool uses **progressive disclosure** — one question at a time with large, tappable cards — to feel like a conversation with a smart assistant rather than legal paperwork.

---

## Features

### Entry Hook (Stage 0)
Users pick their situation first, which primes the entire experience:
- "I was just stopped"
- "I was arrested last night"
- "I already got paperwork"
- "I'm worried about losing my license"
- "I have court coming up"
- "I'm most worried about the cost"

### Progressive Disclosure (Stages 1–5)
One question per screen with large, tappable answer cards:
1. **What happened?** (arrested / cited / unsure)
2. **Chemical test situation?** (breath / blood / urine / refused / unsure)
3. **Biggest fear?** (jail / license / interlock / cost / job / court)
4. **Prior DWI history?** (first / one prior / multiple)
5. **County?** (Olmsted / Blue Earth / Other)

### Visual Roadmap
An animated sidebar showing the DWI case path:
```
🚔 STOP → 🧪 TEST → 🪪 LICENSE → ⚖️ COURT → 📋 OUTCOME → 🎯 NEXT MOVE
```
- Lights up as the user progresses
- Adapts based on answers (e.g., refusal highlights LICENSE in red)
- Shows current position with a pulse animation
- Desktop: vertical sidebar; Mobile: compact horizontal top bar

### Live Risk Meter (Right Panel)
Real-time updates after each answer:
- **License Risk**: visual bar (green / amber / red) + percentage
- **Jail Risk**: visual bar (green / amber / red) + percentage
- **Urgency Score**: animated count (1–10) with color coding
- **Next Issue**: text description of most pressing concern
- **Likely Charge**: text description of probable charge level

### Smart Branching
The tool adapts based on answers:
- **Test Refusal**: Red urgency, dual-charge warning, alert node on roadmap
- **First Offense**: Calmer tone, focus on preserving options
- **Prior History**: Serious tone, mandatory minimums emphasized
- **Multiple Priors**: Critical tone, felony territory language
- **Olmsted County**: Local courthouse emphasis ("We know this court")

### Results Page (Premium Reveal)
A full personalized results page including:
- **Your DWI Snapshot** (urgency banner + likely charge)
- **Risk Scorecard** (license / jail / urgency grid)
- **Next 3 Steps** (actionable checklist with urgency labels)
- **Fear-Focused Section** (deep dive on biggest concern)
- **Mistakes to Avoid** (red warning cards)
- **Timeline** (7 days / 30 days / 90 days)
- **County-Specific Info** (local courthouse details)
- **CTA** (Call 507-625-5000 + contact form link)
- **Print / Email / Restart** actions
- **Legal Disclaimer**

---

## Brand & Design

### Color Palette

| Element | Hex | Usage |
|---------|-----|-------|
| Brand Primary | `#981e25` | CTAs, active states, highlights |
| Brand Alternate | `#121212` | Dark backgrounds, headings |
| Body Text | `#4a4a4a` | Paragraph text |
| Secondary BG | `#f2f2f2` | Card backgrounds, panels |
| Primary BG | `#ffffff` | Main content area |
| Risk Low | `#22c55e` | Green risk indicators |
| Risk Moderate | `#f59e0b` | Amber risk indicators |
| Risk High | `#ef4444` | Red risk indicators |

### CSS Variables
```css
:root {
  --brand-primary:    #981e25;
  --brand-alternate:  #121212;
  --text-body:        #4a4a4a;
  --bg-secondary:     #f2f2f2;
  --bg-primary:       #ffffff;
  --risk-low:         #22c55e;
  --risk-moderate:    #f59e0b;
  --risk-high:        #ef4444;
}
```

### Typography
System font stack for instant loading:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### Mobile-First Design
- 90%+ of traffic is expected on mobile
- All touch targets minimum **80px height** (exceeds 44px WCAG requirement)
- Cards use generous padding for comfortable tapping
- No dropdowns — card-based selection throughout
- Mobile: single-column layout with horizontal roadmap at top

---

## File Structure

```
rochesterdwi.com/
├── index.html                  Main entry point — app shell
├── css/
│   ├── styles.css              Global styles, CSS variables, layout, results
│   ├── journey.css             Animated roadmap (desktop sidebar + mobile top bar)
│   ├── cards.css               Answer cards, touch targets, selection states
│   └── risk-meter.css          Live risk panel, bars, urgency score animations
├── js/
│   ├── branching-engine.js     Smart conditional logic (tone, flags, warnings, roadmap)
│   ├── risk-calculator.js      Real-time risk scoring (license, jail, urgency, charge)
│   ├── results-generator.js    Dynamic HTML generation for results page
│   ├── animations.js           Stage transitions, roadmap updates, bar animations
│   └── app.js                  Main app state, question data, coordination
├── data/
│   ├── questions.json          All question variants (reference / documentation)
│   ├── branches.json           Branching logic rules (reference / documentation)
│   └── results.json            Results content templates (reference / documentation)
└── README.md                   This file
```

> **Note:** Question data is embedded directly in `js/app.js` for reliability (no fetch() required). The `data/*.json` files serve as documentation and can be used if a server-side integration is added.

---

## Architecture

### State Object
```javascript
const state = {
  stage:        0,      // 0 = entry, 1–5 = questions, 'results'
  entryChoice:  null,   // Stage 0: just-stopped | arrested | paperwork | license | court | cost
  situation:    null,   // Stage 1: arrested | cited | unsure
  testType:     null,   // Stage 2: breath | blood | urine | refused | unsure
  biggestFear:  null,   // Stage 3: jail | license | interlock | cost | job | court
  priorHistory: null,   // Stage 4: first | one-prior | multiple
  county:       null,   // Stage 5: olmsted | blue-earth | other
};
```

### Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `app.js` | State management, question rendering, answer handling, coordination |
| `branching-engine.js` | Tone determination, special flags, warnings, roadmap state |
| `risk-calculator.js` | License score, jail score, urgency score, likely charge |
| `results-generator.js` | Build full results HTML from state + risk data |
| `animations.js` | Stage transitions, roadmap node updates, risk bar animations |

### Risk Calculation

**License Risk Score (0–100):**
- Test refusal: 88 (baseline)
- Blood test: 65, Breath: 58, Urine: 60
- +10 for multiple priors, +7 for one prior
- +5 for arrested, -10 for cited only

**Jail Risk Score (0–100):**
- Multiple priors: 78 (baseline)
- One prior: 48, First offense: 20
- +12 for test refusal
- +6 for arrested, -8 for cited

**Urgency Score (1–10):**
- Test refusal: 8.5 base
- Blood: 6.5, Breath: 5.5
- +1.5 for multiple priors, +0.8 for one prior

---

## Contact & Business Details

| | |
|---|---|
| **Phone** | [507-625-5000](tel:5076255000) |
| **Email** | [intake@khmnlaw.com](mailto:intake@khmnlaw.com) |
| **Website** | [rochesterdwi.com](https://rochesterdwi.com) |
| **Main Site** | [khmnlaw.com](https://khmnlaw.com) |
| **Consultation** | 30 minutes, free |

---

## Technical Requirements

- **No external dependencies** — pure vanilla HTML/CSS/JavaScript
- **No build process required** — open index.html directly or deploy to any web server
- **No framework overhead** — lightweight, instant loading
- **ES5-compatible JavaScript** — works in all modern browsers
- **CSS custom properties** — easy to update brand colors in one place
- **ARIA labels** — accessible for screen readers
- **Print styles** — hides UI chrome, shows only content when printed

---

## WordPress Integration

**Option 1: Custom HTML Block**
1. Create a new WordPress page (e.g., `/map-my-dwi-path/`)
2. Add a "Custom HTML" block
3. Paste the `index.html` content (without `<html>`, `<head>`, `<body>` tags)
4. Enqueue `css/` and `js/` files via the theme or a plugin

**Option 2: Iframe Embed**
Host the files separately and embed via iframe:
```html
<iframe src="https://rochesterdwi.com/tool/" width="100%" height="900" frameborder="0"></iframe>
```

**Option 3: Standalone Page**
Deploy the entire directory as a standalone page at `rochesterdwi.com` (current setup).

---

## Deployment

No build step required. To deploy:

1. Upload all files to your web server maintaining the directory structure
2. Ensure `index.html` is the directory index
3. Verify all CSS and JS file paths load correctly
4. Test on mobile (Chrome DevTools device simulation recommended)

---

## Last Updated
April 2026

---

## License
Proprietary. © 2026 K&H Minnesota Law. All rights reserved.
