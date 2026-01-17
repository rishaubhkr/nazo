"use client"

import * as React from "react"
import { Upload, FileText, Image as ImageIcon, Loader2, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadExtractorProps {
    onTextExtracted: (text: string) => void
    onError?: (error: string) => void
}

export default function FileUploadExtractor({ onTextExtracted, onError }: FileUploadExtractorProps) {
    const [file, setFile] = React.useState<File | null>(null)
    const [extracting, setExtracting] = React.useState(false)
    const [progress, setProgress] = React.useState(0)
    const [extractedText, setExtractedText] = React.useState("")
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        // Validate file type
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        if (!validTypes.includes(selectedFile.type)) {
            onError?.("Please upload a PDF or image file (PNG, JPEG, WebP)")
            return
        }

        // Validate file size (max 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            onError?.("File size must be less than 10MB")
            return
        }

        setFile(selectedFile)
        await extractText(selectedFile)
    }

    const extractText = async (file: File) => {
        setExtracting(true)
        setProgress(0)

        try {
            let text = ""

            if (file.type === 'application/pdf') {
                text = await extractFromPDF(file)
            } else {
                text = await extractFromImage(file)
            }

            if (!text || text.trim().length === 0) {
                throw new Error('No text could be extracted from this file.')
            }

            setExtractedText(text)
            onTextExtracted(text)
            setProgress(100)
        } catch (error: any) {
            console.error("Text extraction error:", error)
            const errorMessage = error.message || "Failed to extract text from file. Please try another file."
            onError?.(errorMessage)
            setFile(null) // Clear the file on error
        } finally {
            setExtracting(false)
        }
    }

    const extractFromPDF = async (file: File): Promise<string> => {
        setProgress(10)

        try {
            // Dynamic import
            const pdfjsLib = await import('pdfjs-dist')

            // Use local worker file to avoid CORS issues
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
                console.log('Using local worker file')
            }

            console.log('PDF.js version:', pdfjsLib.version)

            const arrayBuffer = await file.arrayBuffer()
            setProgress(30)

            console.log('Loading PDF document...')
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                verbosity: 0
            })
            const pdf = await loadingTask.promise
            const numPages = pdf.numPages

            console.log(`PDF loaded successfully. Pages: ${numPages}`)

            let fullText = ""

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ')

                fullText += pageText + '\n\n'
                setProgress(30 + (i / numPages) * 60)
                console.log(`Extracted page ${i}/${numPages}`)
            }

            const trimmedText = fullText.trim()

            if (!trimmedText) {
                throw new Error('No text found in PDF. The PDF might be image-based or encrypted.')
            }

            console.log(`Extraction complete. Total characters: ${trimmedText.length}`)
            return trimmedText

        } catch (error: any) {
            console.error('PDF extraction error:', error)

            // Provide helpful error messages
            if (error.message?.includes('worker') || error.message?.includes('Worker')) {
                throw new Error('PDF processor initialization failed. Please try again or use a different file.')
            }

            if (error.message?.includes('password') || error.message?.includes('encrypted')) {
                throw new Error('This PDF is password-protected. Please use an unprotected PDF.')
            }

            throw new Error(error.message || 'Failed to extract text from PDF')
        }
    }

    const extractFromImage = async (file: File): Promise<string> => {
        setProgress(10)

        // Dynamic import for Tesseract
        const Tesseract = await import('tesseract.js')

        setProgress(20)

        const result = await Tesseract.recognize(
            file,
            'eng',
            {
                logger: (m: any) => {
                    if (m.status === 'recognizing text') {
                        setProgress(20 + m.progress * 70)
                    }
                }
            }
        )

        return result.data.text.trim()
    }

    const handleClear = () => {
        setFile(null)
        setExtractedText("")
        setProgress(0)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                onClick={() => !extracting && fileInputRef.current?.click()}
                className={cn(
                    "relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer",
                    extracting ? "border-[#58cc02] bg-[#58cc02]/5" : "border-[#37464f] hover:border-[#58cc02] hover:bg-[#1e2a30]",
                    file && "border-[#58cc02]"
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={extracting}
                />

                <div className="flex flex-col items-center gap-4">
                    {extracting ? (
                        <>
                            <Loader2 className="w-12 h-12 text-[#58cc02] animate-spin" />
                            <div className="text-center">
                                <p className="text-white font-bold mb-2">Extracting text...</p>
                                <div className="w-48 h-2 bg-[#37464f] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#58cc02] transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-[#afafaf] text-sm mt-2">{Math.round(progress)}%</p>
                            </div>
                        </>
                    ) : file ? (
                        <>
                            <CheckCircle2 className="w-12 h-12 text-[#58cc02]" />
                            <div className="text-center">
                                <p className="text-white font-bold">{file.name}</p>
                                <p className="text-[#afafaf] text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleClear()
                                    }}
                                    className="mt-2 text-[#ff4b4b] hover:underline text-sm"
                                >
                                    Remove
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 text-[#afafaf]" />
                            <div className="text-center">
                                <p className="text-white font-bold mb-1">Upload PDF or Image</p>
                                <p className="text-[#afafaf] text-sm">Click to browse or drag and drop</p>
                                <p className="text-[#506672] text-xs mt-2">Supports: PDF, PNG, JPEG, WebP (max 10MB)</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Extracted Text Preview */}
            {extractedText && (
                <div className="bg-[#1e2a30] border border-[#37464f] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#58cc02]" />
                            Extracted Text
                        </h3>
                        <span className="text-[#afafaf] text-sm">{extractedText.length} characters</span>
                    </div>
                    <div className="bg-[#131f24] rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                        <p className="text-[#afafaf] text-sm leading-relaxed whitespace-pre-wrap">
                            {extractedText.slice(0, 500)}
                            {extractedText.length > 500 && "..."}
                        </p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #131f24;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #37464f;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #58cc02;
                }
            `}</style>
        </div>
    )
}
