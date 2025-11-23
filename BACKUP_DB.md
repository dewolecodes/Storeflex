# Backup MongoDB (Storeflex)

This document explains how to back up your MongoDB database before making schema changes.

Why: Schema migrations and data migrations can be destructive. Always take a backup first.

Prerequisites
- Install MongoDB Database Tools (which includes `mongodump`): https://www.mongodb.com/docs/database-tools/installation/
- Ensure `DATABASE_URL` is set in your environment or present in a `.env` file at the repo root.

Quick one-line test (PowerShell):

```powershell
if ($env:DATABASE_URL) { Write-Host "DATABASE_URL found" } else { Write-Host "DATABASE_URL missing" }
```

Run the backup script (PowerShell):

```powershell
# From repo root
.\scripts\backup_db.ps1

# Or specify an output folder
.\scripts\backup_db.ps1 -OutDir "C:\backups\storeflex"
```

What it does
- Reads `DATABASE_URL` from environment (or `.env`) and runs `mongodump --uri <DATABASE_URL>` into `./db_backups/backup-YYYYMMDD-HHMMSS`.

Restore (example)
- To restore a single database from the dump directory, use `mongorestore`:

```powershell
# Example: restore from backup folder
mongorestore --uri "%DATABASE_URL%" "./db_backups/backup-YYYYMMDD-HHMMSS"
```

Notes
- If you use a managed DB (Atlas), prefer using the provider's snapshot/backup tools.
- Keep backups off-site or in a secure cloud bucket.
- For production, automate daily backups and retention (e.g., 30 days).

If you want, I can (next) create a small script to upload backups to S3 or an Azure Blob container for off-site storage.