// Regenerates every PNG and MP3 in public/assets (needs ffmpeg for the MP3s).
import { execFileSync } from 'node:child_process';
execFileSync('npx', ['tsx', 'tools/art/index.ts'], { stdio: 'inherit' });
execFileSync('npx', ['tsx', 'tools/audio/index.ts'], { stdio: 'inherit' });
