'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, CheckCircle, AlertTriangle, FileText, History } from 'lucide-react';
import { 
  AdminHeader, 
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

  return (
    <div>
      <AdminHeader
        title="Import Questions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Import', href: '/admin/import' }
        ]}
        actions={
          <Link 
            href="/admin/import/history"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <History className="w-4 h-4 mr-2" />
            Import History
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Download Template & Upload */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Step 1: Download Template
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Download the CSV template with the correct format and example data.
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </button>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Required Fields:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• <strong>subject</strong> (name, e.g., "Mathematics" or "English")</li>
                  <li>• <strong>topic</strong> (name, e.g., "Algebra" or "Comprehension")</li>
                  <li>• exam_type, year, question_text</li>
                  <li>• option_a, option_b, correct_answer</li>
                </ul>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mt-3 mb-2">Optional Fields:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• difficulty, passage, option_c, option_d, option_e</li>
                  <li>• hint, solution, further_study_links</li>
                  <li>• question_image_url, image_alt_text, image_width, image_height</li>
                </ul>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Note:</strong> Use subject and topic <strong>names</strong> (not UUIDs).
                    The system will automatically look them up in the database.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Step 2: Upload File
              </h2>
              <FileDropzone onFileSelect={handleFileSelect} />
              
              {selectedFile && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Validate File
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Validation Results */}
        {currentStep === 'validate' && validationResult && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Validation Results
              </h2>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {validationResult.totalRows}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Rows</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {validationResult.validRows}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Valid Rows</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {validationResult.invalidRows}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Invalid Rows</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Validation Progress</span>
                  <span>{Math.round((validationResult.validRows / validationResult.totalRows) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(validationResult.validRows / validationResult.totalRows) * 100}%` }}
                  />
                </div>
              </div>

              {/* Errors table */}
              {validationResult.errors.length > 0 && (
                <ValidationResultsTable errors={validationResult.errors} className="mb-6" />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleStartOver}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex space-x-3">
                  {validationResult.validRows > 0 && (
                    <button
                      onClick={() => handleImport(true)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Import {validationResult.validRows} Valid Row{validationResult.validRows !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Import Progress */}
        {currentStep === 'import' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
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
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Import Complete!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your questions have been successfully imported.
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {importResult.totalRows}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Rows</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.successfulRows}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResult.failedRows}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => router.push('/admin/questions')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View Questions
                </button>
                <button
                  onClick={() => router.push(`/admin/import/history`)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View Report
                </button>
                <button
                  onClick={handleStartOver}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Import More
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
