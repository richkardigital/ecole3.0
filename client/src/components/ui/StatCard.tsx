import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  count: string | number;
  label: string;
  icon?: React.ReactNode;
  iconColor?: string;
  badgeColor?: string;
  onClick?: () => void;
  trend?: { value: number; isPositive: boolean };
  suffix?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  count, 
  label, 
  icon, 
  iconColor = 'text-[#189CD8]',
  badgeColor = 'bg-[#189CD8]/10 border-[#189CD8]/25',
  onClick,
  trend,
  suffix,
}) => {
  return (
    <div 
      onClick={onClick} 
      className={`group relative overflow-hidden rounded-2xl bg-white border border-slate-200 transition-all duration-300 hover:border-slate-300 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div className="relative p-6">
        <div className="flex justify-between items-start mb-5">
          {/* Icon */}
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${badgeColor} border transition-transform duration-300 group-hover:scale-105`}>
            <span className={iconColor}>{icon}</span>
          </div>
          
          {/* Trend badge */}
          {trend && (
            <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
              trend.isPositive 
                ? 'text-[#1280B2] bg-[#189CD8]/10 border-[#189CD8]/25' 
                : 'text-red-700 bg-red-50 border-red-200'
            }`}>
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        {/* Number */}
        <div className="mb-1.5">
          <span className="text-4xl font-black tracking-tight text-slate-900 leading-none">
            {count}
          </span>
          {suffix && <span className="text-lg font-bold text-slate-500 ml-1">{suffix}</span>}
        </div>
        
        {/* Label */}
        <p className="text-sm font-semibold text-slate-500 leading-snug">{label}</p>
      </div>
    </div>
  );
};
