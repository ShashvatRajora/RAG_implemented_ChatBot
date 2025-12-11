import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload as UploadIcon, File, CheckCircle, AlertCircle, Loader2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import io from 'socket.io-client';

interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  description: string;
}

interface UploadedSession {
  sessionId: string;
  filename: string;
  status: string;
  isLoaded: boolean;
}

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentSession, setCurrentSession] = useState<UploadedSession | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  const initialSteps: ProcessingStep[] = [
    {
      id: 'ocr',
      name: 'OCR Processing',
      status: 'pending',
      description: 'Converting PDF to structured text using Marker'
    },
    {
      id: 'tables', 
      name: 'Table Extraction',
      status: 'pending',
      description: 'Extracting tables using PDFPlumber'
    },
    {
      id: 'enhancement',
      name: 'Text Enhancement',
      status: 'pending',
      description: 'Combining text with extracted table data'
    },
    {
      id: 'indexing',
      name: 'AI Indexing',
      status: 'pending',
      description: 'Creating vector embeddings for intelligent search'
    }
  ];

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('processing-update', (data) => {
      if (data.sessionId === currentSession?.sessionId) {
        updateStepStatus(data.stepId, data.status);
      }
    });

    newSocket.on('processing-complete', (data) => {
      if (data.sessionId === currentSession?.sessionId) {
        setCurrentSession(prev => prev ? {
          ...prev,
          status: data.success ? 'ready' : 'error',
          isLoaded: data.success
        } : null);
      }
    });

    return () => newSocket.close();
  }, [currentSession?.sessionId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const updateStepStatus = (stepId: string, status: ProcessingStep['status']) => {
    setProcessingSteps(prev => 
      prev.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    setProcessingSteps(initialSteps);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setCurrentSession({
        sessionId: response.data.sessionId,
        filename: response.data.filename,
        status: 'processing',
        isLoaded: false
      });

    } catch (error) {
      console.error('Upload error:', error);
      // Handle error
    } finally {
      setIsUploading(false);
    }
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-white/30" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen py-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Upload & Process PDF</h1>
          <p className="text-xl text-white/70">
            Upload your PDF to extract insights and enable intelligent Q&A with advanced AI processing
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Upload Area */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8"
          >
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : file
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/30 hover:border-white/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <File className="w-16 h-16 text-green-500 mx-auto" />
                  <div>
                    <p className="text-white font-semibold">{file.name}</p>
                    <p className="text-white/70 text-sm">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • PDF
                    </p>
                  </div>
                  <button
                    onClick={uploadFile}
                    disabled={isUploading || (currentSession && currentSession.status === 'processing')}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    {isUploading ? 'Uploading...' : 'Process Document'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <UploadIcon className="w-16 h-16 text-white/50 mx-auto" />
                  <div>
                    <p className="text-white text-lg font-semibold mb-2">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-white/70 text-sm">
                      Supports PDF files up to 50MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300"
                  >
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </motion.div>

          {/* Processing Steps */}
          {processingSteps.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Processing Pipeline</h2>
              <div className="space-y-4">
                {processingSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                      step.status === 'processing'
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : step.status === 'completed'
                        ? 'bg-green-500/20 border border-green-500/30'
                        : step.status === 'error'
                        ? 'bg-red-500/20 border border-red-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {getStepIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{step.name}</h3>
                      <p className="text-white/70 text-sm">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Success Message */}
          {currentSession && currentSession.isLoaded && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-3xl border border-green-500/30 p-8 text-center"
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Processing Complete!</h2>
              <p className="text-white/80 mb-6">
                Your document "{currentSession.filename}" has been successfully processed and is ready for intelligent Q&A.
              </p>
              <Link
                to={`/chat?session=${currentSession.sessionId}`}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Start Chatting</span>
              </Link>
            </motion.div>
          )}

          {/* Processing Animation */}
          {currentSession && currentSession.status === 'processing' && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <LoadingSpinner size="lg" text="Processing your document with advanced AI..." />
              <p className="text-white/70 mt-4">
                This may take several minutes depending on document size and complexity
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Upload;