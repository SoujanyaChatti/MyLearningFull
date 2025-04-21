## Database Setup
The database schema is defined in `database/schema.sql`. To initialize the PostgreSQL database:
1. Install PostgreSQL and start the service.
2. Create a database: `createdb learning_platform`.
3. Apply the schema: `psql -d learning_platform -f database/schema.sql`.

## Backend Setup
1. Navigate to `server/`.
2. Run `npm install` to install dependencies.
3. Ensure `.env` in the project root has `DATABASE_URL=postgres://your-username@localhost:5432/learning_platform` and a `JWT_SECRET`.
4. Update `index.js` with `require('dotenv').config({ path: '../.env' });`.
5. Start the server: `npx nodemon index.js`.

## Backend Setup
- Server runs on port 3000 (switched from 5000 due to port conflict with ControlCe).
- Authentication:
  - POST /api/auth/signup: Creates user with JWT token (e.g., {"name": "Test User", ...}).
  - POST /api/auth/login: Authenticates user and returns token.
## Troubleshooting
- Resolved 403 by freeing port 5000 and switching to 3000.
- Fixed "Cannot GET" by ensuring POST method in Postman.


## Backend Setup
- Server runs on port 3000.
- APIs:
  - POST /api/auth/signup: Creates user with JWT.
  - POST /api/auth/login: Authenticates user.
  - POST /api/courses: Creates courses.
  - POST /api/courses/modules: Creates modules.
  - POST /api/courses/course-content: Adds content.
  - POST /api/courses/quizzes: Adds quizzes.
  - POST /api/courses/enrollments/:id/progress: Updates progress.
## Troubleshooting
- Resolved foreign key violations by ensuring course and module existence.
- Fixed JSON parsing for quizzes with explicit stringification.
- Handled duration parsing ('10m') for progress calculation with CASE statements.

## API Updates
- Added GET /api/courses/course-content/:id to retrieve content details.

## API Updates
- Corrected route to GET /api/courses/modules/:id/content due to mounting under /api/courses.

## API Updates
- Enhanced CoursePlayer to list all module content.
- Verified POST /api/courses/enrollments for course enrollment.