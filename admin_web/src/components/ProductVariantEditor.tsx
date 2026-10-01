import React, { useEffect, useState } from 'react';

type AttributeDefinition = {
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

type Variant = {
  id?: number;
  sku?: string;
  color?: string;
  size?: string;
  attributes?: Record<string, string | number>;
  price?: number;
  quantity?: number;
  status?: string;
};

type Props = {
  categoryId: number;
  definitions: AttributeDefinition[];
  productPrice: number;
  variants: Variant[];
  onChange: (variants: Variant[]) => void;
};

type DraftVariant = {
  color: string;
  sku: string;
  price: string;
  quantity: string;
  status: string;
  attributes: Record<string, string>;
};

const emptyDraft = (definitions: AttributeDefinition[] = []): DraftVariant => ({
  color: '',
  sku: '',
  price: '',
  quantity: '0',
  status: 'Đang mở bán',
  attributes: Object.fromEntries(definitions
    .filter(definition => definition.defaultValue !== undefined)
    .map(definition => [definition.key, String(definition.defaultValue)]))
});

export default function ProductVariantEditor({ categoryId, definitions, productPrice, variants, onChange }: Props) {
  const [draft, setDraft] = useState<DraftVariant>(emptyDraft);
  useEffect(() => setDraft(emptyDraft(definitions)), [categoryId, definitions]);

  const updateVariant = (index: number, update: (variant: Variant) => Variant) => {
    onChange(variants.map((variant, variantIndex) => variantIndex === index ? update(variant) : variant));
  };

  const setAttribute = (attributes: Record<string, string | number> | undefined, key: string, value: string) => ({
    ...(attributes || {}),
    [key]: value
  });

  const addVariant = () => {
    for (const definition of definitions) {
      if (definition.required && !draft.attributes[definition.key]?.trim()) {
        window.alert(`Vui lòng nhập ${definition.label}.`);
        return;
      }
    }
    const groups = Array.from(new Set(definitions.map(definition => definition.requiredGroup).filter(Boolean)));
    for (const group of groups) {
      const groupFields = definitions.filter(definition => definition.requiredGroup === group);
      if (!groupFields.some(definition => draft.attributes[definition.key]?.trim())) {
        window.alert(`Vui lòng nhập ít nhất một thông số trong nhóm ${group}.`);
        return;
      }
    }

    const attributes = Object.fromEntries(Object.entries(draft.attributes).filter(([, value]) => value.trim()));
    const normalizedColor = draft.color.trim().toLocaleLowerCase('vi');
    const combination = JSON.stringify([normalizedColor, Object.entries(attributes).sort(([left], [right]) => left.localeCompare(right))]);
    const duplicate = variants.some(variant => JSON.stringify([
      (variant.color || '').trim().toLocaleLowerCase('vi'),
      Object.entries(variant.attributes || {}).sort(([left], [right]) => left.localeCompare(right))
    ]) === combination);
    if (duplicate) {
      window.alert('Tổ hợp màu và kích thước này đã có.');
      return;
    }

    onChange([...variants, {
      color: draft.color.trim(),
      sku: draft.sku.trim(),
      attributes,
      size: typeof attributes.size === 'string' ? attributes.size : '',
      price: Number(draft.price || productPrice),
      quantity: Number(draft.quantity || 0),
      status: draft.status
    }]);
    setDraft(emptyDraft(definitions));
  };

  const renderAttributeInput = (
    definition: AttributeDefinition,
    value: string | number | undefined,
    onValueChange: (nextValue: string) => void,
    inputId: string
  ) => {
    if (definition.type === 'select' && definition.options?.length) {
      return (
        <select value={value ?? ''} onChange={event => onValueChange(event.target.value)} className="w-full min-w-28 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-white">
          <option value="">Chọn</option>
          {definition.options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    const datalistId = `${inputId}-options`;
    return (
      <div className="flex items-center gap-1">
        <input
          id={inputId}
          type={definition.type === 'number' ? 'number' : 'text'}
          list={definition.options?.length ? datalistId : undefined}
          value={value ?? ''}
          onChange={event => onValueChange(event.target.value)}
          placeholder={definition.placeholder || definition.label}
          className="w-full min-w-28 px-2 py-1.5 border border-gray-200 rounded-md text-xs"
        />
        {definition.options?.length ? <datalist id={datalistId}>{definition.options.map(option => <option key={option} value={option} />)}</datalist> : null}
        {definition.unit ? <span className="text-[11px] text-gray-500">{definition.unit}</span> : null}
      </div>
    );
  };

  return (
    <div className="md:col-span-2 border-t border-gray-100 pt-4 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold text-gray-800">Biến thể sản phẩm</h3>
        <span className="text-xs text-gray-500">{variants.length} biến thể · tổng tồn {variants.reduce((sum, variant) => sum + Number(variant.quantity || 0), 0)}</span>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => (
          <div key={variant.id || `new-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500">Biến thể {index + 1}</span>
              <button type="button" title="Xóa biến thể" onClick={() => onChange(variants.filter((_, variantIndex) => variantIndex !== index))} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                <span className="material-symbols-outlined text-base">delete</span>Xóa
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                <span>Màu sắc</span>
                <input value={variant.color || ''} onChange={event => updateVariant(index, current => ({ ...current, color: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm font-normal" placeholder="Ví dụ: Đen" />
              </label>
              {definitions.map(definition => (
                <label key={definition.key} className="space-y-1 text-xs font-semibold text-gray-600">
                  <span>{definition.label}{definition.unit ? ` (${definition.unit})` : ''}</span>
                  {renderAttributeInput(definition, variant.attributes?.[definition.key] ?? (definition.key === 'size' ? variant.size : ''), value => updateVariant(index, current => ({
                    ...current,
                    attributes: setAttribute(current.attributes, definition.key, value),
                    ...(definition.key === 'size' ? { size: value } : {})
                  })), `variant-${index}-${definition.key}`)}
                </label>
              ))}
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                <span>SKU</span>
                <input value={variant.sku || ''} onChange={event => updateVariant(index, current => ({ ...current, sku: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm font-mono font-normal" placeholder="Tự tạo nếu trống" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                <span>Giá bán</span>
                <input type="number" min="0" value={variant.price ?? productPrice} onChange={event => updateVariant(index, current => ({ ...current, price: Number(event.target.value) }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                <span>Tồn kho của biến thể</span>
                <input type="number" min="0" step="1" value={variant.quantity ?? 0} onChange={event => updateVariant(index, current => ({ ...current, quantity: Number(event.target.value) }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-gray-600">
                <span>Trạng thái biến thể</span>
                <select value={variant.status || 'Đang mở bán'} onChange={event => updateVariant(index, current => ({ ...current, status: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md bg-white text-sm font-normal">
                  <option value="Đang mở bán">Đang mở bán</option>
                  <option value="Tạm ngừng">Tạm ngừng</option>
                  <option value="Hết hàng">Hết hàng</option>
                </select>
              </label>
            </div>
          </div>
        ))}

        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-600">Biến thể mới</span>
            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 rounded-md bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-700">
              <span className="material-symbols-outlined text-sm">add</span>Thêm biến thể
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-xs font-semibold text-gray-600">
              <span>Màu sắc</span>
              <input value={draft.color} onChange={event => setDraft(current => ({ ...current, color: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md bg-white text-sm font-normal" placeholder="Màu sắc" />
            </label>
            {definitions.map(definition => (
              <label key={definition.key} className="space-y-1 text-xs font-semibold text-gray-600">
                <span>{definition.label}{definition.unit ? ` (${definition.unit})` : ''}</span>
                {renderAttributeInput(definition, draft.attributes[definition.key], value => setDraft(current => ({ ...current, attributes: { ...current.attributes, [definition.key]: value } })), `draft-${definition.key}`)}
              </label>
            ))}
            <label className="space-y-1 text-xs font-semibold text-gray-600">
              <span>SKU</span>
              <input value={draft.sku} onChange={event => setDraft(current => ({ ...current, sku: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md bg-white text-sm font-mono font-normal" placeholder="SKU tự tạo" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-gray-600">
              <span>Giá bán</span>
              <input type="number" min="0" value={draft.price} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md bg-white text-sm font-normal" placeholder={String(productPrice)} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-gray-600">
              <span>Tồn kho của biến thể</span>
              <input type="number" min="0" step="1" value={draft.quantity} onChange={event => setDraft(current => ({ ...current, quantity: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md bg-white text-sm font-normal" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-gray-600">
              <span>Trạng thái biến thể</span>
              <select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value }))} className="w-full px-2.5 py-2 border border-gray-200 rounded-md bg-white text-sm font-normal">
                <option value="Đang mở bán">Đang mở bán</option>
                <option value="Tạm ngừng">Tạm ngừng</option>
                <option value="Hết hàng">Hết hàng</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}