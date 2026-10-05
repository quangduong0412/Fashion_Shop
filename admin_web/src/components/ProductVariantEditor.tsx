import MediaGalleryEditor from './MediaGalleryEditor';
export type AttributeDefinition = {
  key: string;
  label: string;
  type: 'select' | 'suggest' | 'text' | 'number';
  options?: string[];
  unit?: string;
  placeholder?: string;
  defaultValue?: string | number;
  required?: boolean;
  requiredGroup?: string;
};

export type EditableVariant = {
  id?: number;
  clientKey?: string;
  sku?: string;
  color?: string;
  image?: string | null;
  size?: string;
  attributes?: Record<string, string | number>;
  price: string | number;
  quantity: string | number;
  expectedQuantity?: number;
  status?: string;
};

type Props = {
  definitions: AttributeDefinition[];
  productPrice: string | number;
  initialQuantity: string | number;
  variants: EditableVariant[];
  isEditing: boolean;
  onChange: (variants: EditableVariant[]) => void;
  onBusyChange?: (busy: boolean) => void;
};

const fieldClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal bg-white focus:outline-none focus:border-red-500';
let nextRowKey = 0;

export default function ProductVariantEditor({ definitions, productPrice, initialQuantity, variants, isEditing, onChange, onBusyChange }: Props) {
  const update = (index: number, patch: Partial<EditableVariant>) => {
    onChange(variants.map((variant, i) => i === index ? { ...variant, ...patch } : variant));
  };

  const addVariant = () => onChange([...variants, {
    clientKey: `variant-${++nextRowKey}`, color: '', sku: '', price: productPrice,
    quantity: variants.length ? '0' : initialQuantity, status: 'Đang mở bán',
    attributes: Object.fromEntries(definitions.filter(definition => definition.defaultValue !== undefined)
      .map(definition => [definition.key, definition.defaultValue!]))
  }]);

  return (
    <section className="border-t border-gray-200 pt-5 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="font-bold text-gray-800">Biến thể · {variants.length} loại</h3>
          <p className="text-xs text-gray-500 mt-1">Mỗi tổ hợp màu và thuộc tính có một SKU và số lượng riêng. Biến thể đã có đơn hàng cần giữ nguyên SKU và thuộc tính.</p>
        </div>
        <button type="button" onClick={addVariant} className="rounded-lg bg-gray-800 text-white px-4 py-2 text-sm font-semibold">+ Thêm biến thể</button>
      </div>
      {!variants.length && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Chưa có biến thể. Nhập số lượng tại ô tồn kho sản phẩm, hoặc thêm biến thể để quản lý theo size/màu.</p>}
      {variants.map((variant, index) => {
        const cannotRemove = !!variant.id && Number(variant.expectedQuantity) > 0;
        const difference = Number(variant.quantity) - (variant.expectedQuantity ?? 0);
        return (
          <div key={variant.id ?? variant.clientKey} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold">Biến thể {index + 1}{variant.id ? '' : ' · mới'}</h4>
              <button type="button" disabled={cannotRemove} title={cannotRemove ? 'Điều chỉnh tồn về 0 và lưu trước khi xóa. Có thể tạm ngừng bán.' : 'Xóa biến thể'}
                onClick={() => onChange(variants.filter((_, i) => i !== index))}
                className="px-2 py-1 text-sm text-red-700 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">Xóa</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-gray-600 space-y-1">
                <span>Màu sắc</span>
                <input className={fieldClass} maxLength={50} value={variant.color ?? ''} onChange={event => update(index, { color: event.target.value })} placeholder="Ví dụ: Đen" />
              </label>
              {definitions.map(definition => {
                const value = variant.attributes?.[definition.key] ?? (definition.key === 'size' ? variant.size : '') ?? '';
                const setAttribute = (next: string) => update(index, {
                  attributes: { ...variant.attributes, [definition.key]: next },
                  ...(definition.key === 'size' ? { size: next } : {})
                });
                const listId = `variant-${variant.id ?? variant.clientKey}-${definition.key}`;
                return (
                  <label key={definition.key} className="text-xs font-semibold text-gray-600 space-y-1">
                    <span>{definition.label}{definition.unit ? ` (${definition.unit})` : ''}{definition.required ? ' *' : ''}</span>
                    {definition.type === 'select' && definition.options?.length ? (
                      <select className={fieldClass} value={value} required={definition.required} onChange={event => setAttribute(event.target.value)}>
                        <option value="">Chọn {definition.label.toLocaleLowerCase('vi')}</option>
                        {definition.options.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <>
                        <input className={fieldClass} type={definition.type === 'number' ? 'number' : 'text'} step="any"
                          value={value} required={definition.required} list={definition.options?.length ? listId : undefined}
                          placeholder={definition.placeholder} onChange={event => setAttribute(event.target.value)} />
                        {definition.options?.length ? <datalist id={listId}>{definition.options.map(option => <option key={option} value={option} />)}</datalist> : null}
                      </>
                    )}
                  </label>
                );
              })}
              <label className="text-xs font-semibold text-gray-600 space-y-1">
                <span>SKU</span>
                <input className={fieldClass} maxLength={100} value={variant.sku ?? ''} onChange={event => update(index, { sku: event.target.value })} placeholder="Tự tạo nếu để trống" />
              </label>
              <label className="text-xs font-semibold text-gray-600 space-y-1">
                <span>Giá bán (đ) *</span>
                <input className={fieldClass} type="number" min="0" step="1" required value={variant.price} onChange={event => update(index, { price: event.target.value })} />
              </label>
              <label className="text-xs font-semibold text-gray-600 space-y-1">
                <span>{isEditing && variant.id ? 'Tồn sau điều chỉnh' : 'Tồn ban đầu'} *</span>
                <input className={fieldClass} type="number" min="0" max="2147483647" step="1" required value={variant.quantity}
                  onChange={event => update(index, { quantity: event.target.value })} />
                {isEditing && <span className="block text-xs font-normal text-gray-500">Hiện tại: {variant.expectedQuantity ?? 0}{variant.quantity !== '' && Number.isFinite(difference) ? ` · Chênh lệch: ${difference > 0 ? '+' : ''}${difference}` : ''}</span>}
              </label>
              <label className="text-xs font-semibold text-gray-600 space-y-1">
                <span>Trạng thái bán</span>
                <select className={fieldClass} value={variant.status ?? 'Đang mở bán'} onChange={event => update(index, { status: event.target.value })}>
                  <option value="Đang mở bán">Đang mở bán</option>
                  <option value="Tạm ngừng">Tạm ngừng</option>
                  {variant.status && !['Đang mở bán', 'Tạm ngừng'].includes(variant.status) && <option value={variant.status}>{variant.status}</option>}
                </select>
              </label>
            </div>
            <details className="rounded-lg border bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-gray-600">Ảnh riêng của biến thể {index + 1}{variant.image ? ' · đã có ảnh' : ' · đang dùng ảnh sản phẩm'}</summary><div className="mt-3"><MediaGalleryEditor max={1} showAlt={false} primaryLabel={`Ảnh biến thể ${index + 1}`} value={variant.image ? [{ url: variant.image }] : []} onBusyChange={onBusyChange} onChange={images => update(index, { image: images[0]?.url || null })} /></div></details>
            {cannotRemove && <p className="text-xs text-gray-500">Biến thể đang có hàng. Chọn Tạm ngừng để dừng bán và giữ số lượng tồn.</p>}
          </div>
        );
      })}
    </section>
  );
}
