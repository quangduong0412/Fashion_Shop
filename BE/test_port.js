const net = require('net');

const port = 1433;
const host = '127.0.0.1';

console.log(`Đang thử kết nối thẳng vào cổng ${port} của ${host}...`);

const client = new net.Socket();

client.setTimeout(3000);

client.connect(port, host, function() {
    console.log('✅ TRÚNG THƯỞNG! SQL Server THỰC SỰ đang mở cổng 1433!');
    client.destroy();
});

client.on('error', function(err) {
    console.log('❌ LỖI RỒI: Cửa 1433 vẫn bị khóa chặt (Không có ai nghe lén cả)! Lỗi gốc: ' + err.message);
});

client.on('timeout', function() {
    console.log('⏳ TIMEOUT: Bị tường lửa chặn đứng giữa đường rồi!!! (Không bị khóa nhưng chặn kết nối).');
    client.destroy();
});
