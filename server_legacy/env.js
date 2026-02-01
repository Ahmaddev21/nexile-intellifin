import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
console.log('Environment variables loaded from:', path.join(__dirname, '.env'));
if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET not found in environment!');

export default process.env;
