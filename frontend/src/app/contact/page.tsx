'use client';

import React, { useState } from 'react';
import { SITE, formattedAddress } from '@/lib/site';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'Assistant, sans-serif', color: '#1c2417' }}>
      <h1 style={{ fontFamily: 'Goli, sans-serif', fontSize: '32px', fontWeight: 800, color: '#1D1D1D', marginBottom: '10px', textAlign: 'center' }}>
        Contact Us
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '36px', fontSize: '15px' }}>
        Have questions about Old Spice Agro Fresh LLP products or your order? Get in touch with us!
      </p>

      {/* Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✉️</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Email Us</div>
          <a href={`mailto:${SITE.email}`} style={{ fontSize: '15px', fontWeight: 700, color: '#0f5636', textDecoration: 'none' }}>
            {SITE.email}
          </a>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📞</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Call / WhatsApp</div>
          <a href={`tel:${SITE.phone}`} style={{ fontSize: '15px', fontWeight: 700, color: '#0f5636', textDecoration: 'none' }}>
            {SITE.phone}
          </a>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📍</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Registered Office</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
            {formattedAddress()}
          </div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <span style={{ fontSize: '40px' }}>✅</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f5636', marginTop: '12px', marginBottom: '8px' }}>
              Message Received!
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              Thank you for reaching out. The Old Spice Agro Fresh LLP team will get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Your Name</label>
              <input
                type="text"
                required
                placeholder="Enter your name"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="Enter your email"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Message</label>
              <textarea
                rows={5}
                required
                placeholder="How can we help you?"
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>
            <button
              type="submit"
              style={{ background: '#0f5636', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '12px 24px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', marginTop: '10px' }}
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
