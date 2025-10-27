# Backend API — Simple Guide

This backend is a Django REST API for tracking production batches and their bags, attaching custom forms, collecting submissions, and returning the authenticated user’s profile.

- You call endpoints under `/api/`
- You authenticate with JSON Web Tokens (JWT)
- You can manage data via the admin panel at `/admin/`

---

## What You Can Do

- Batches: Create and manage production batches.
- Bags: Link bags to a batch.
- Forms: Define fields you want to collect (text, number, etc.) and attach them to batches or bags.
- Submissions: Record data for a form and associate it to a batch or bag.
- Me: Get info about the currently logged-in user (`GET /api/me/`).

---

## Requirements
- Postgres
- Python 3.11
- Django 4.2

---

## Environment Setup
- SECRET_KEY=
- DEBUG=True/False
- ALLOWED_HOSTS=localhost,127.0.0.1 
- DB_URL=postgresql://username:password@localhost:5432/database_name    
- CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

---

## Quick Start (Windows)

If you’re new to Python and Django, follow these steps carefully.

1) Create a virtual environment:

```
python -m venv venv
```

2) Activate the virtual environment:

```
venv\Scripts\activate
```

3) Install required packages:

```
pip install -r requirements.txt
```

4) Set up the database:

```
python manage.py migrate
```

5) Create a superuser:

```
python manage.py createsuperuser
```

6) Run the server:

```
python manage.py runserver
```
- Server: `http://localhost:8000/`
- Admin: `http://localhost:8000/admin/`
- API: `http://localhost:8000/api/`

---

## API Endpoints
# Batches API:
#   GET     /batches/           → List all batches
#   POST    /batches/           → Create a new batch
#   GET     /batches/{id}/      → Retrieve a batch
#   PUT     /batches/{id}/      → Update a batch
#   PATCH   /batches/{id}/      → Partially update a batch
#   DELETE  /batches/{id}/      → Delete a batch
#
# Bags API:
#   GET     /bags/              → List all bags
#   POST    /bags/              → Create a new bag
#   GET     /bags/{id}/         → Retrieve a bag
#   PUT     /bags/{id}/         → Update a bag
#   PATCH   /bags/{id}/         → Partially update a bag
#   DELETE  /bags/{id}/         → Delete a bag
#
# Form API:
#   GET     /forms/             → List all forms
#   POST    /forms/             → Create a new form
#   GET     /forms/{id}/        → Retrieve a form
#   PUT     /forms/{id}/        → Update a form
#   PATCH   /forms/{id}/        → Partially update a form
#   DELETE  /forms/{id}/        → Delete a form
#
# FormFields API:
#   GET     /formfields/        → List all form fields
#   POST    /formfields/        → Create a new form field
#   GET     /formfields/{id}/   → Retrieve a form field
#   PUT     /formfields/{id}/   → Update a form field
#   PATCH   /formfields/{id}/   → Partially update a form field
#   DELETE  /formfields/{id}/   → Delete a form field
#
# Submission API:
#   GET     /submissions/       → List all submissions
#   POST    /submissions/       → Create a new submission
#   GET     /submissions/{id}/  → Retrieve a submission
#   PUT     /submissions/{id}/  → Update a submission
#   PATCH   /submissions/{id}/  → Partially update a submission
#   DELETE  /submissions/{id}/  → Delete a submission
#
#
# User Info API:
#   GET     /me/                → Get authenticated user’s info