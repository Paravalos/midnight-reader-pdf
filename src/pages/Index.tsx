
import React from 'react';
import PDFViewer from '@/components/PDFViewer';

const Index = () => {
  return (
    <div className="min-h-screen bg-reader-dark p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Midnight Reader PDF</h1>
          <p className="text-muted-foreground">Upload and view PDFs in dark mode, easy on the eyes.</p>
        </header>
        
        <PDFViewer className="animate-fade-in" />
        
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>Upload any PDF file to view it in dark mode.</p>
          <p className="mt-2">The filter inverts colors and adjusts hue for better nighttime reading.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
