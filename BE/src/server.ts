import app from './app';
import { jwtSecret } from './config';

jwtSecret();
const port = process.env.PORT || 4000;
app.listen(port, (error?: NodeJS.ErrnoException) => {
  if (error) {
    console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đang được sử dụng. Dừng đúng phiên backend cũ trước khi khởi động lại.` : `Không thể mở API (${error.code || 'LISTEN_FAILED'}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Fashion Haven API listening on port ${port}`);
});
