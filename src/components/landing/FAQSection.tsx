import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useTranslation } from '../../i18n';

export const FAQSection: React.FC = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#090a0f] border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-purple-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            {t('faq.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {t('faq.title')}
          </h2>
          <p className="mt-4 text-slate-400 text-base">
            {t('faq.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          {faqIndices.map((idx) => {
            const isOpen = openIndex === idx;
            const q = t(`faq.items.${idx}.q`);
            const a = t(`faq.items.${idx}.a`);

            return (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-slate-900/40 overflow-hidden transition-all duration-200"
              >
                <button
                  id={`faq-accordion-${idx}`}
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-white hover:text-purple-300 font-semibold text-base transition-colors"
                >
                  <span>{q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${
                      isOpen ? 'rotate-180 text-purple-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4 animate-in fade-in duration-200">
                    {a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
