import React from 'react';
import { Building2, Users, MapPin, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12 animate-slide-up bg-neutral text-primary">
            <Link to="/" className="inline-flex items-center space-x-2 text-secondary hover:text-accent mb-8 transition-colors font-black uppercase text-sm tracking-widest">
                <ArrowLeft size={18} />
                <span>Back to Home</span>
            </Link>

            <div className="bg-base-100 rounded-[48px] shadow-2xl border-2 border-secondary/10 overflow-hidden">
                {/* Header */}
                <div className="bg-primary p-12 text-base-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <Building2 size={52} className="mb-6 text-accent" />
                    <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">About Us</h1>
                    <p className="mt-4 text-secondary font-bold text-base uppercase tracking-widest">Who We Are</p>
                </div>

                <div className="p-8 md:p-16 space-y-12">
                    {/* About the Platform */}
                    <section className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <Users size={28} className="text-accent" />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Our Platform</h2>
                        </div>
                        <p className="text-secondary font-medium leading-relaxed text-lg">
                            AndamanBazaar is a hyperlocal online marketplace designed exclusively for the residents and
                            communities of the Andaman &amp; Nicobar Islands. Our platform enables individuals to buy
                            and sell pre-owned goods, discover local services, and connect with trusted neighbours — all
                            within a safe, easy-to-use digital environment.
                        </p>
                        <p className="text-secondary font-medium leading-relaxed text-lg">
                            Whether you are looking to sell electronics, vehicles, furniture, or find fresh local
                            catch, AndamanBazaar is the go-to marketplace for island life.
                        </p>
                    </section>

                    {/* The Builder */}
                    <section className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <ShieldCheck size={28} className="text-accent" />
                            <h2 className="text-3xl font-black uppercase tracking-tight">The Builder</h2>
                        </div>
                        <div className="p-8 bg-secondary/5 rounded-3xl border-2 border-secondary/10">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-black shadow-xl flex-shrink-0">
                                    S
                                </div>
                                <div className="space-y-3 flex-1">
                                    <div>
                                        <p className="text-xl font-black text-primary">SHAHID MOOSA</p>
                                        <p className="text-sm text-secondary font-bold mt-0.5">
                                            Independently built &amp; operated · Sole Proprietor
                                        </p>
                                    </div>
                                    <p className="text-secondary font-medium leading-relaxed">
                                        AndamanBazaar is a one-person product — designed, coded, and maintained
                                        by a developer who lives on the islands. No VC, no committee, just craft.
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-2">
                                        <div>
                                            <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest">Platform</p>
                                            <p className="text-sm font-black text-primary mt-0.5">AndamanBazaar</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest">Website</p>
                                            <a
                                                href="https://shahidster.tech"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-black text-accent hover:text-primary transition-colors mt-0.5 block"
                                            >
                                                shahidster.tech ↗
                                            </a>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest">Base</p>
                                            <p className="text-sm font-black text-primary mt-0.5">Andaman Islands 🏝️</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Location */}
                    <section className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <MapPin size={28} className="text-accent" />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Our Location</h2>
                        </div>
                        <p className="text-secondary font-medium leading-relaxed text-lg">
                            AndamanBazaar operates from the Andaman &amp; Nicobar Islands, India. We are proudly
                            built by islanders, for islanders — serving communities across Port Blair,
                            Havelock (Swaraj Dweep), Neil (Shaheed Dweep), Diglipur, and beyond.
                        </p>
                    </section>

                    {/* Services Overview */}
                    <section className="space-y-4">
                        <h2 className="text-3xl font-black uppercase tracking-tight">What We Offer</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-secondary/5 rounded-3xl space-y-3 border-2 border-secondary/10">
                                <h3 className="font-black text-primary uppercase text-lg">Free Listings</h3>
                                <p className="text-secondary font-bold leading-relaxed text-base">
                                    Post your items for sale at no cost. All users can create listings, upload photos,
                                    and connect with buyers via our in-app chat.
                                </p>
                            </div>
                            <div className="p-8 bg-secondary/5 rounded-3xl space-y-3 border-2 border-secondary/10">
                                <h3 className="font-black text-primary uppercase text-lg">Listing Boosts</h3>
                                <p className="text-secondary font-bold leading-relaxed text-base">
                                    Promote your listings with paid boost tiers for enhanced visibility. See our{' '}
                                    <Link to="/pricing" className="text-accent underline hover:text-primary transition-colors">
                                        Pricing page
                                    </Link>{' '}
                                    for details.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <div className="pt-12 border-t-2 border-secondary/10 flex flex-col items-center space-y-4 text-center">
                        <p className="text-secondary text-lg font-bold uppercase tracking-widest">Have questions?</p>
                        <Link
                            to="/contact"
                            className="bg-primary text-base-100 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-secondary transition-all"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
