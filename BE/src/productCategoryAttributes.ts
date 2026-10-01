import prisma from './db';

const alphaSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
const numericClothingSizes = Array.from({ length: 15 }, (_, index) => String(index + 26));

export const productCategoryAttributes: Record<string, Record<string, unknown>[]> = {
  'Quần Áo Nam Nữ': [
    { key: 'size', label: 'Size áo', type: 'select', options: alphaSizes, requiredGroup: 'size' },
    { key: 'waistLength', label: 'Eo × dài (jeans)', type: 'suggest', options: ['28x30', '30x32', '32x32', '34x34'], placeholder: 'Ví dụ: 28x30', requiredGroup: 'size' },
    { key: 'numericSize', label: 'Size quần số', type: 'select', options: numericClothingSizes, requiredGroup: 'size' }
  ],
  'Áo': [
    { key: 'size', label: 'Size áo', type: 'select', options: alphaSizes, required: true }
  ],
  'Quần / Jeans': [
    { key: 'size', label: 'Size quần', type: 'select', options: numericClothingSizes, requiredGroup: 'size' },
    { key: 'waistLength', label: 'Eo × dài (jeans)', type: 'suggest', options: ['28x30', '30x32', '32x32', '34x34'], placeholder: 'Ví dụ: 28x30', requiredGroup: 'size' }
  ],
  'Váy / Đầm': [
    { key: 'size', label: 'Size váy/đầm', type: 'select', options: [...alphaSizes.slice(0, 7), '0', '2', '4', '6', '8', '10', '12', '14'], required: true }
  ],
  'Áo khoác / Blazer': [
    { key: 'size', label: 'Size áo khoác', type: 'select', options: [...alphaSizes, '36', '38', '40', '42', '44', '46'], required: true }
  ],
  'Giày dép': [
    { key: 'euSize', label: 'EU', type: 'select', options: Array.from({ length: 14 }, (_, index) => `EU ${index + 35}`), requiredGroup: 'shoe-size' },
    { key: 'usSize', label: 'US', type: 'text', placeholder: 'Ví dụ: US 9', requiredGroup: 'shoe-size' },
    { key: 'ukSize', label: 'UK', type: 'text', placeholder: 'Ví dụ: UK 8', requiredGroup: 'shoe-size' },
    { key: 'footLengthCm', label: 'Chiều dài chân', type: 'number', unit: 'cm', requiredGroup: 'shoe-size' }
  ],
  'Giày': [
    { key: 'euSize', label: 'EU', type: 'select', options: Array.from({ length: 14 }, (_, index) => `EU ${index + 35}`), requiredGroup: 'shoe-size' },
    { key: 'usSize', label: 'US', type: 'text', placeholder: 'Ví dụ: US 9', requiredGroup: 'shoe-size' },
    { key: 'ukSize', label: 'UK', type: 'text', placeholder: 'Ví dụ: UK 8', requiredGroup: 'shoe-size' },
    { key: 'footLengthCm', label: 'Chiều dài chân', type: 'number', unit: 'cm', requiredGroup: 'shoe-size' }
  ],
  'Dép / Sandal': [
    { key: 'euSize', label: 'EU', type: 'select', options: Array.from({ length: 14 }, (_, index) => `EU ${index + 35}`), requiredGroup: 'shoe-size' },
    { key: 'footLengthCm', label: 'Chiều dài chân', type: 'number', unit: 'cm', requiredGroup: 'shoe-size' }
  ],
  'Mũ': [
    { key: 'hatSize', label: 'Size mũ', type: 'select', options: ['S', 'M', 'L', 'XL'], requiredGroup: 'hat-size' },
    { key: 'headCircumferenceCm', label: 'Vòng đầu', type: 'number', unit: 'cm', requiredGroup: 'hat-size' }
  ],
  'Thắt lưng': [
    { key: 'beltLengthCm', label: 'Chiều dài', type: 'number', unit: 'cm', options: Array.from({ length: 11 }, (_, index) => String(70 + index * 5)), required: true }
  ],
  'Nhẫn': [
    { key: 'ringSize', label: 'Ring size', type: 'suggest', options: Array.from({ length: 10 }, (_, index) => `US ${index + 4}`), requiredGroup: 'ring-size' },
    { key: 'ringCircumferenceMm', label: 'Chu vi ngón tay', type: 'number', unit: 'mm', requiredGroup: 'ring-size' }
  ],
  'Vòng tay': [
    { key: 'braceletLengthCm', label: 'Chiều dài vòng', type: 'number', unit: 'cm', options: ['15', '16', '17', '18', '19', '20', '21'], required: true }
  ],
  'Dây chuyền': [
    { key: 'necklaceLengthCm', label: 'Chiều dài dây', type: 'number', unit: 'cm', options: ['35', '40', '45', '50', '55', '60', '70'], required: true }
  ],
  'Đồng Hồ': [
    { key: 'dialDiameterMm', label: 'Đường kính mặt', type: 'number', unit: 'mm', options: ['28', '32', '36', '38', '40', '42', '44', '46'], required: true },
    { key: 'strapWidthMm', label: 'Độ rộng dây', type: 'number', unit: 'mm', options: ['16', '18', '20', '22', '24'], defaultValue: 20 },
    { key: 'strapLength', label: 'Chiều dài dây', type: 'select', options: ['S', 'M', 'L', 'Free Size'], defaultValue: 'Free Size' }
  ],
  'Kính Mát': [
    { key: 'lensWidthMm', label: 'Lens', type: 'number', unit: 'mm', options: ['48', '50', '52', '54', '56', '58'], required: true },
    { key: 'bridgeWidthMm', label: 'Bridge', type: 'number', unit: 'mm', options: ['16', '17', '18', '19', '20', '21'], required: true },
    { key: 'templeLengthMm', label: 'Temple', type: 'number', unit: 'mm', options: ['135', '140', '145', '150'], required: true }
  ],
  'Túi xách': [
    { key: 'bagSize', label: 'Kích cỡ túi', type: 'select', options: ['Mini', 'Small', 'Medium', 'Large'], requiredGroup: 'bag-size' },
    { key: 'lengthCm', label: 'Dài', type: 'number', unit: 'cm', requiredGroup: 'bag-size' },
    { key: 'heightCm', label: 'Cao', type: 'number', unit: 'cm' },
    { key: 'widthCm', label: 'Rộng', type: 'number', unit: 'cm' }
  ],
  'Balo': [
    { key: 'bagSize', label: 'Kích cỡ balo', type: 'select', options: ['Small', 'Medium', 'Large'], requiredGroup: 'bag-size' },
    { key: 'volumeLiters', label: 'Dung tích', type: 'number', unit: 'L', requiredGroup: 'bag-size' }
  ],
  'Đồ trẻ em': [
    { key: 'ageSize', label: 'Theo tuổi', type: 'suggest', options: ['0-3M', '3-6M', '6-12M', '1Y', '2Y', '3Y'], requiredGroup: 'child-size' },
    { key: 'heightCm', label: 'Chiều cao', type: 'number', unit: 'cm', options: Array.from({ length: 11 }, (_, index) => String(80 + index * 10)), requiredGroup: 'child-size' }
  ],
  'Áo ngực': [
    { key: 'bandSize', label: 'Band', type: 'select', options: ['65', '70', '75', '80', '85', '90', '95', '100'], required: true },
    { key: 'cupSize', label: 'Cup', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F'], required: true }
  ],
  'Đồ bơi': [
    { key: 'size', label: 'Size đồ bơi', type: 'select', options: alphaSizes.slice(1, 7), required: true },
    { key: 'cupSize', label: 'Cup', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F'] }
  ],
  'Phụ kiện': [
    { key: 'size', label: 'Kích cỡ', type: 'select', options: ['Free Size', 'One Size', 'Small', 'Medium', 'Large'] }
  ],
  'Free Size': [
    { key: 'size', label: 'Kích cỡ', type: 'select', options: ['Free Size', 'One Size'], required: true }
  ]
};

export async function syncProductCategoryAttributes() {
  for (const [name, attributes] of Object.entries(productCategoryAttributes)) {
    const category = await prisma.loaiHang.findFirst({ where: { TenLoaiHang: name } });
    if (category) {
      if (!category.ThuocTinhBienThe) {
        await prisma.loaiHang.update({ where: { MaLoaiHang: category.MaLoaiHang }, data: { ThuocTinhBienThe: attributes as any } });
      } else if (Array.isArray(category.ThuocTinhBienThe)) {
        const current = category.ThuocTinhBienThe as any[];
        const merged = current.map(definition => {
          const configuredDefault = attributes.find(attribute => attribute.key === definition.key)?.defaultValue;
          return definition.defaultValue === undefined && configuredDefault !== undefined
            ? { ...definition, defaultValue: configuredDefault }
            : definition;
        });
        if (JSON.stringify(merged) !== JSON.stringify(current)) {
          await prisma.loaiHang.update({ where: { MaLoaiHang: category.MaLoaiHang }, data: { ThuocTinhBienThe: merged as any } });
        }
      }
    } else {
      await prisma.loaiHang.create({ data: { TenLoaiHang: name, ThuocTinhBienThe: attributes as any } });
    }
  }
}