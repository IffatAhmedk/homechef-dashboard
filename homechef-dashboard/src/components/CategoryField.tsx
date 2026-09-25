import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import type { Category } from "@/models";

interface CategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
}

/** Type a category name: pick an existing one from the suggestions or type a new one. */
export function CategoryField({ value, onChange, categories }: CategoryFieldProps) {
  return (
    <Field label="Category">
      <Input required list="category-options" placeholder="New or existing" value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id="category-options">
        {categories.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </Field>
  );
}
