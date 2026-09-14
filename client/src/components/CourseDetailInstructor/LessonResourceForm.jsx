export default function LessonResourceForm({ form, setForm }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Resource Name (Optional)</label>
        <input
          type="text"
          disabled={!form.resourceUrl}
          value={form.resourceName || ''}
          onChange={e => setForm({ ...form, resourceName: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm sm:text-sm disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Resource URL (Optional)</label>
        <input
          type="url"
          value={form.resourceUrl || ''}
          onChange={e => {
            const newUrl = e.target.value;
            setForm({ ...form, resourceUrl: newUrl, resourceName: newUrl ? form.resourceName : '' });
          }}
          className="mt-1 block w-full px-3 py-2 border-gray-300 rounded-md shadow-sm sm:text-sm"
        />
      </div>
    </div>
  );
}
