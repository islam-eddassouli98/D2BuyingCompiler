"use strict";

import type React from "react";
import { useState, useCallback } from "react";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle,
    Download,
    AlertCircle,
    Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { saveAs } from "file-saver";



interface UploadedFile {
    file: File;
    name: string;
    size: string;
}

interface LogEntry {
    message: string;
    type: "info" | "success" | "error";
    timestamp: string;
}

export default function ExcelProcessor() {
    const [templateFile, setTemplateFile] = useState<UploadedFile | null>(null);
    const [importFile, setImportFile] = useState<UploadedFile | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isProcessed, setIsProcessed] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [dragOver, setDragOver] = useState<string | null>(null);

    const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { message, type, timestamp }]);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const handleDrop = useCallback((e: React.DragEvent, fileType: "template" | "import") => {
        e.preventDefault();
        setDragOver(null);

        const files = Array.from(e.dataTransfer.files);
        const file = files[0];

        if (!file) return;

        if (!file.name.endsWith(".xlsx")) {
            addLog("Please upload only .xlsx files", "error");
            return;
        }

        const uploadedFile: UploadedFile = {
            file,
            name: file.name,
            size: formatFileSize(file.size),
        };

        if (fileType === "template") {
            setTemplateFile(uploadedFile);
            addLog(`Template file "${file.name}" uploaded successfully`, "success");
        } else {
            setImportFile(uploadedFile);
            addLog(`Import file "${file.name}" uploaded successfully`, "success");
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: "template" | "import") => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".xlsx")) {
            addLog("Please upload only .xlsx files", "error");
            return;
        }

        const uploadedFile: UploadedFile = {
            file,
            name: file.name,
            size: formatFileSize(file.size),
        };

        if (fileType === "template") {
            setTemplateFile(uploadedFile);
            addLog(`Template file "${file.name}" uploaded successfully`, "success");
        } else {
            setImportFile(uploadedFile);
            addLog(`Import file "${file.name}" uploaded successfully`, "success");
        }
    };

    const processFiles = async () => {
        if (!templateFile || !importFile) return;

        setIsProcessing(true);
        addLog("Uploading files to backend...", "info");

        const formData = new FormData();
        formData.append("template", templateFile.file);
        formData.append("import", importFile.file);

        try {
            const res = await fetch("https://d2buyingcompiler.onrender.com/api/process-excel", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Processing failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "TEMPLATE_Hyperoom_compilato.xlsx";
            link.click();

            addLog("✅ File compilation completed and downloaded!", "success");
            setIsProcessed(true);
        } catch (err) {
            console.error(err);
            addLog("❌ Error during file processing", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const resetApp = () => {
        setTemplateFile(null);
        setImportFile(null);
        setIsProcessing(false);
        setIsProcessed(false);
        setLogs([]);
    };

    const downloadFile = () => {
        if (!isProcessed) return;

        const link = document.createElement("a");
        link.href = "TEMPLATE_Hyperoom_compilato.xlsx"; // solo se già servito da backend static
        link.download = "TEMPLATE_Hyperoom_compilato.xlsx";
        link.click();
        addLog("File downloaded: TEMPLATE_Hyperoom_compilato.xlsx", "success");
    };

    const downloadExampleTemplate = async () => {
        try {
            const res = await fetch("/example-template.xlsx");
            if (!res.ok) throw new Error("File not found");
            const blob = await res.blob();
            saveAs(blob, "Example_Template.xlsx");
            addLog("📥 Example template downloaded", "success");
        } catch {
            addLog("❌ Failed to download example template", "error");
        }
    };

    const downloadExampleImport = async () => {
        try {
            const res = await fetch("/example-import.xlsx");
            if (!res.ok) throw new Error("File not found");
            const blob = await res.blob();
            saveAs(blob, "Example_Import.xlsx");
            addLog("📥 Example import downloaded", "success");
        } catch {
            addLog("❌ Failed to download example import", "error");
        }
    };


    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="bg-black text-white">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <img 
                            src="/logo.svg" 
                            alt="Logo" 
                            className=" object-contain"
                        />
                    </div>
                </div>
            </header>

            <div className="flex gap-4 justify-center py-4">
                <Button variant="outline" onClick={downloadExampleTemplate}>
                    Download Example Template
                </Button>
                <Button variant="outline" onClick={downloadExampleImport}>
                    Download Example Import
                </Button>
            </div>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-8 py-12">
                <div className="space-y-12">
                    {/* Upload Section */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Template File Upload */}
                        <Card
                            className={`border-2 transition-all duration-300 hover:shadow-xl ${dragOver === "template"
                                    ? "border-black bg-gray-50 shadow-lg"
                                    : templateFile
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            <CardContent className="p-8">
                                <div
                                    className="relative"
                                    onDrop={(e) => handleDrop(e, "template")}
                                    onDragOver={(e) => {
                                        e.preventDefault()
                                        setDragOver("template")
                                    }}
                                    onDragLeave={() => setDragOver(null)}
                                >
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        onChange={(e) => handleFileSelect(e, "template")}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />

                                    <div className="text-center py-12">
                                        {templateFile ? (
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto">
                                                    <CheckCircle className="w-8 h-8 text-black" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-lg">{templateFile.name}</p>
                                                    <p className="text-sm opacity-70">{templateFile.size}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mx-auto">
                                                    <Upload className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-lg text-gray-900">Template Hyperoom</p>
                                                    <p className="text-sm text-gray-500">Drag & drop your .xlsx template</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Import File Upload */}
                        <Card
                            className={`border-2 transition-all duration-300 hover:shadow-xl ${dragOver === "import"
                                    ? "border-black bg-gray-50 shadow-lg"
                                    : importFile
                                        ? "border-black bg-black text-white shadow-lg"
                                        : "border-gray-200 hover:border-gray-400"
                                }`}
                        >
                            <CardContent className="p-8">
                                <div
                                    className="relative"
                                    onDrop={(e) => handleDrop(e, "import")}
                                    onDragOver={(e) => {
                                        e.preventDefault()
                                        setDragOver("import")
                                    }}
                                    onDragLeave={() => setDragOver(null)}
                                >
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        onChange={(e) => handleFileSelect(e, "import")}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />

                                    <div className="text-center py-12">
                                        {importFile ? (
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto">
                                                    <CheckCircle className="w-8 h-8 text-black" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-lg">{importFile.name}</p>
                                                    <p className="text-sm opacity-70">{importFile.size}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center mx-auto">
                                                    <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-lg text-gray-900">File di Import</p>
                                                    <p className="text-sm text-gray-500">Drag & drop your .xlsx data</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Process Button */}
                    {templateFile && importFile && !isProcessed && (
                        <div className="text-center">
                            <Button
                                onClick={processFiles}
                                disabled={isProcessing}
                                className="px-12 py-4 bg-black hover:bg-gray-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-lg font-light tracking-wide"
                            >
                                {isProcessing ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5" />
                                        Compile & Download
                                    </div>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Log Section */}
                    {logs.length > 0 && (
                        <Card className="border border-gray-200 shadow-lg">
                            <CardContent className="p-8">
                                <h3 className="font-medium text-xl text-gray-900 mb-6 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-black rounded-full"></div>
                                    Processing Log
                                </h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {logs.map((log, index) => (
                                        <div key={index} className="flex items-start gap-4 text-sm py-2">
                                            <span className="text-gray-400 font-mono text-xs mt-1 min-w-[70px]">{log.timestamp}</span>
                                            <div className="flex items-center gap-3">
                                                {log.type === "success" && <CheckCircle className="w-4 h-4 text-black" />}
                                                {log.type === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                {log.type === "info" && <div className="w-4 h-4 border border-gray-300 rounded-full"></div>}
                                                <span
                                                    className={`${log.type === "success"
                                                            ? "text-black font-medium"
                                                            : log.type === "error"
                                                                ? "text-red-600"
                                                                : "text-gray-700"
                                                        }`}
                                                >
                                                    {log.message}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Download Section */}
                    {isProcessed && (
                        <Card className="border-2 border-black shadow-2xl">
                            <CardContent className="p-12 text-center">
                                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-light text-gray-900 mb-3">Ready to Download</h3>
                                <p className="text-gray-600 mb-8 text-lg font-light">
                                    Your compiled template is ready with all matched products and quantities.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button
                                        onClick={downloadFile}
                                        className="px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 text-lg font-light"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download Now
                                    </Button>
                                    <Button
                                        onClick={resetApp}
                                        className="px-8 py-4 border-2 border-black !text-black  rounded-full transition-all duration-300 text-lg font-light bg-transparent" 
                                    >
                                        Process Another File
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}