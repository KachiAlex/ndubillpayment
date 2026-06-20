const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const database = require('./database');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Create a database backup using pg_dump (PostgreSQL)
 */
async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get database connection details from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Parse DATABASE_URL to get connection details
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || 5432;
    const databaseName = url.pathname.substring(1);
    const user = url.username;
    const password = url.password;

    // Set PGPASSWORD environment variable for pg_dump
    process.env.PGPASSWORD = password;

    // Run pg_dump command
    const command = `pg_dump -h ${host} -p ${port} -U ${user} -d ${databaseName} --no-owner --no-acl > "${backupFile}"`;
    
    await execAsync(command);

    // Clear PGPASSWORD
    delete process.env.PGPASSWORD;

    console.log('[Backup] Database backup created:', backupFile);

    // Clean up old backups (keep last 7)
    await cleanupOldBackups(backupDir, 7);

    return { success: true, file: backupFile };
  } catch (err) {
    console.error('[Backup] Error creating backup:', err.message);
    throw err;
  }
}

/**
 * Clean up old backup files, keeping only the most recent N backups
 */
async function cleanupOldBackups(backupDir, keepCount) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by time, newest first

    // Delete old backups beyond keepCount
    for (let i = keepCount; i < files.length; i++) {
      fs.unlinkSync(files[i].path);
      console.log('[Backup] Deleted old backup:', files[i].name);
    }
  } catch (err) {
    console.error('[Backup] Error cleaning up old backups:', err.message);
  }
}

/**
 * List all available backups
 */
async function listBackups() {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    
    if (!fs.existsSync(backupDir)) {
      return { backups: [] };
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        size: fs.statSync(path.join(backupDir, file)).size,
        created: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.created - a.created);

    return { backups: files };
  } catch (err) {
    console.error('[Backup] Error listing backups:', err.message);
    throw err;
  }
}

/**
 * Restore database from a backup file
 */
async function restoreBackup(backupFile) {
  try {
    const backupPath = path.join(__dirname, '../../backups', backupFile);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // Get database connection details from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    // Parse DATABASE_URL to get connection details
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || 5432;
    const databaseName = url.pathname.substring(1);
    const user = url.username;
    const password = url.password;

    // Set PGPASSWORD environment variable for psql
    process.env.PGPASSWORD = password;

    // Run psql command to restore
    const command = `psql -h ${host} -p ${port} -U ${user} -d ${databaseName} < "${backupPath}"`;
    
    await execAsync(command);

    // Clear PGPASSWORD
    delete process.env.PGPASSWORD;

    console.log('[Backup] Database restored from:', backupPath);

    return { success: true, file: backupPath };
  } catch (err) {
    console.error('[Backup] Error restoring backup:', err.message);
    throw err;
  }
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup
};
