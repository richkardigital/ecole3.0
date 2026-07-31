import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Network, Download, Building, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

export default function SeecPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchools = async () => {
    try {
      const res = await api.get('/schools');
      setSchools(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(schools.map(s => ({
        "Code": s.code,
        "Établissement": s.name,
        "Ville": s.ville || '',
        "Type": s.teachingType?.name || 'N/A'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ecoles_SEEC");
    XLSX.writeFile(wb, "seec_ecoles.xlsx");
  };

  const columns = [
    { key: 'code', header: 'Code' },
    { 
      key: 'name',
      header: 'Établissement', 
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
          <span className="font-medium text-white">{row.name}</span>
        </div>
      ) 
    },
    { key: 'ville', header: 'Ville' },
    { key: 'teachingType', header: 'Type', render: (row: any) => row.teachingType?.name || 'N/A' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Réseau SEEC" 
        description="Liste de toutes les écoles connectées au réseau SEEC."
      >
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exporter Excel
        </Button>
      </PageHeader>

      <div className="bg-brand-card rounded-xl border border-brand-border overflow-hidden">
        <DataTable
          columns={columns}
          data={schools}
          loading={loading}
          emptyMessage="Aucune école trouvée dans le réseau."
        />
      </div>
    </div>
  );
}
