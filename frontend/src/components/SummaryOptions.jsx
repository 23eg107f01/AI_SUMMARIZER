export default function SummaryOptions({ value, onChange }) {
  const optionGroups = [
    {
      label: 'Length',
      name: 'length',
      options: [
        { value: 'Short', label: 'Short', description: '3 to 5 sentences' },
        { value: 'Medium', label: 'Medium', description: '1 to 2 paragraphs' },
        { value: 'Long', label: 'Long', description: 'Detailed' },
      ],
    },
    {
      label: 'Format',
      name: 'format',
      options: [
        { value: 'Paragraph', label: 'Paragraph' },
        { value: 'Bullet Points', label: 'Bullet Points' },
        { value: 'TL;DR + Bullets', label: 'TL;DR + Bullets' },
      ],
    },
    {
      label: 'Tone',
      name: 'tone',
      options: [
        { value: 'Neutral', label: 'Neutral' },
        { value: 'Academic', label: 'Academic' },
        { value: 'Casual', label: 'Casual' },
        { value: 'Executive', label: 'Executive' },
      ],
    },
  ];

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-glow dark:border-gray-800 dark:bg-gray-950/80">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {optionGroups.map((group) => (
          <fieldset key={group.name} className="flex-1">
            <legend className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              {group.label}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isActive = value[group.name] === option.value;
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-gray-950 ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200 dark:hover:border-indigo-400/60 dark:hover:bg-gray-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name={group.name}
                      className="sr-only"
                      checked={isActive}
                      onChange={() => onChange(group.name, option.value)}
                    />
                    <span>{option.label}</span>
                    {option.description ? <span className="ml-2 text-xs opacity-75">{option.description}</span> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}