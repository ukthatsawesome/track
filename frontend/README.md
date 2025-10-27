# Track Frontend (Simple Guide)
This is the “front end” (the user-facing part) of the Track application. It’s a website that lets you log in and manage Batches, Bags, Forms, Submissions, and view Reports. You don’t need to be technical to use it — this guide explains everything in plain language.

## What This App Does
- Lets you log in securely and see your dashboard.
- Helps you create and manage “Batches” (groups of work).
- Lets you track “Bags” (individual items within batches).
- Lets you build “Forms” to collect information and see “Submissions”.
- Shows simple “Reports” to summarize your data.

Think of it like this:
- Batches: folders of related work.
- Bags: items inside a batch.
- Forms: questions you create to collect information.
- Submissions: answers people give to your forms.
- Reports: quick summaries to help you understand the data.

## What You Need (Before You Start)
- A computer running Windows.
- Internet access.
- Node.js (the app runner). Install the “LTS” version from `https://nodejs.org`.
- The backend API running somewhere (your tech team or you will have a URL, like `http://localhost:8000/api`).

## Project Location
- Folder: `h:\Batch\track\frontend\`

## First-Time Setup (Step-by-Step)
1. Open “Command Prompt”.
2. Go to the project folder:
   ```bash
   cd h:\Batch\track\frontend
3. Install the app:
   ```bash
   npm install
   ```
4. Set up backend:
   - Create a file named `.env` in the project folder.
   - Add the following lines to `.env`:
     ```
     VITE_API_URL=http://localhost:8000/api
     ```
     (Replace `http://localhost:8000/api` with your actual backend URL if different.)
5. Start the app:
   ```bash
   npm run dev
   ```
   (This will open the app in your browser at `http://localhost:5173`.)

Follow README.md in backend folder to set up the backend.


