// app/config.js
import { config } from 'dotenv';

config();

const CHIT_API = process.env.NEXT_PUBLIC_CHIT_API;

export default CHIT_API;
