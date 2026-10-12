import prisma from './src/db';

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS returnrequest (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    OrderId INT NOT NULL,
    CustomerId INT NOT NULL,
    RequestKey VARCHAR(64) NOT NULL,
    Fingerprint VARCHAR(64) NOT NULL,
    Status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
    Reason VARCHAR(500) NOT NULL,
    Evidence JSON NULL,
    RefundDue DECIMAL(18,0) NOT NULL DEFAULT 0,
    Version INT NOT NULL DEFAULT 1,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UpdatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX returnrequest_CustomerId_RequestKey_key (CustomerId, RequestKey),
    INDEX returnrequest_OrderId_Status_Id_idx (OrderId, Status, Id),
    INDEX returnrequest_CustomerId_Id_idx (CustomerId, Id),
    INDEX returnrequest_Status_Id_idx (Status, Id),
    CONSTRAINT FK_ReturnRequest_Order FOREIGN KEY (OrderId) REFERENCES donhang (MaPhieuXuat) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT FK_ReturnRequest_Customer FOREIGN KEY (CustomerId) REFERENCES khachhang (MaKhachHang) ON DELETE RESTRICT ON UPDATE NO ACTION
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS returnline (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ReturnId INT NOT NULL,
    OrderLineId INT NOT NULL,
    RequestedQty INT NOT NULL,
    ReceivedQty INT NOT NULL DEFAULT 0,
    RestockQty INT NOT NULL DEFAULT 0,
    RefundAmount DECIMAL(18,0) NOT NULL DEFAULT 0,
    UNIQUE INDEX returnline_ReturnId_OrderLineId_key (ReturnId, OrderLineId),
    INDEX returnline_OrderLineId_ReturnId_idx (OrderLineId, ReturnId),
    CONSTRAINT FK_ReturnLine_Request FOREIGN KEY (ReturnId) REFERENCES returnrequest (Id) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT FK_ReturnLine_OrderLine FOREIGN KEY (OrderLineId) REFERENCES ctdonhang (STT) ON DELETE RESTRICT ON UPDATE NO ACTION
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS returnevent (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ReturnId INT NOT NULL,
    FromStatus VARCHAR(24) NULL,
    ToStatus VARCHAR(24) NOT NULL,
    ActorRole VARCHAR(20) NOT NULL,
    ActorId INT NOT NULL,
    Note VARCHAR(500) NOT NULL,
    Metadata JSON NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX returnevent_ReturnId_Id_idx (ReturnId, Id),
    CONSTRAINT FK_ReturnEvent_Request FOREIGN KEY (ReturnId) REFERENCES returnrequest (Id) ON DELETE RESTRICT ON UPDATE NO ACTION
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS returnrefund (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    ReturnId INT NOT NULL,
    IdempotencyKey VARCHAR(64) NOT NULL,
    Fingerprint VARCHAR(64) NOT NULL,
    Amount DECIMAL(18,0) NOT NULL,
    Method VARCHAR(24) NOT NULL,
    Reference VARCHAR(100) NOT NULL,
    ActorId INT NOT NULL,
    CreatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX returnrefund_ReturnId_IdempotencyKey_key (ReturnId, IdempotencyKey),
    INDEX returnrefund_ReturnId_Id_idx (ReturnId, Id),
    CONSTRAINT FK_ReturnRefund_Request FOREIGN KEY (ReturnId) REFERENCES returnrequest (Id) ON DELETE RESTRICT ON UPDATE NO ACTION
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  console.log('Return, inspection and refund audit tables ready; existing order, payment and stock history preserved.');
}

main().catch(() => { console.error('Return migration failed. No reset or seed was performed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
