
University Dashboard Project 

GROUP MEMBERS - 

Suthep Singh 2407170011 " Team Lead " 
Sami Parilti 2407080009 " Frontend " 
Lawrence Joseph Calleya 2308230002 " Database & Backend " 

The Course Registration System is a web application built with MongoDB, Express, React, and Node.js (MERN). It provides separate dashboards for administrators, advisors, and students to manage university course registration, course offerings, and academic records.
Implemented features include:
- Secure login and role-based access for administrators, advisors, and students.
- User account management, including creating, editing, deleting, and activating or deactivating accounts.
- Course section management, including schedules, rooms, instructors, and seat capacities.
- Advisor-managed registration, allowing advisors to register students and remove registrations.
- Available seat tracking, with seat counts updated when registrations change.
- Registration eligibility checks that prevent duplicate enrollment, full-section registration, timetable clashes, and registration for previously passed courses.
- Retake identification for failed courses.
- Academic history and earned-credit viewing for students.
- Manual add/drop workflow, using a downloadable form submitted by email to the assigned advisor.
- Add/drop deadlines and term finalization, which close request windows and lock further registration changes.

STEPS - 

```sh
npm install
npm install --prefix client
```

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
Set `MONGODB_URI` to an empty database and `JWT_SECRET` to your own secret.
Then run:

```sh
npm run seed
npm start
```

In another terminal, from the same directory:

```sh
npm run dev --prefix client
```

Open http://localhost:5173. The API runs on http://localhost:3000.
PowerShell users can use `npm.cmd` if script execution policy blocks `npm`.

ACCOUNTS -

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@stamford.edu | password123 |
| Advisor | advisor@stamford.edu | password123 |
| Student | sami@stamford.edu | password123 |




PROJECT FEATURES - 

Complete: Login and role-based dashboards, administrator account management, course section management, registration eligibility checks, seat-count updates, and academic history with earned-credit display.
Partly complete: Student self-registration is present in the interface, but student identity and ownership checks need further work in the registration API. Registration opening dates appear in the interface but are not fully handled by the backend. Term finalization exists in the backend but is not connected to the current advisor dashboard.
Manual workflow implemented: Add/drop requests use a downloadable form and email link. Submission, approval, and request-status tracking are handled outside the application.
Not attempted: Prerequisite checking, automated email notifications, and integration with the university’s live student-record system. Academic records use synthetic demonstration data.


