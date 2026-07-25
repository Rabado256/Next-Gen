# NextGen Travel Agency

A modern, premium travel agency platform designed to deliver a highly visual, serene, and curated travel-booking experience.

## Tech Stack
- HTML5, CSS3, Bootstrap 5.3
- Vanilla JavaScript (ES6+)
- Supabase (PostgreSQL, Auth, RLS)
- Leaflet.js for maps
- Google Fonts (Playfair Display, Inter)

## Project Structure
- `index.html` - Homepage with hero, curated collections, world map
- `search-results.html` - Search with multi-mode filtering
- `destination.html` - Immersive destination detail view
- `checkout.html` - Multi-step booking flow
- `admin.html` - Full-featured admin dashboard
- `style.css` - Custom styles with CSS variables
- `app.js` - Main application logic

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
