export default function SubjectSelector({
  yearId,
  options,
  checkedItems,
  onToggle,
}) {
  return (
    <fieldset className="grid auto-rows-[2rem] gap-2 p-4 md:min-h-5 md:grid-cols-3 lg:grid-cols-5">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center space-x-3"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            checked={Boolean(checkedItems[String(option.id)])}
            onChange={() => onToggle(yearId, option.id)}
            name={`year${yearId}`}
            value={option.id}
          />
          <span className="line-clamp-2 text-ellipsis text-gray-700">
            {option.name}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
