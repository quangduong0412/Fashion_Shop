import { Request, Response } from 'express';
import prisma from '../db';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.sanPham.findMany({
      include: { loaiHang: true }
    });
    
    if(products.length === 0) {
      res.json([]);
      return;
    }
    
    // Chuẩn hóa dữ liệu về tiếng Anh để xài cho frontend cũ
    const formattedProducts = products.map(p => ({
      id: p.MaSanPham,
      name: p.TenSanPham,
      price: p.DonGiaBan,
      image: p.Anh,
      category: p.loaiHang?.TenLoaiHang || 'fashion',
      quantity: p.SoLuong
    }));

    res.json(formattedProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await prisma.sanPham.findUnique({
      where: { MaSanPham: Number(id) }
    });
    if (product) {
      res.json({
        id: product.MaSanPham,
        name: product.TenSanPham,
        price: product.DonGiaBan,
        image: product.Anh,
        quantity: product.SoLuong
      });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, price, image, categoryId, khoId, nccId, stock } = req.body;
  try {
    const newProduct = await prisma.sanPham.create({
      data: { 
        TenSanPham: name, 
        DonGiaNhap: price * 0.7, 
        DonGiaBan: price, 
        Anh: image, 
        SoLuong: stock || 0,
        MaLoaiHang: categoryId || 1,
        MaKho: khoId || 1,
        MaNCC: nccId || 1
      }
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, image, categoryId, khoId, nccId, stock } = req.body;
  try {
    const updatedProduct = await prisma.sanPham.update({
      where: { MaSanPham: Number(id) },
      data: {
        TenSanPham: name,
        DonGiaBan: price,
        Anh: image,
        SoLuong: stock,
        MaLoaiHang: categoryId,
        MaKho: khoId,
        MaNCC: nccId
      }
    });
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Kiểm tra xem sản phẩm có nằm trong chi tiết phiếu xuất hoặc phiếu nhập nào không
    const usedInExport = await prisma.cTPhieuXuat.findFirst({ where: { MaSanPham: Number(id) } });
    const usedInImport = await prisma.cTPhieuNhap.findFirst({ where: { MaSanPham: Number(id) } });

    if (usedInExport || usedInImport) {
      res.status(400).json({ error: 'Không thể xóa sản phẩm đã có lịch sử giao dịch. Vui lòng cập nhật tồn kho bằng 0 thay vì xóa.' });
      return;
    }

    await prisma.sanPham.delete({
      where: { MaSanPham: Number(id) }
    });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  }
};

