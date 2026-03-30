import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeeders() {
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
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Get list of seeders
    const seedersDir = path.join(__dirname, '..', 'seeders');
    const files = await fs.readdir(seedersDir);
    const seederFiles = files
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();

    console.log(`Found ${seederFiles.length} seeder files`);

    // Run seeders
    for (const file of seederFiles) {
      try {
        console.log(`Running seeder: ${file}`);
        
        const seederModule = await import(
          path.join(seedersDir, file)
        );
        const seeder = seederModule.default || seederModule;

        if (seeder.up) {
          await seeder.up(sequelize.getQueryInterface(), sequelize.constructor);
          console.log(`✓ Seeder completed: ${file}`);
        }
      } catch (error) {
        console.error(`✗ Seeder failed: ${file}`);
        throw error;
      }
    }

    console.log('✓ All seeders completed successfully');
  } catch (error) {
    console.error('Seeder error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runSeeders();
