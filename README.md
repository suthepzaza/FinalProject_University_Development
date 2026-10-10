# FinalProject University Development

Requires Node.js/npm and a running MongoDB instance (local MongoDB or Atlas).

Authorization is enforced by the API: admins manage user accounts; advisors
manage offerings and registrations and read student histories; students read
offerings and their own records and registrations. Account creation is restricted
to admins (`POST /api/users`, or the admin-only `/api/auth/register` endpoint).
The login page requires a successful API login. Each protected request checks
the account's current role and active status, so disabled or deleted accounts
and old tokens carrying a previous role cannot retain access.

Run `npm test` (or `npm.cmd test` in PowerShell) for authorization tests. These
use mocked database queries and do not modify your database.
Run these commands from this directory after cloning:

```sh
npm install
cp .env.example .env
npm run seed
npm start
```

On Windows PowerShell use `Copy-Item .env.example .env` for the copy command.
Set `MONGODB_URI` in `.env` to an empty database before seeding. The server and
seed use the same URI. The seed refuses populated databases and never deletes
existing data. A failed write can leave partial data; use a fresh empty database
before retrying. Set `JWT_SECRET` to your own value in `.env`.

Expected seed output:

```text
25 students, 4 advisors, 1 admin created
18 courses, 26 sections created for term 2026-1
312 completed-course records created
```

All accounts use the demo password `password123`:

| Role | Email |
| --- | --- |
| Student | sami@stamford.edu |
| Student | alice@stamford.edu |
| Advisor | advisor@stamford.edu |
| Admin | admin@stamford.edu |

Other students are `student03@stamford.edu` through `student25@stamford.edu`;
other advisors are `advisor2@stamford.edu` through `advisor4@stamford.edu`.
Student IDs run from `2407080009` to `2407080033`.

Open http://localhost:3000 after starting the server. Accounts also work with
`POST /api/auth/login` using a JSON body with `email` and `password`.

The seed supplies deterministic synthetic demo data, including course-code
prerequisites, four advisors assigned to sections, and passing academic histories
from 2024-1 through 2025-2. Students are login accounts in the User collection,
as used by academic records and registration routes. Current registrations start
empty and all sections have 30 available seats. The legacy Student collection
is not used for authentication.
