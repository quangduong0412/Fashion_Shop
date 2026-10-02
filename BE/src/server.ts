import app from './app';
import { jwtSecret } from './config';

jwtSecret();
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Fashion Haven API listening on port ${port}`));
