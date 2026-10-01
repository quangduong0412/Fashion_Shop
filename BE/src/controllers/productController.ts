import { Request, Response } from 'express';
import prisma from '../db';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.sanPham.findMany({
      include: { loaiHang: true, bienThes: true }
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
      quantity: p.SoLuong,
      status: p.TrangThai || 'Đang mở bán',
      variants: p.bienThes || []
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
  const { name, price, image, categoryId, khoId, nccId, stock, status, variants } = req.body;
  try {
    const data: any = { 
      TenSanPham: name, 
      DonGiaNhap: price * 0.7, 
      DonGiaBan: price, 
      Anh: image, 
      SoLuong: stock || 0,
      MaLoaiHang: categoryId || 1,
      MaKho: khoId || 1,
      MaNCC: nccId || 1,
      TrangThai: status || 'Đang mở bán'
    };

    if (variants && variants.length > 0) {
      data.bienThes = {
        create: variants.map((v: any) => ({
          KichCo: v.size || v.KichCo,
          MauSac: v.color || v.MauSac,
          SoLuong: Number(v.quantity || v.SoLuong || 0)
        }))
      };
    }

    const newProduct = await prisma.sanPham.create({
      data,
      include: { bienThes: true }
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, image, categoryId, khoId, nccId, stock, status, variants } = req.body;
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
        MaNCC: nccId,
        TrangThai: status
      }
    });

    // Handle variants update if provided
    if (variants && Array.isArray(variants)) {
      // Simplest approach: delete old variants and create new ones
      await prisma.bienTheSanPham.deleteMany({ where: { MaSanPham: Number(id) } });
      if (variants.length > 0) {
        await prisma.bienTheSanPham.createMany({
          data: variants.map((v: any) => ({
            MaSanPham: Number(id),
            KichCo: v.size || v.KichCo,
            MauSac: v.color || v.MauSac,
            SoLuong: Number(v.quantity || v.SoLuong || 0)
          }))
        });
      }
    }

    const finalProduct = await prisma.sanPham.findUnique({
      where: { MaSanPham: Number(id) },
      include: { bienThes: true }
    });

    res.json(finalProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Kiểm tra xem sản phẩm có nằm trong chi tiết phiếu xuất hoặc phiếu nhập nào không
    const usedInExport = await prisma.cTDonHang.findFirst({ where: { MaSanPham: Number(id) } });
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

