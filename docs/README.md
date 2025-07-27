# Claude Code Prompt: Build a Tablet-Friendly Internal SOP Website for Restaurant Krong Thai

This prompt is intended to be provided to Claude Code (or any capable AI code model) to generate the codebase and templates for a fully-featured SOP website for internal staff use at Restaurant Krong Thai.

---

## ✨ Project Overview

**Goal:** Build a tablet-friendly internal website that houses all SOPs (Standard Operating Procedures) of Restaurant Krong Thai with form tracking, bilingual support, and PIN-based staff access.

---

## 🔒 Access Control

* No public access
* PIN-based access only (no passwords)
* PINs managed manually via config or Supabase table
* Once entered, grant persistent session access for 8 hours

---

## 🔮 Brand Guidelines (apply site-wide)

* **Primary Colors:**

  * Krong Red `#E31B23`
  * Krong Black (Deep Charcoal) `#231F20`
  * Krong White (Crisp Off-White) `#FCFCFC`

* **Accent Colors:**

  * Golden Saffron `#D4AF37`
  * Jade Green `#008B8B`
  * Earthen Beige/Sand `#D2B48C`

* **Font Headings:** Trajan Pro 3 or EB Garamond SC fallback

* **Font Body:** Minion Pro or "Source Serif Pro", serif

* **Font UI:** Inter, sans-serif

* **Text Colors:** Black `#231F20`, Off-White `#FCFCFC`

* **Button Hover:** Background shifts to Golden Saffron `#D4AF37`, text to white

* **Logo:** Use uploaded `restaurant-krong-thai-horizontal-lock-up-1.png` or icon-only PNGs on header

---

## 📖 SOP Categories (each will be a collapsible section)

1. Front-of-House Operations
2. Back-of-House Operations
3. Inventory Management
4. Staff Scheduling & HR
5. Cleaning & Hygiene
6. Customer Experience
7. Compliance & Safety
8. Cash Handling & Till Management
9. Vendor & Supplier Management
10. Reservations & Takeout Management
11. Emergency Protocols
12. Maintenance & Equipment Logs
13. Daily Sales Reconciliation & Reporting
14. Health Inspection Readiness
15. Seasonal Menu & Cost Change SOP
16. Sustainability SOP

Each section contains bilingual content (EN + FR), optionally toggleable.

**System Status**: Phase 2+ Enhanced Complete (Health Score: 9.9/10)  
**Features**: 60+ React components, 20+ API endpoints, analytics client wrappers, Cypress E2E testing

---

## ⚙️ Supabase Schema Recommendations

1. **pins**

   * `pin_code: string`
   * `role: enum('admin', 'staff')`
   * `expires_at: timestamp`

2. **form\_submissions**

   * `form_type: string`
   * `data: jsonb`
   * `submitted_by: string`
   * `submitted_at: timestamp`

3. **audit\_logs**

   * `event: string`
   * `user: string`
   * `details: jsonb`
   * `timestamp: timestamp`

---

## ⚡ Features (Break into 1000 Tasks)

1. Set up project (Next.js or Astro) with Tailwind CSS and Inter/Source Serif
2. Set up routing structure for 16 SOP sections
3. Create collapsible UI layout with tablet-first design
4. Add bilingual toggle for EN / FR SOPs
5. Create reusable template component
6. Add PIN login page with persistent 8-hour cookie
7. Track session state using localStorage or Supabase auth
8. Generate sidebar navigation with SOP categories
9. Add search bar for SOP titles or keywords
10. Each SOP page renders bilingual content + action templates
11. Each template opens as modal or embedded form
12. Embed fillable fields with autosave in localStorage
13. Add analytics hooks to track usage (page visit, form filled)
14. Create dashboard (admin-only) for analytics summary
15. Add export-to-PDF for forms and logs
16. Embed static brand assets (logos, colors)
17. Add print stylesheet for SOP printout
18. Make all UI elements large and touch-friendly for tablets
19. Include full offline mode fallback using service worker
20. Add push notification for daily logs/checklist reminders
21. Add QR code generator module for feedback or SOP sharing
22. Add role-based access support in Supabase
23. Add PIN management UI for admin (view/expire PINs)
24. Add dark mode toggle for night use
25. Add emergency SOP quick-access button on all pages

---

## 🌟 Output Format

* File structure in Markdown
* All components as `.tsx` or `.jsx`
* Tailwind CSS classes inline
* SOP content in Markdown or JSON for future CMS import
* French and English stored side-by-side with toggle

---

## ✅ Completion Criteria

The project is complete when:

* All SOPs and templates are accessible and fillable via tablet
* Site respects brand identity visually
* Admin can review SOP engagement and submission analytics
* Forms can be saved, exported, and tracked
* PIN login controls staff-only access
* The project is deployed to a hosting provider
* The project is accessible via a URL
* The project is responsive and works on all devices
* The project is secure and has a proper authentication system
* The project is scalable and can be easily maintained
* The project is easy to use and has a good user experience
* The project is easy to deploy and has a good deployment process
---

(Then continue with the existing `📋 Full SOP Content` and `📑 Template Specifications` that are already written below.)
