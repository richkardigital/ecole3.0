import React from 'react';
import { 
  FileText, 
  HelpCircle, 
  Calendar, 
  Clock, 
  Download, 
  CheckCircle2, 
  Layers, 
  Award,
  ExternalLink,
  ImageIcon,
  Sparkles
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getFileUrl } from '@/lib/api';

interface EvaluationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: any | null;
}

export const EvaluationPreviewModal: React.FC<EvaluationPreviewModalProps> = ({
  isOpen,
  onClose,
  evaluation
}) => {
  if (!evaluation) return null;

  const isCompo = evaluation.type === 'COMPOSITION_NIVEAU' || evaluation.type === 'COMPO_NIVEAU' || evaluation.type === 'COMPOSITION';
  const hasQuestions = evaluation.questions && evaluation.questions.length > 0;
  const hasAttachments = (evaluation.attachments && evaluation.attachments.length > 0) || evaluation.fileUrl;
  const subjectUrl = evaluation.attachments?.[0] || evaluation.fileUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCompo ? "Détails de la Composition" : "Détails de l'Évaluation"}
      size="lg"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Banner */}
        <div className={`p-5 rounded-2xl border ${
          isCompo 
            ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-brand-card border-indigo-500/30' 
            : 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-brand-card border-amber-500/30'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <span className={`text-xs uppercase font-extrabold px-3 py-1 rounded-full ${
              isCompo ? 'bg-indigo-500 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
            }`}>
              {isCompo ? 'Composition d\'examen' : 'Devoir / Évaluation'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-brand-sidebar border border-brand-border/60 text-brand-text">
                Coef: {evaluation.coefficient || 1}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                {evaluation.points || 20} points
              </span>
            </div>
          </div>

          <h3 className="text-lg font-black text-brand-text mb-2">
            {evaluation.title}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-brand-text-muted mt-4 pt-3 border-t border-brand-border/40">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-brand-accent shrink-0" />
              <span>Limite : <strong>{new Date(evaluation.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
            </div>
            {evaluation.timeLimit && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Durée : <strong>{evaluation.timeLimit} min</strong></span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Trimestre : <strong>{evaluation.term?.name || 'Général'}</strong></span>
            </div>
          </div>
        </div>

        {/* Consignes / Description */}
        {evaluation.description && (
          <div className="bg-brand-card p-4 rounded-xl border border-brand-border/60">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text-muted mb-2">
              Consignes de l'épreuve
            </h4>
            <p className="text-xs text-brand-text whitespace-pre-line leading-relaxed">
              {evaluation.description}
            </p>
          </div>
        )}

        {/* Documents joints */}
        {(subjectUrl || evaluation.correctionUrl) && (
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-accent" />
              Documents associés
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjectUrl && (
                <a
                  href={getFileUrl(subjectUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-brand-sidebar hover:bg-brand-accent/10 border border-brand-border/70 hover:border-brand-accent/50 rounded-xl transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-5 h-5 text-brand-accent shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-text group-hover:text-brand-accent truncate">Sujet de l'épreuve</p>
                      <p className="text-[10px] text-brand-text-muted">Cliquer pour ouvrir / télécharger</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-brand-text-muted group-hover:text-brand-accent shrink-0" />
                </a>
              )}

              {evaluation.correctionUrl && (
                <a
                  href={getFileUrl(evaluation.correctionUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 bg-brand-sidebar hover:bg-emerald-500/10 border border-brand-border/70 hover:border-emerald-500/50 rounded-xl transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-brand-text group-hover:text-emerald-500 truncate">Corrigé & Barème</p>
                      <p className="text-[10px] text-brand-text-muted">Cliquer pour consulter</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-brand-text-muted group-hover:text-emerald-500 shrink-0" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Questions interactives si questionnaire */}
        {hasQuestions && (
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-brand-text flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-brand-accent" />
              Questionnaire interactif ({evaluation.questions.length} questions)
            </h4>

            <div className="space-y-3">
              {evaluation.questions.map((q: any, idx: number) => (
                <div key={q.id || idx} className="p-4 rounded-xl bg-brand-sidebar border border-brand-border/60 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-md bg-brand-accent text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-brand-text">{q.text}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-brand-card text-brand-text-muted border border-brand-border/50 shrink-0">
                      {q.points || 1} pt{(q.points || 1) > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Question Image if present */}
                  {q.imageUrl && (
                    <div className="my-2 bg-brand-card p-2 rounded-lg border border-brand-border/50 inline-block">
                      <img
                        src={getFileUrl(q.imageUrl)}
                        alt={`Question ${idx + 1}`}
                        className="max-h-48 rounded object-contain"
                      />
                    </div>
                  )}

                  {/* Options */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: any, optIdx: number) => (
                        <div
                          key={opt.id || optIdx}
                          className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 font-semibold'
                              : 'bg-brand-card border-brand-border/40 text-brand-text-muted'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                            opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-brand-sidebar text-brand-text-muted'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="truncate">{opt.text}</span>
                          {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-500 shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-brand-border/60">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
