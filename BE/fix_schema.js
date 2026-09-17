const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Change provider
schema = schema.replace('provider = "sqlserver"', 'provider = "mysql"');

// Remove map from @id, @unique, @default, @@id, @@unique
schema = schema.replace(/@id\(map: "[^"]+"\)/g, '@id');
schema = schema.replace(/@@id\(([^,]+),\s*map: "[^"]+"\)/g, '@@id($1)');
schema = schema.replace(/@unique\(map: "[^"]+"\)/g, '@unique');
schema = schema.replace(/@@unique\(([^,]+),\s*map: "[^"]+"\)/g, '@@unique($1)');
schema = schema.replace(/@default\(([^,]+),\s*map: "[^"]+"\)/g, '@default($1)');

// Change NVarChar to VarChar and Text
schema = schema.replace(/@db\.NVarChar\(Max\)/g, '@db.Text');
schema = schema.replace(/@db\.NVarChar/g, '@db.VarChar');

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema fixed!');
