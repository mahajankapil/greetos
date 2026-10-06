import { mkdirSync } from 'fs';
import path from 'path';

/**
 * Single source for where uploaded files are written and served from.
 *
 * The Deploy Panel runs `git clean` on every deploy, which deletes anything
 * under the repo that git doesn't track, so production sets UPLOADS_DIR to a
 * folder outside the repo. Unset, it is api/uploads (the API runs from api/).
 * Computing this from __dirname gave different folders for the server and the
 * returns route, because they sit at different depths.
 */
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));

mkdirSync(UPLOADS_DIR, { recursive: true });
