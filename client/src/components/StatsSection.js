import React from 'react';

const stats = [
  {
    value: '5,000+',
    label: 'Happy Customers',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
        <circle cx="9" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 19c.7-3.2 3.5-5.2 6.5-5.2s5.8 2 6.5 5.2" />
        <circle cx="17" cy="9" r="2.7" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.2 14.4c2.6 0 5.1 1.4 6.3 4" />
      </svg>
    ),
  },
  {
    value: '500+',
    label: 'Products In Stock',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8.5 4.5v9L12 21 3.5 16.5v-9L12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7.5L12 12l8.5-4.5M12 12v9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 5.2l8.5 4.6" />
      </svg>
    ),
  },
  {
    value: '10+ Yrs',
    label: 'In Business',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
        <circle cx="12" cy="9" r="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" />
      </svg>
    ),
  },
  {
    value: '47 Counties',
    label: 'Delivery Coverage',
    Icon: (props) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 7.5h10v9h-10zM12.5 10.5h4l3 3v3h-7z" />
        <circle cx="6.5" cy="17.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16.5" cy="17.5" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function StatsSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-14">
      <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-black shadow-2xl">
        {/* Neon glow arcs, matching the reference image */}
        <div className="pointer-events-none absolute inset-0 select-none">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] rounded-full border-2 border-brand-300/40 blur-[2px]" />
          <div className="absolute -bottom-24 -left-24 w-[520px] h-[520px] rounded-full border-2 border-brand-300/40 blur-[2px]" />
          <div className="absolute -top-40 -right-40 w-[720px] h-[720px] rounded-full border border-brand-300/15" />
          <div className="absolute -bottom-40 -left-40 w-[720px] h-[720px] rounded-full border border-brand-300/15" />
        </div>

        <div className="relative px-6 sm:px-10 py-14 md:py-16">
          <div className="text-center mb-10 md:mb-12">
            <span className="badge bg-brand-500/20 text-brand-100 border border-brand-400/30">
              Trusted by farmers across Kenya
            </span>
            <h2 className="mt-3 text-2xl md:text-3xl font-extrabold text-white">
              Our track record speaks for itself
            </h2>
            <p className="mt-2 text-sm md:text-base text-brand-100/80 max-w-2xl mx-auto">
              A decade of raising healthy livestock and delivering to farmers,
              agri-businesses and households across every county in Kenya.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map(({ value, label, Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center px-2"
              >
                <Icon className="w-10 h-10 md:w-11 md:h-11 text-brand-300 mb-3 drop-shadow-[0_0_8px_rgba(99,178,92,0.35)]" />
                <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  {value}
                </div>
                <div className="mt-1 text-xs md:text-sm text-brand-100/90">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
