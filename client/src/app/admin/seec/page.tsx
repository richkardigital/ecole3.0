import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Network, Download, Building } from 'lucide-react';
import api from '@/lib/api';

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
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Code,Nom,Ville,Adresse\n" + 
      schools.map(s => `${s.code},${s.name},${s.ville || ''},${s.address || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "seec_ecoles.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <Download className="w-4 h-4 mr-2" />
          Exporter (CSV)
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
