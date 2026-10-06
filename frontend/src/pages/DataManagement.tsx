import React, { useState, useEffect } from 'react';
import {
  fetchActiveDataset,
  uploadDatasetFile,
  validateColumnMapping,
  processAndTrainUserDataset,
  switchToDemoDataset,
  API_BASE
} from '../services/api';
import { ActiveDatasetConfig, UploadPreviewResponse, ValidationResponse } from '../types';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight,
  Download,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

export const DataManagement: React.FC = () => {
  const [activeConfig, setActiveConfig] = useState<ActiveDatasetConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<UploadPreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'validation' | 'training' | 'complete'>('upload');
  
  // Training Stepper Progress
  const [trainProgress, setTrainProgress] = useState<number>(0);
  const [trainStatusText, setTrainStatusText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveConfig();
  }, []);

  const loadActiveConfig = async () => {
    setLoading(true);
    try {
      const cfg = await fetchActiveDataset();
      setActiveConfig(cfg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    const supportedExtensions = ['.csv', '.xlsx', '.xls'];
    const extension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!supportedExtensions.includes(extension)) {
      alert('Unsupported file type. Please upload CSV or Excel.');
      return;
    }

    const maxUploadBytes = 50 * 1024 * 1024;
    if (selectedFile.size > maxUploadBytes) {
      alert('File exceeds the 50 MB upload limit.');
      return;
    }

    if (selectedFile.size === 0) {
      alert('The uploaded file is empty.');
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    try {
      const previewRes = await uploadDatasetFile(selectedFile);
      setUploadPreview(previewRes);
      setMapping(previewRes.auto_mapped);
      setValidation(null);
      setStep('preview');
    } catch (err) {
      console.error('Dataset upload failed:', err);
      const message = err instanceof Error ? err.message : 'Dataset upload failed.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateMapping = async () => {
    if (!uploadPreview) return;
    setLoading(true);
    try {
      const valRes = await validateColumnMapping(mapping, uploadPreview.filename);
      setValidation(valRes);
      setStep('validation');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTraining = async () => {
    if (!uploadPreview) return;
    setStep('training');
    
    // Simulate multi-step progress stepper
    const stepsText = [
      '1/6 Preprocessing user dataset & cleaning missing values...',
      '2/6 Computing time-series lag and rolling features...',
      '3/6 Training Random Forest, XGBoost, and LightGBM regressors...',
      '4/6 Training CatBoost & Gradient Boosting regressors...',
      '5/6 Optimizing SLSQP Weighted Ensemble combiner...',
      '6/6 Generating updated forecasts, pricing, and inventory recommendations...'
    ];

    for (let i = 0; i < stepsText.length; i++) {
      setTrainStatusText(stepsText[i]);
      setTrainProgress(Math.round(((i + 1) / stepsText.length) * 100));
      await new Promise((res) => setTimeout(res, 800));
    }

    try {
      await processAndTrainUserDataset(mapping, uploadPreview.filename, file?.name || 'User Dataset');
      setStep('complete');
      await loadActiveConfig();
    } catch (err) {
      console.error(err);
      alert('Model training failed. Please check column mappings.');
      setStep('validation');
    }
  };

  const handleSwitchToDemo = async () => {
    if (!confirm('Switch active dataset back to built-in Demo Retail Dataset?')) return;
    setLoading(true);
    try {
      await switchToDemoDataset();
      await loadActiveConfig();
      setStep('upload');
      setFile(null);
      setUploadPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Dataset Status Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Data Management</span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  activeConfig?.active_mode === 'user'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {activeConfig?.active_mode === 'user' ? 'Custom Dataset Active' : 'Demo Dataset Active'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" /> Active Dataset: {activeConfig?.display_name || 'Demo Dataset'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              File-backed data persistence: <code className="text-slate-300">data/raw/{activeConfig?.filename}</code>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={`${API_BASE}/data/sample-csv`}
              download
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" /> Download Template CSV
            </a>

            {activeConfig?.active_mode === 'user' && (
              <button
                onClick={handleSwitchToDemo}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Switch to Demo Dataset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload Drag & Drop Area */}
      {step === 'upload' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 rounded-2xl p-10 bg-slate-950/50 hover:bg-indigo-950/20 transition-all cursor-pointer group"
          >
            <UploadCloud className="w-12 h-12 text-indigo-400 group-hover:scale-110 mx-auto transition-transform mb-4" />
            <h3 className="text-lg font-bold text-white">Upload Your Store Retail Dataset</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
              Drag and drop your historical retail sales CSV or Excel file here to update forecasts, dynamic pricing, and inventory recommendations across the entire application.
            </p>

            <div className="mt-6 inline-block">
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition-all inline-flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Browse Files
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            <p className="text-[11px] text-slate-500 mt-4">Supported formats: CSV, XLSX • Maximum recommended file size: 50MB</p>
          </div>

          {/* Expected Columns Rationale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-indigo-400 mb-2">Required Dataset Columns</h4>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• <strong>Date</strong>: Daily timestamp (`date`, `sale_date`, `transaction_date`)</li>
                <li>• <strong>Product ID</strong>: Unique SKU code (`product_id`, `sku`, `item_code`)</li>
                <li>• <strong>Store ID</strong>: Store branch identifier (`store_id`, `branch`, `store`)</li>
                <li>• <strong>Sales Quantity</strong>: Units sold (`units_sold`, `sales`, `qty`)</li>
              </ul>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-emerald-400 mb-2">Optional Dataset Columns</h4>
              <ul className="text-xs text-slate-300 space-y-1">
                <li>• <strong>Price / Cost Price</strong>: Unit selling price & wholesale cost</li>
                <li>• <strong>Category</strong>: Retail department classification</li>
                <li>• <strong>Discount / Promotion</strong>: Active campaign indicators</li>
                <li>• <strong>Inventory / Lead Time</strong>: Stock on hand & supplier lead time</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Preview & Statistics */}
      {(step === 'preview' || step === 'mapping') && uploadPreview && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block">Total Uploaded Rows</span>
              <span className="text-xl font-bold text-white mt-1 block">{uploadPreview.num_rows.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block">Total Header Columns</span>
              <span className="text-xl font-bold text-white mt-1 block">{uploadPreview.num_cols}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block">Missing Values</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">{uploadPreview.missing_total}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400 block">Duplicate Records</span>
              <span className="text-xl font-bold text-slate-300 mt-1 block">{uploadPreview.duplicate_rows}</span>
            </div>
          </div>

          {/* Column Mapping Form */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Column Mapping & System Alignment
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Match your uploaded headers to System Columns. Missing optional columns will be auto-calculated using business defaults.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Required Mappings */}
              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Required System Columns</h3>
                {Object.entries(uploadPreview.required_cols_spec).map(([sysCol, label]) => (
                  <div key={sysCol} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">{label}</span>
                    <select
                      value={mapping[sysCol] || ''}
                      onChange={(e) => setMapping({ ...mapping, [sysCol]: e.target.value })}
                      className="bg-slate-900 border border-slate-700 text-indigo-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none min-w-[180px]"
                    >
                      <option value="">-- Select Header --</option>
                      {uploadPreview.user_headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Optional Mappings */}
              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Optional System Columns</h3>
                {Object.entries(uploadPreview.optional_cols_spec).map(([sysCol, label]) => (
                  <div key={sysCol} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300">{label}</span>
                    <select
                      value={mapping[sysCol] || ''}
                      onChange={(e) => setMapping({ ...mapping, [sysCol]: e.target.value })}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none min-w-[180px]"
                    >
                      <option value="">-- Not Provided (Auto) --</option>
                      {uploadPreview.user_headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleValidateMapping}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
              >
                Validate Column Mapping <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Uploaded Data Preview (First 15 Rows)</h3>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                  <tr>
                    {uploadPreview.user_headers.map((h) => (
                      <th key={h} className="p-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {uploadPreview.preview_records.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      {uploadPreview.user_headers.map((h) => (
                        <td key={h} className="p-2.5 whitespace-nowrap font-mono">{String(row[h])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Validation Checklist */}
      {step === 'validation' && validation && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Dataset Validation Summary
          </h2>

          <div className="space-y-3">
            {validation.checklist.map((c, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  c.status === 'PASS'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : c.status === 'WARN'
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                    : c.status === 'FAIL'
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {c.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {c.status === 'WARN' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {c.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400" />}
                  <span className="font-bold">{c.item}</span>
                </div>
                <span>{c.message}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep('mapping')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Back to Column Mapping
            </button>

            <button
              disabled={!validation.is_valid}
              onClick={handleExecuteTraining}
              className={`font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all ${
                validation.is_valid
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Cpu className="w-4 h-4" /> Process Dataset & Retrain Models
            </button>
          </div>
        </div>
      )}

      {/* Model Retraining Stepper Modal */}
      {step === 'training' && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <h2 className="text-lg font-bold text-white">Retraining ML Pipeline & Generating Predictions</h2>
          <p className="text-xs text-slate-400">{trainStatusText}</p>

          <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 max-w-md mx-auto overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${trainProgress}%` }}
            ></div>
          </div>
          <span className="text-xs font-mono text-indigo-400 block">{trainProgress}% Complete</span>
        </div>
      )}

      {/* Success Notification */}
      {step === 'complete' && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 p-8 rounded-2xl text-center space-y-4">
          <Sparkles className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Dataset Processed & Models Retrained Successfully!</h2>
          <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
            All 5 base regressors (Random Forest, XGBoost, LightGBM, CatBoost, Gradient Boosting) and the SLSQP Weighted Ensemble have been updated. The entire dashboard is now powered by your custom retail dataset.
          </p>
          <div className="pt-2">
            <button
              onClick={() => (window.location.href = '/')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all inline-flex items-center gap-2"
            >
              Return to Executive Overview <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
