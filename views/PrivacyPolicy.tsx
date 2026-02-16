
import React from 'react';
import { Shield, Lock, Eye, Database, Globe, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-slide-up">
      <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-ocean-700 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </Link>

      <div className="bg-white rounded-[48px] shadow-2xl border-2 border-slate-50 overflow-hidden">
        <div className="bg-ocean-700 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <Shield size={48} className="mb-6 opacity-80" />
          <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight">Privacy Policy</h1>
          <p className="mt-4 text-ocean-100 font-bold text-sm uppercase tracking-[0.2em]">Effective Date: January 1, 2024</p>
        </div>

        <div className="p-8 md:p-16 space-y-12">
          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-ocean-700">
              <Eye size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tight">Introduction</h2>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              At AndamanBazaar, we are committed to protecting your privacy. This policy describes how we collect, use, and handle your information when you use our hyperlocal marketplace tailored for the Andaman & Nicobar Islands.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-ocean-700">
              <Database size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tight">Information We Collect</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Personal Data</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Name, email, phone number, and profile photos used for account verification and marketplace interactions.</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl space-y-2">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Location Data</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Precise geolocation (GPS) to verify your residency within the Islands and provide hyperlocal search results.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-ocean-700">
              <Lock size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tight">Data Security</h2>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              We use Supabase's secure infrastructure to store your data. All communications between your device and our servers are encrypted using Industry Standard SSL/TLS encryption. We do not store your passwords in plain text.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-ocean-700">
              <Globe size={24} />
              <h2 className="text-2xl font-black uppercase tracking-tight">Island Data Residency</h2>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              In accordance with Indian IT Laws, user data is processed securely. While we use global infrastructure (Supabase), our operations and data focus are restricted to users within the Indian jurisdiction, specifically the A&N Islands.
            </p>
          </section>

          <div className="pt-8 border-t-2 border-slate-50 flex flex-col items-center space-y-4 text-center">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Questions about your data?</p>
            <a href="mailto:privacy@andamanbazaar.com" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all">Contact Privacy Officer</a>
          </div>
        </div>
      </div>
    </div>
  );
};
