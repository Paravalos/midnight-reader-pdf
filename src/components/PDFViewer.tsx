import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';

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
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const { toast } = useToast();
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      setFile(files[0]);
      setPageNumber(1);
      pageRefs.current = [];
      toast({
        title: "PDF Loaded",
        description: `Loaded: ${files[0].name}`,
      });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    pageRefs.current = Array(numPages).fill(null);
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

  const renderPage = (pageNum: number) => {
    if (!file) return null;
    
    return (
      <div 
        key={`page-${pageNum}`}
        ref={el => pageRefs.current[pageNum - 1] = el}
        className="pdf-page-wrapper mb-4"
      >
        <Page
          pageNumber={pageNum}
          scale={scale}
          className="pdf-page"
          renderTextLayer={true}
          renderAnnotationLayer={true}
        />
      </div>
    );
  };

  const downloadPDF = async () => {
    if (!file) return;
    
    setIsDownloading(true);
    toast({
      title: "Preparing Download",
      description: "Generating darkened PDF...",
    });

    try {
      const fileData = await file.arrayBuffer();
      
      const loadingTask = pdfjs.getDocument({ data: fileData });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      
      const outputPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
      });
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context!,
          viewport: viewport
        }).promise;
        
        const imageData = context!.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let j = 0; j < data.length; j += 4) {
          data[j] = 255 - data[j];
          data[j + 1] = 255 - data[j + 1];
          data[j + 2] = 255 - data[j + 2];
          
          if (data[j] > 220 && data[j + 1] > 220 && data[j + 2] > 220) {
            data[j] = data[j] - 30;
            data[j + 1] = data[j + 1] - 30;
            data[j + 2] = data[j + 2] - 30;
          } else if (data[j] < 35 && data[j + 1] < 35 && data[j + 2] < 35) {
            data[j] = 36;
            data[j + 1] = 40;
            data[j + 2] = 52;
          }
        }
        
        context!.putImageData(imageData, 0, 0);
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        if (i > 1) {
          outputPdf.addPage();
        }
        
        const imgProps = outputPdf.getImageProperties(imgData);
        const imgWidth = outputPdf.internal.pageSize.getWidth();
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        
        if (imgHeight > outputPdf.internal.pageSize.getHeight()) {
          const scaleFactor = outputPdf.internal.pageSize.getHeight() / imgHeight;
          outputPdf.addImage(imgData, 'JPEG', 0, 0, imgWidth * scaleFactor, outputPdf.internal.pageSize.getHeight());
        } else {
          outputPdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        }
      }
      
      const originalFilename = file.name.replace(/\.[^/.]+$/, "");
      outputPdf.save(`${originalFilename}-dark.pdf`);
      
      toast({
        title: "Download Complete",
        description: "Your darkened PDF has been downloaded.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Download Failed",
        description: "There was an error creating the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

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
          <div className="pdf-container overflow-auto max-h-[70vh] rounded-lg" ref={pdfContainerRef}>
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
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        )}

        <div className="flex justify-between items-center mt-4 pdf-controls">
          <Button
            variant="ghost"
            size="icon"
            onClick={previousPage}
            disabled={pageNumber <= 1 || !file}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {numPages > 0 ? (
            <p className="text-sm">
              Page {pageNumber} of {numPages}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No pages</p>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={nextPage}
            disabled={pageNumber >= numPages || !file}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        
        {file && (
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={downloadPDF} 
              disabled={isDownloading || !file}
              className="bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Processing..." : "Download Dark PDF"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PDFViewer;
