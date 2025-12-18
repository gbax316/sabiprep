'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, CheckCircle, AlertTriangle, FileText, History, ArrowRight, ArrowLeft, RefreshCcw, Eye, X } from 'lucide-react';
import { 
  AdminHeader, 
  AdminSecondaryButton,
  FileDropzone,
  ValidationResultsTable,
  ImportProgressBar
} from '@/components/admin';
import Link from 'next/link';

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface ValidationResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  duplicates: number[];
  createdTopics?: Array<{ name: string; subject: string }>;
}

interface ImportResult {
  reportId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}

type ImportStep = 'upload' | 'validate' | 'import' | 'complete';

export default function ImportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/import/template');
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sabiprep_question_import_template_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download template');
      console.error(err);
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (!fileContent) {
      setError('Please select a file first');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: fileContent })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Validation failed');
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      setCurrentStep('validate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async (validOnly: boolean = true) => {
    if (!selectedFile || !fileContent) {
      setError('No file selected');
      return;
    }

    setIsImporting(true);
    setCurrentStep('import');
    setError(null);

    try {
      const response = await fetch('/api/admin/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: fileContent,
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          validRowsOnly: validOnly
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setFileContent('');
    setValidationResult(null);
    setImportResult(null);
    setError(null);
  };

  // Step indicator component
  const stepIndicator = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'validate', label: 'Validate', icon: CheckCircle },
    { key: 'import', label: 'Import', icon: Download },
    { key: 'complete', label: 'Complete', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Import Questions"
        subtitle="Bulk import questions from CSV files"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Import' }
        ]}
        actions={
          <AdminSecondaryButton href="/admin/import/history">
            <History className="w-4 h-4" />
            Import History
          </AdminSecondaryButton>
        }
      />

      {/* Step Indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between">
          {stepIndicator.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = step.key === currentStep;
            const isPast = stepIndicator.findIndex(s => s.key === currentStep) > index;
            
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${index < stepIndicator.length - 1 ? 'flex-1' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                      : isPast 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span className={`mt-2 text-xs font-semibold ${
                    isActive 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : isPast 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < stepIndicator.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full ${
                    isPast ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
              <X className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        )}

        {/* Step 1: Download Template & Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Step 1: Download Template
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get the CSV template with correct format</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Download the CSV template with the correct format and example data.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium shadow-sm hover:shadow"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>

                <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Required Fields
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 grid grid-cols-2 gap-x-4">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <strong>subject</strong> (name)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <strong>topic</strong> (name)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      exam_type, year
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      question_text
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      option_a, option_b
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      correct_answer
                    </li>
                  </ul>
                  
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-5 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Optional Fields
                  </h3>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      difficulty, passage, option_c, option_d, option_e
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      hint1, hint2, hint3 (progressive hints), solution
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                      question_image_url, image_alt_text
                    </li>
                  </ul>
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>💡 Tip:</strong> Use subject and topic <strong>names</strong> (not UUIDs).
                      If a topic doesn't exist, it will be automatically created!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Step 2: Upload File
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select your CSV file to upload</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <FileDropzone onFileSelect={handleFileSelect} />
                
                {selectedFile && (
                  <div className="mt-6 flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-900 dark:text-emerald-100">{selectedFile.name}</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={handleValidate}
                      disabled={isValidating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg transition-all font-medium shadow-sm hover:shadow"
                    >
                      {isValidating ? (
                        <>
                          <RefreshCcw className="w-4 h-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          Validate File
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Validation Results */}
        {currentStep === 'validate' && validationResult && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Validation Results
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Review the validation summary</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {validationResult.totalRows}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Rows</div>
                  </div>
                  <div className="text-center p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {validationResult.validRows}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400 mt-1">Valid Rows</div>
                  </div>
                  <div className="text-center p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {validationResult.invalidRows}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-400 mt-1">Invalid Rows</div>
                  </div>
                </div>

                {/* Created Topics Notice */}
                {validationResult.createdTopics && validationResult.createdTopics.length > 0 && (
                  <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      New Topics Created
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                      The following topics were automatically created during validation:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {validationResult.createdTopics.map((topic, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium">
                          {topic.name} <span className="text-blue-500 dark:text-blue-400 mx-1">•</span> {topic.subject}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Validation Success Rate</span>
                    <span className="font-bold">{Math.round((validationResult.validRows / validationResult.totalRows) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(validationResult.validRows / validationResult.totalRows) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Errors table */}
                {validationResult.errors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Validation Errors ({validationResult.errors.length})
                    </h3>
                    <ValidationResultsTable errors={validationResult.errors} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Start Over
                  </button>
                  <div className="flex gap-3">
                    {validationResult.validRows > 0 && (
                      <button
                        onClick={() => handleImport(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-medium shadow-sm hover:shadow"
                      >
                        <Upload className="w-4 h-4" />
                        Import {validationResult.validRows} Valid Row{validationResult.validRows !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Import Progress */}
        {currentStep === 'import' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full mb-4">
                <RefreshCcw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Importing Questions...
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we process your file.
              </p>
            </div>
            <ImportProgressBar
              stage={isImporting ? 'processing' : 'validating'}
              progress={50}
              message="Importing questions..."
            />
          </div>
        )}

        {/* Step 4: Import Complete */}
        {currentStep === 'complete' && importResult && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-8 text-center bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-b border-emerald-200 dark:border-emerald-800">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Import Complete! 🎉
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your questions have been successfully imported into the system.
                </p>
              </div>
              
              <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {importResult.totalRows}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Rows</div>
                  </div>
                  <div className="text-center p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {importResult.successfulRows}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400 mt-1">Successful</div>
                  </div>
                  <div className="text-center p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {importResult.failedRows}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-400 mt-1">Failed</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => router.push('/admin/questions')}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all font-medium shadow-sm hover:shadow"
                  >
                    <Eye className="w-4 h-4" />
                    View Questions
                  </button>
                  <button
                    onClick={() => router.push(`/admin/import/history`)}
                    className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    <History className="w-4 h-4" />
                    View Report
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Import More
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
