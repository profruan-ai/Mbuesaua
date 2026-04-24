/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Send, BookOpen, RefreshCw, ClipboardList, Loader2 } from 'lucide-react';

export default function App() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setText(''); // Clear text if file is selected
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (e.target.value) {
      setFile(null); // Clear file if text is entered
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // URL da API - usa variável de ambiente em produção, ou proxy em desenvolvimento
const API_URL = import.meta.env.VITE_API_URL || '';

  const adaptQuestionsWithAI = async (questions: string[]) => {
    const response = await fetch(`${API_URL}/api/contextualize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao contextualizar questões com IA.');
    }

    const data = await response.json();
    return data.adaptedQuestions;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !file) {
      setError('Por favor, envie um arquivo ou digite o texto das questões.');
      return;
    }

    setIsLoading(true);
    setError('');
    setLoadingStep('Extraindo texto...');

    try {
      // 1. Extract text
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('text', text);
      }

      const extractResponse = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!extractResponse.ok) {
        let errorMessage = 'Erro ao extrair texto.';
        try {
          const errorData = await extractResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON (e.g., HTML from Vite fallback), we ignore the parse error
          console.error('Failed to parse error response as JSON', e);
        }
        throw new Error(errorMessage);
      }

      let originalQuestions;
      try {
        const data = await extractResponse.json();
        originalQuestions = data.questions;
      } catch (e) {
        throw new Error('A resposta do servidor não é um JSON válido. Verifique se o servidor está rodando corretamente.');
      }
      
      // 2. Adapt with AI
      setLoadingStep('Contextualizando com IA...');
      const adaptedQuestions = await adaptQuestionsWithAI(originalQuestions);

      // 3. Generate PDF
      setLoadingStep('Gerando documento PDF...');
      const pdfResponse = await fetch(`${API_URL}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalQuestions, adaptedQuestions }),
      });

      if (!pdfResponse.ok) {
        const errorData = await pdfResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar PDF.');
      }

      // Handle file download
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questoes_contextualizadas.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl my-8">
        {/* Header */}
        <header className="bg-blue-800 text-white p-8 md:p-12 rounded-t-3xl shadow-2xl text-center">
          <h1 className="mb-4 flex flex-col items-center justify-center">
            <span className="text-6xl md:text-7xl font-bold leading-none">Iké</span>
            <span className="text-xl md:text-2xl font-medium text-blue-200 -mt-2 tracking-wide">Mbuesaua</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Transforme suas questões em materiais didáticos interculturalmente contextualizados.
          </p>
        </header>

        {/* Main Content */}
        <main className="bg-white p-8 md:p-12 rounded-b-3xl shadow-2xl border-x border-b border-slate-200">
          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg mb-8">
            <h3 className="text-blue-800 font-semibold text-lg mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Como funciona:
            </h3>
            <ul className="list-disc list-inside text-slate-700 space-y-2 ml-2">
              <li>Envie um arquivo PDF ou digite suas questões</li>
              <li>Nossa ferramenta adapta o contexto para a realidade indígena</li>
              <li>Receba um PDF completo com questões contextualizadas, fundamentação pedagógica e plano de aula</li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-8 text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload */}
            <div className="space-y-3">
              <label className="block text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Enviar arquivo (PDF ou TXT)
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt"
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className={`w-8 h-8 mb-3 ${file ? 'text-blue-600' : 'text-slate-400'}`} />
                    <p className="mb-2 text-sm text-slate-500">
                      <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-slate-500">PDF ou TXT</p>
                  </div>
                </label>
                {file && (
                  <div className="mt-3 text-sm text-blue-700 flex items-center gap-2 bg-blue-100 p-2 rounded-lg inline-flex">
                    <FileText className="w-4 h-4" />
                    {file.name}
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="ml-2 text-blue-900 hover:text-red-600 font-bold"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium uppercase tracking-wider">ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Text Input */}
            <div className="space-y-3">
              <label htmlFor="text-input" className="block text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Digitar questões diretamente
              </label>
              <textarea
                id="text-input"
                value={text}
                onChange={handleTextChange}
                placeholder="Cole suas questões aqui...&#10;&#10;Exemplo:&#10;1) Em um projeto de construção, os arquitetos estão avaliando a relação entre a quantidade de fileiras e a quantidade de cadeiras. O projeto inicial prevê uma sala para 304 pessoas. No caso de utilizarem 19 fileiras, o número de cadeiras por fileira será:&#10;a) 14&#10;b) 15&#10;c) 16&#10;d) 13&#10;e) 12"
                className="w-full min-h-[200px] p-4 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-blue-500 transition-colors resize-y text-slate-700 placeholder:text-slate-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (!text && !file)}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {loadingStep || 'Processando...'}
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Gerar PDF Contextualizado
                </>
              )}
            </button>
          </form>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-10 border-t border-slate-100">
            <div className="text-center p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Fundamentação Pedagógica</h4>
              <p className="text-slate-600 text-sm">Baseada na BNCC e Taxonomia de Bloom</p>
            </div>
            
            <div className="text-center p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Análise Comparativa</h4>
              <p className="text-slate-600 text-sm">Mostra a transformação realizada</p>
            </div>
            
            <div className="text-center p-6 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Plano de Aula</h4>
              <p className="text-slate-600 text-sm">Roteiro prático com metodologias ativas</p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>Este projeto promove a educação intercultural e o diálogo entre saberes.</p>
        </footer>
      </div>
    </div>
  );
}
