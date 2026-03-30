import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Migration {
  name: string;
  up: (queryInterface: any, sequelize: any) => Promise<void>;
  down: (queryInterface: any, sequelize: any) => Promise<void>;
}

async function runMigrations() {
  const sequelize = new Sequelize(
    config.database.name,
    config.database.user,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      dialect: 'mysql',
      logging: false,
    }
  );

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Create migrations table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sequelize_meta (
        name VARCHAR(255) PRIMARY KEY,
        sequelize_version VARCHAR(255) NOT NULL,
        execution_time INT NOT NULL
      )
    `);

    // Get list of migrations
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js') && !f.endsWith('.d.ts'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Get executed migrations
    const [executed] = await sequelize.query(
      'SELECT name FROM sequelize_meta ORDER BY name'
    ) as any;
    const executedNames = executed.map((row: any) => row.name);

    // Run pending migrations
    let migrationsRun = 0;
    for (const file of migrationFiles) {
      if (!executedNames.includes(file)) {
        try {
          console.log(`Running migration: ${file}`);
          
          // Dynamically import the migration
          const migrationModule = await import(
            pathToFileURL(path.join(migrationsDir, file)).href
          );
          const migration = migrationModule.default || migrationModule;

          if (migration.up) {
            await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
            
            // Record migration
            await sequelize.query(
              `INSERT INTO sequelize_meta (name, sequelize_version, execution_time) VALUES (?, ?, ?)`,
              {
                replacements: [file, '6.35.2', Math.floor(Date.now() / 1000)],
              }
            );
            
            console.log(`✓ Migration completed: ${file}`);
            migrationsRun++;
          }
        } catch (error) {
          console.error(`✗ Migration failed: ${file}`);
          throw error;
        }
      }
    }

    if (migrationsRun === 0) {
      console.log('✓ No pending migrations');
    } else {
      console.log(`✓ ${migrationsRun} migration(s) completed successfully`);
    }

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
