import { ExternalLink } from 'lucide-react';

export default function LessonResource({ resourceUrl, resourceName }) {
  if (!resourceUrl) return null;
  return (
    <div className="mt-3">
      <a href={resourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
        <ExternalLink className="w-4 h-4 mr-1" />
        {resourceName || 'Resource'}
      </a>
    </div>
  );
}
