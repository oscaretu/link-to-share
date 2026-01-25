'use client';

import { useState } from 'react';

interface PreviewCardProps {
  title: string;
  description: string;
  image: string | null;
  url: string;
  author: string | null;
  onEdit: (data: { title: string; description: string; url: string }) => void;
}

type FormatType = 'whatsapp' | 'telegram';

export default function PreviewCard({
  title,
  description,
  image,
  url,
  author,
  onEdit,
}: PreviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [editUrl, setEditUrl] = useState(url);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<FormatType>('whatsapp');

  const formatTitle = (text: string, fmt: FormatType) => {
    return fmt === 'whatsapp' ? `*${text}*` : `**${text}**`;
  };

  const formattedText = `${formatTitle(editTitle, format)}\n\n${editDescription}\n\n${editUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handleSaveEdit = () => {
    onEdit({
      title: editTitle,
      description: editDescription,
      url: editUrl,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setEditDescription(description);
    setEditUrl(url);
    setIsEditing(false);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
      {image && (
        <div className="relative aspect-video bg-gray-100">
          <img
            src={image}
            alt={editTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <a
            href={image}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded hover:bg-black/90 transition-colors"
          >
            Open image
          </a>
        </div>
      )}

      <div className="p-4 space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-gray-900 line-clamp-2">
                {editTitle}
              </h2>
              {author && (
                <p className="text-sm text-gray-500 mt-1">by {author}</p>
              )}
            </div>

            <p className="text-gray-600 text-sm line-clamp-3">{editDescription}</p>

            <a
              href={editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 text-sm truncate hover:underline"
            >
              {editUrl}
            </a>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-xs text-gray-400">Format:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="whatsapp"
                    checked={format === 'whatsapp'}
                    onChange={() => setFormat('whatsapp')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">WhatsApp</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="telegram"
                    checked={format === 'telegram'}
                    onChange={() => setFormat('telegram')}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Telegram</span>
                </label>
              </div>
              <p className="text-xs text-gray-400 mb-2">Preview text:</p>
              <pre className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {formattedText}
              </pre>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCopy}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
                  copied
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Edit details
            </button>
          </>
        )}
      </div>
    </div>
  );
}
