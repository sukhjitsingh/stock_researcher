# Setup Infrastructure
This command bootstraps the project and configures the Vercel cloud environment.

## Steps
1. **Run Bootstrap Script**
   - Execute `bash bootstrap_project.sh` to generate the project structure.

2. **Link Vercel Project**
   - Execute `vercel link --yes` to create/link the project.

3. **Provision Database (Interactive)**
   - Ask the user to run `vercel integration add storage` in their terminal to add "Vercel Postgres".
   - *Wait for the user to confirm they have completed this step.*

4. **Pull Secrets**
   - Execute `vercel env pull .env` to download the database keys.

5. **Initialize Database**
   - Execute `python scripts/init_db.py` to create the tables in the cloud.

6. **Verify**
   - Check if `.env` contains `POSTGRES_URL`.