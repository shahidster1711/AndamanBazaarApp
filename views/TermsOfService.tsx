
import React from 'react';
import { Gavel, AlertTriangle, CheckCircle, Info, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-slide-up">
      <Link to="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-ocean-700 mb-8 transition-colors font-black uppercase text-[10px] tracking-widest">
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </Link>

      <div className="bg-white rounded-[48px] shadow-2xl border-2 border-slate-50 overflow-hidden">
        <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-ocean-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <Gavel size={48} className="mb-6 opacity-80 text-ocean-400" />
          <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight leading-tight">Terms of Service</h1>
          <p className="mt-4 text-slate-400 font-bold text-sm uppercase tracking-[0.2em]">Legal Framework for Island Trading</p>
        </div>

        <div className="p-8 md:p-16 space-y-12">
          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900">
              <Info size={24} className="text-ocean-600" />
              <h2 className="text-2xl font-black uppercase tracking-tight">1. Acceptance of Terms</h2>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              By accessing AndamanBazaar, you agree to be bound by these terms. This platform is a classifieds service intended for residents of the Andaman & Nicobar Islands. Users outside this region may have limited access to certain features like "Island Verified" status.
            </p>
          </section>

          <section className="p-8 bg-amber-50 rounded-[32px] border-2 border-amber-100 space-y-4">
            <div className="flex items-center space-x-3 text-amber-700">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-black uppercase tracking-tight">2. Safety Warning (Crucial)</h2>
            </div>
            <p className="text-amber-800 font-bold text-sm leading-relaxed">
              AndamanBazaar is NOT a payment processor. We do not facilitate escrow or delivery. 
              Always meet in public places (e.g., Aberdeen Bazaar, Cellular Jail complex, Jetty areas). 
              Never send money online via UPI or Bank Transfer before seeing the item in person.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900">
              <CheckCircle size={24} className="text-emerald-600" />
              <h2 className="text-2xl font-black uppercase tracking-tight">3. User Conduct & Listings</h2>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "No illegal substances or items prohibited by Indian Law.",
                "No fraudulent or misleading descriptions.",
                "No harassment of other community members.",
                "Verify location honestly for the trust badge."
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-2 text-sm font-bold text-slate-500">
                  <span className="text-emerald-500">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-900">
              <Gavel size={24} className="text-ocean-600" />
              <h2 className="text-2xl font-black uppercase tracking-tight">4. Limitation of Liability</h2>
            </div>
            <p className="text-slate-600 font-medium leading-relaxed">
              AndamanBazaar acts only as a venue for buyers and sellers to connect. We are not responsible for the quality, safety, or legality of the items listed, or the truth or accuracy of the listings. Transactions are solely between the buyer and the seller.
            </p>
          </section>

          <div className="pt-8 border-t-2 border-slate-50 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Last Updated: August 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};
