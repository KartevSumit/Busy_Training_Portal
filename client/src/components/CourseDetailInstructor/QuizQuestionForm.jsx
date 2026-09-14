export default function QuizQuestionForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="mb-6 bg-white p-4 rounded border shadow-sm space-y-3">
      <input 
        required 
        placeholder="Question text" 
        value={form.question} 
        onChange={e => setForm({...form, question: e.target.value})} 
        className="w-full border p-2 rounded text-sm" 
      />
      <div className="grid grid-cols-2 gap-2">
        {['A','B','C','D'].map(opt => (
          <input 
            key={opt} 
            required 
            placeholder={`Option ${opt}`} 
            value={form[`option${opt}`]} 
            onChange={e => setForm({...form, [`option${opt}`]: e.target.value})} 
            className="border p-2 rounded text-sm" 
          />
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div>
          <label className="mr-2 text-sm font-medium">Correct Option:</label>
          <select 
            value={form.correctOption} 
            onChange={e => setForm({...form, correctOption: e.target.value})} 
            className="border p-2 rounded text-sm bg-white"
          >
            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium">Save</button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded text-sm font-medium">Cancel</button>
          )}
        </div>
      </div>
    </form>
  );
}
