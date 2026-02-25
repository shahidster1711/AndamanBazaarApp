import React, { useState } from 'react';
import { Mail, MapPin, Clock, Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ContactUs: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Open mailto with form data as a fallback
        const mailto = `mailto:support@andamanbazaar.in?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`;
        window.open(mailto, '_blank');
        setSubmitted(true);
    };

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
                    <MessageSquare size={52} className="mb-6 text-accent" />
                    <h1 className="text-5xl md:text-6xl font-heading font-black tracking-tight leading-tight">Contact Us</h1>
                    <p className="mt-4 text-secondary font-bold text-base uppercase tracking-widest">We're Here to Help</p>
                </div>

                <div className="p-8 md:p-16 space-y-12">
                    {/* Contact Info Cards */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 bg-secondary/5 rounded-3xl border-2 border-secondary/10 space-y-3 text-center">
                            <Mail size={32} className="text-accent mx-auto" />
                            <h3 className="font-black text-primary uppercase text-lg">Email</h3>
                            <a
                                href="mailto:support@andamanbazaar.in"
                                className="text-accent font-bold underline hover:text-primary transition-colors block"
                            >
                                support@andamanbazaar.in
                            </a>
                        </div>
                        <div className="p-8 bg-secondary/5 rounded-3xl border-2 border-secondary/10 space-y-3 text-center">
                            <MapPin size={32} className="text-accent mx-auto" />
                            <h3 className="font-black text-primary uppercase text-lg">Address</h3>
                            <p className="text-secondary font-bold text-sm leading-relaxed">
                                Andaman &amp; Nicobar Islands,<br />India — 744101
                            </p>
                        </div>
                        <div className="p-8 bg-secondary/5 rounded-3xl border-2 border-secondary/10 space-y-3 text-center">
                            <Clock size={32} className="text-accent mx-auto" />
                            <h3 className="font-black text-primary uppercase text-lg">Response Time</h3>
                            <p className="text-secondary font-bold text-sm leading-relaxed">
                                We typically respond<br />within 24–48 hours
                            </p>
                        </div>
                    </section>

                    {/* Contact Form */}
                    <section className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <Send size={28} className="text-accent" />
                            <h2 className="text-3xl font-black uppercase tracking-tight">Send Us a Message</h2>
                        </div>

                        {submitted ? (
                            <div className="p-8 bg-teal-50 rounded-3xl border-2 border-teal-200 text-center space-y-3">
                                <p className="text-2xl font-black text-teal-700">Thank You!</p>
                                <p className="text-teal-600 font-medium text-lg">
                                    Your email client should have opened with the message. If not, please
                                    email us directly at{' '}
                                    <a href="mailto:support@andamanbazaar.in" className="underline font-bold">
                                        support@andamanbazaar.in
                                    </a>
                                </p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-xl font-black uppercase text-sm tracking-widest hover:bg-teal-700 transition-colors"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="contact-name" className="text-xs font-black uppercase tracking-widest text-warm-400">
                                            Your Name
                                        </label>
                                        <input
                                            id="contact-name"
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-4 rounded-2xl border-2 border-secondary/20 bg-secondary/5 font-bold text-primary focus:outline-none focus:border-accent transition-colors"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="contact-email" className="text-xs font-black uppercase tracking-widest text-warm-400">
                                            Your Email
                                        </label>
                                        <input
                                            id="contact-email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full p-4 rounded-2xl border-2 border-secondary/20 bg-secondary/5 font-bold text-primary focus:outline-none focus:border-accent transition-colors"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="contact-subject" className="text-xs font-black uppercase tracking-widest text-warm-400">
                                        Subject
                                    </label>
                                    <input
                                        id="contact-subject"
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full p-4 rounded-2xl border-2 border-secondary/20 bg-secondary/5 font-bold text-primary focus:outline-none focus:border-accent transition-colors"
                                        placeholder="Payment enquiry, account issue, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="contact-message" className="text-xs font-black uppercase tracking-widest text-warm-400">
                                        Message
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full p-4 rounded-2xl border-2 border-secondary/20 bg-secondary/5 font-bold text-primary focus:outline-none focus:border-accent transition-colors resize-none"
                                        placeholder="Describe your question or concern..."
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-primary text-base-100 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl hover:bg-secondary transition-all flex items-center gap-3"
                                >
                                    <Send size={18} />
                                    Send Message
                                </button>
                            </form>
                        )}
                    </section>

                    {/* Founder Footnote */}
                    <div className="pt-12 border-t-2 border-secondary/10 text-center space-y-2">
                        <p className="text-secondary font-medium text-sm">
                            Independently built by{' '}
                            <a
                                href="https://shahidster.tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary font-black hover:text-accent transition-colors"
                            >
                                Shahid Moosa
                            </a>
                            {' '}· Sole Proprietor
                        </p>
                        <p className="text-secondary/60 font-medium text-xs">
                            Andaman & Nicobar Islands, India
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
