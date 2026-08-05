# NextGen Travel Agency — A Plain-Language Tour

*(Written for someone who knows nothing about programming.)*

---

## What is this website?

**NextGen Travel** is a modern travel agency website. Imagine a travel agent who works on the internet instead of an office. Visitors come to this site to:

- Look for inspiration on where to travel
- Search for flights, hotels, and visa information
- Learn about specific destinations (photos, maps, what to do there)
- Book a trip and pay for it
- Create an account to see their past bookings
- Contact the agency for help

On the owner's side, the same website has a hidden **"back office"** (admin dashboard) where the agency can manage bookings, customers, and website content.

---

## The main parts of the website (what visitors see)

### 1. Homepage (the front door)
When you open the site, you land on the homepage. It has:

- **A big search box in the middle of a beautiful photo.** This is the first thing visitors use. It lets them search for:
  - **Flights** — from where, to where, date, how many travelers, and which class (economy, business, etc.)
  - **Hotels** — destination, check-in/check-out dates, number of guests
  - **Visas** — pick your nationality and destination to check if you need a visa
- **A gallery of destinations.** Scrolling down, you see rows of photo cards — Amalfi, Kyoto, Santorini, Bali, Iceland, and many more. Each card is clickable and takes you to that destination's own page.
- **Inspirations section.** More beautiful imagery and ideas for trips.
- **About section.** Tells visitors what kind of company this is and what it values.
- **An interactive world map.** Clickable spots on a real map of the world, so people can explore destinations visually.

### 2. Destination pages (the showcase)
Click on any destination card (like "BALI" or "PARIS") and you go to a dedicated page for that place. It shows:
- Big photos of the place
- A description — what makes it special
- Practical info like best time to visit, how long to stay, what it costs
- A map of the area
- Traveler reviews (if any)
- An **availability checker** — visitors can pick dates to see if there's room, and see suggestions for nearby alternative dates if it's full

### 3. Search results
When someone searches for flights or hotels, they land on a results page that lists the options they can choose from, with filters to narrow things down (price, time, etc.).

### 4. Booking & Checkout
After choosing a trip, the visitor goes through a **checkout** process — like checking out at a store. It's a multi-step flow:
- Step 1: Contact and traveler details
- Step 2: Payment (credit/debit card processing)
- Step 3: Confirmation

When it's done, the site shows a "Booking Confirmed!" message and records the reservation.

### 5. Accounts (sign up / log in)
Visitors can create an account (using an email address). Logged-in users get a **profile page** where they can:
- See their booking history
- Update their personal details
- Upload a profile photo

There are also pages for **forgot password** and **email verification**, like every site that has logins.

### 6. Other useful pages
- **Contact** — a way to reach the agency, including WhatsApp
- **Help** — answers to common questions
- **Blog / Inspiration** — travel stories and ideas
- **Legal** — terms and privacy policies
- **Bookings lookup** — a way to look up a booking using a reference number

---

## The hidden "back office" (admin dashboard)

This is a **separate, private area** — only the agency owner can get in (it needs an admin login). Once inside, they can manage everything from one place:

- **Dashboard** — a summary with numbers (bookings, revenue, visitors)
- **Bookings** — see every reservation and change its status
- **Destinations** — add, edit, or remove destination pages
- **Trips** — manage package offers
- **Users** — view the people who signed up
- **Contacts** — see messages from the contact page
- **Newsletter** — see who subscribed to email updates
- **Logs** — a record of what's been happening on the site
- **Documents** — travel requirements / paperwork info

---

## Behind the scenes (still no programming talk)

Even though the visitor just sees pretty pages, several systems work together:

- **The pages** are built with plain web building blocks (HTML for structure, CSS for the pretty styling, and JavaScript for behavior). It uses **Bootstrap**, a ready-made kit of design pieces, which is why everything looks consistent.
- **The maps** use **Leaflet**, a free map tool (like the maps you see on weather sites).
- **Photos** come from Unsplash, a free stock photo library.
- **The database** is called **Supabase**. This is where all the real-world data lives — user accounts, bookings, newsletter signups. Think of it as a giant, secure filing cabinet in the cloud. It also handles logins.
- **Payments** are handled by **Paystack**, a payment service trusted across Africa. When someone books a trip, a secure payment window opens, the charge is made in Nigerian Naira (₦), and the site converts the price from US dollars automatically.
- **Flight data** is meant to come from a real flight information service called **Duffel**, so searches can show real airlines and prices. (Some parts use sample/demo data while the site is being built.)
- **The site is hosted on Vercel**, a service that keeps websites running on the internet so anyone can visit them.

---

## Where things stand (work in progress)

This is a **real client project** being built in stages. A lot works already, and a few things are still being finished:

**Working well:**
- Homepage with search box, destination gallery, world map, inspirations
- Destination pages with maps and availability checks
- Sign up / log in with email
- Checkout flow and payment setup
- Contact and newsletter forms
- The admin dashboard (managing bookings, destinations, users)
- Works on phones and tablets (responsive design)

**Still being built / planned:**
- Live real-world flight data on all searches (some still uses demo data)
- Fully finished payment processing on every flow
- A few booking and account features (like editing saved bookings)
- Final security and polish before launch

---

## Why it's designed this way

The whole feel of the site is deliberately **premium, calm, and beautiful** — big photos, elegant fonts, gentle scrolling animations, clean white spaces. That's on purpose: a travel site sells *dreams*, and the design is meant to make people feel like they're already on vacation. The owner's business decisions (flights first, hotels later, free tools to keep costs down) shaped which features exist today.

---

*Want a tour of any specific page in more detail? Just ask!*
