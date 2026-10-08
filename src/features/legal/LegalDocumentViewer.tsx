import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface LegalDocumentViewerProps {
  documentUrl: string;
}

export const LegalDocumentViewer: React.FC<LegalDocumentViewerProps> = ({ documentUrl }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    fetch(documentUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Documento no encontrado');
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [documentUrl]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-500 p-6 rounded-lg text-center">
        No se pudo cargar el documento legal. Por favor, inténtelo más tarde.
      </div>
    );
  }

  return (
    <article className="prose prose-slate max-w-none prose-headings:text-brand-900 prose-a:text-brand-600">
      <ReactMarkdown>{content}</ReactMarkdown>
    </article>
  );
};
