type FilterValues = {
  location: string;
  type: string;
  priceMin: string;
  priceMax: string;
};

type ActivityFiltersProps = {
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  locations: string[];
  types: string[];
};

const updateValue = (
  values: FilterValues,
  key: keyof FilterValues,
  value: string,
  onChange: (next: FilterValues) => void,
) => {
  onChange({ ...values, [key]: value });
};

export const ActivityFilters = ({ values, onChange, locations, types }: ActivityFiltersProps) => {
  const isFiltered =
    values.location || values.type || values.priceMin || values.priceMax;

  return (
    <section
      aria-label="Activity filters"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          🔍 Filter Activities
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={() =>
              onChange({ location: "", type: "", priceMin: "", priceMax: "" })
            }
            className="text-xs font-medium text-sky-600 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <label htmlFor="filter-location" className="mb-1 block text-xs font-medium text-slate-500">
            Location
          </label>
          <select
            id="filter-location"
            value={values.location}
            onChange={(event) => updateValue(values, "location", event.target.value, onChange)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-type" className="mb-1 block text-xs font-medium text-slate-500">
            Activity Type
          </label>
          <select
            id="filter-type"
            value={values.type}
            onChange={(event) => updateValue(values, "type", event.target.value, onChange)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-price-min" className="mb-1 block text-xs font-medium text-slate-500">
            Min Price (₹)
          </label>
          <input
            id="filter-price-min"
            value={values.priceMin}
            onChange={(event) => updateValue(values, "priceMin", event.target.value, onChange)}
            type="number"
            min={0}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="e.g. 1000"
          />
        </div>
        <div>
          <label htmlFor="filter-price-max" className="mb-1 block text-xs font-medium text-slate-500">
            Max Price (₹)
          </label>
          <input
            id="filter-price-max"
            value={values.priceMax}
            onChange={(event) => updateValue(values, "priceMax", event.target.value, onChange)}
            type="number"
            min={0}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            placeholder="e.g. 8000"
          />
        </div>
      </div>
    </section>
  );
};

export type { FilterValues };
