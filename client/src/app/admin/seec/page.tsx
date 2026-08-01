import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Network, Download, Building, FileSpreadsheet, Search } from 'lucide-react';
import api from '@/lib/api';
import * as XLSX from 'xlsx';

export default function SeecPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [teachingTypeFilter, setTeachingTypeFilter] = useState('ALL');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('ALL');

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
    { key: 'schoolType', header: 'Secteur', render: (row: any) => row.schoolType?.name || 'N/A' },
    { key: 'teachingType', header: 'Type', render: (row: any) => row.teachingType?.name || 'N/A' },
  ];

  const filteredSchools = schools.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)) || (s.ville && s.ville.toLowerCase().includes(q));
    const matchTT = teachingTypeFilter === 'ALL' || s.teachingType?.name === teachingTypeFilter;
    const matchST = schoolTypeFilter === 'ALL' || s.schoolType?.name === schoolTypeFilter;
    return matchSearch && matchTT && matchST;
  });

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
        <div className="p-4 border-b border-brand-border/50 bg-brand-sidebar/30 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-80">
               <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
               <input 
                   type="text"
                   placeholder="Rechercher une école, un code..."
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
               />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
               <select 
                   value={teachingTypeFilter}
                   onChange={e => setTeachingTypeFilter(e.target.value)}
                   className="px-3 py-2 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer"
               >
                   <option value="ALL">Tous types d'enseignement</option>
                   {Array.from(new Set(schools.map(s => s.teachingType?.name).filter(Boolean))).map(tt => (
                       <option key={tt as string} value={tt as string}>{tt as string}</option>
                   ))}
               </select>
               <select 
                   value={schoolTypeFilter}
                   onChange={e => setSchoolTypeFilter(e.target.value)}
                   className="px-3 py-2 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer"
               >
                   <option value="ALL">Tous secteurs</option>
                   {Array.from(new Set(schools.map(s => s.schoolType?.name).filter(Boolean))).map(st => (
                       <option key={st as string} value={st as string}>{st as string}</option>
                   ))}
               </select>
           </div>
        </div>
        <DataTable
          columns={columns}
          data={filteredSchools}
          loading={loading}
          emptyMessage="Aucune école trouvée dans le réseau."
        />
      </div>
    </div>
  );
}
