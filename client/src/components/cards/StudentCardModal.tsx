import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { StudentCard } from '@/components/cards/StudentCard';
import { StudentCardData } from '@/lib/studentCardPdfGenerator';
import { Sparkles } from 'lucide-react';

interface StudentCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardData: StudentCardData | null;
}

export const StudentCardModal: React.FC<StudentCardModalProps> = ({
  isOpen,
  onClose,
  cardData,
}) => {
  if (!cardData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Carte d'Apprenant Officielle École 3.0"
      size="lg"
    >
      <div className="py-4 px-2 flex flex-col items-center justify-center">
        <p className="text-xs text-slate-500 mb-6 text-center max-w-md">
          Cliquez sur la carte pour la retourner en 3D (Recto / Verso) ou utilisez les boutons ci-dessous pour exporter le badge officiel au format PDF.
        </p>

        <StudentCard data={cardData} showActions={true} />
      </div>
    </Modal>
  );
};
