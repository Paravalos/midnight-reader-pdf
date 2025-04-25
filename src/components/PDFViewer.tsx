
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ className }) => {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setFile(files[0]);
      setPageNumber(1);
      toast({
        title: "PDF Loaded",
        description: `Loaded: ${files[0].name}`,
      });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    setIsLoading(false);
    toast({
      title: "Error loading PDF",
      description: error.message,
      variant: "destructive",
    });
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.max(1, Math.min(newPageNumber, numPages));
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const changeScale = (newScale: number) => {
    setScale(Math.max(0.5, Math.min(newScale, 2.5)));
  };

  const zoomIn = () => changeScale(scale + 0.1);
  const zoomOut = () => changeScale(scale - 0.1);

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <Card className="w-full md:max-w-4xl p-4 mb-4 bg-reader-dark border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
          <Input
            type="file"
            accept=".pdf"
            onChange={onFileChange}
            className="bg-secondary text-foreground"
          />
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[scale * 100]}
              min={50}
              max={250}
              step={10}
              className="w-32"
              onValueChange={(value) => changeScale(value[0] / 100)}
            />
            <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 2.5}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {file && (
          <div className="pdf-container overflow-auto max-h-[70vh] rounded-lg">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={() => (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
              className="flex flex-col items-center"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="pdf-page animate-fade-in"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        )}

        {numPages > 0 && (
          <div className="flex justify-between items-center mt-4 pdf-controls">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousPage}
              disabled={pageNumber <= 1}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <p className="text-sm">
              Page {pageNumber} of {numPages}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextPage}
              disabled={pageNumber >= numPages}
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PDFViewer;
