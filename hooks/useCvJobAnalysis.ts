import { useState, useEffect, useCallback } from 'react';
import { analyzeCvAgainstJob } from '../lib/cv-job-analysis/cvJobAnalysisService';
import {
  type CvJobAnalysisResult,
  type CvJobAnalysisError,
} from '../lib/cv-job-analysis/cvJobAnalysisTypes';

interface UseCvJobAnalysisState {
  data: CvJobAnalysisResult | null;
  loading: boolean;
  error: CvJobAnalysisError | null;
  isAnalyzing: boolean;
}

export function useCvJobAnalysis(candidateId: string | null, jobId: string | null) {
  const [state, setState] = useState<UseCvJobAnalysisState>({
    data: null,
    loading: false,
    error: null,
    isAnalyzing: false,
  });

  const analyze = useCallback(async () => {
    if (!candidateId || !jobId) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 'GENERAL_ERROR',
          message: 'ID candidat ou offre manquant.',
        },
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isAnalyzing: true,
      error: null,
    }));

    try {
      const result = await analyzeCvAgainstJob({
        candidateId,
        jobId,
      });

      setState((prev) => ({
        ...prev,
        data: result,
        isAnalyzing: false,
        error: null,
      }));
    } catch (err: any) {
      const message = String(err?.message ?? '');

      let errorCode: CvJobAnalysisError['code'] = 'GENERAL_ERROR';
      if (message.includes('CV') || message.includes('cv')) {
        errorCode = 'CV_MISSING';
      } else if (message.includes('offre') || message.includes('job')) {
        errorCode = 'JOB_NOT_FOUND';
      } else if (message.includes('429') || message.includes('rate')) {
        errorCode = 'RATE_LIMITED';
      } else if (message.includes('groq') || message.includes('Groq')) {
        errorCode = 'GROQ_ERROR';
      }

      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        error: {
          code: errorCode,
          message,
        },
      }));
    }
  }, [candidateId, jobId]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isAnalyzing: false,
    });
  }, []);

  return {
    ...state,
    analyze,
    reset,
  };
}
